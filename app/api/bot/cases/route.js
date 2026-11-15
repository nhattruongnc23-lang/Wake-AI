import { timingSafeEqual } from "node:crypto";
import { prisma } from "../../../../src/lib/prisma.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSecret(request) {
  const expected = process.env.KORO_API_SECRET || "";
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (expected.length < 32 || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

function isDiscordId(value) {
  return typeof value === "string" && /^\d{6,25}$/.test(value);
}

export async function POST(request) {
  if (!validSecret(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 16_384) return Response.json({ error: "Payload too large" }, { status: 413 });
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const requiredIds = ["guildId", "channelId", "messageId", "authorId"];
  if (!requiredIds.every(key => isDiscordId(payload?.[key]))) {
    return Response.json({ error: "Invalid Discord identifiers" }, { status: 400 });
  }

  const mediaType = ["IMAGE", "VIDEO", "GIF", "UNKNOWN"].includes(payload.mediaType) ? payload.mediaType : null;
  const category = ["SEXUAL_CONTENT", "VIOLENCE", "GORE", "OTHER", "UNKNOWN"].includes(payload.category) ? payload.category : null;
  const severity = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"].includes(payload.severity) ? payload.severity : null;
  const occurredAt = new Date(payload.occurredAt);
  const confidence = payload.confidence == null ? null : Number(payload.confidence);
  const externalCaseId = typeof payload.caseId === "string" && payload.caseId.length <= 100 ? payload.caseId : null;

  if (!mediaType || !category || !severity || Number.isNaN(occurredAt.getTime())) {
    return Response.json({ error: "Invalid case metadata" }, { status: 400 });
  }
  if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
    return Response.json({ error: "Invalid confidence value" }, { status: 400 });
  }

  const restricted = payload.restricted === true || category === "SEXUAL_CONTENT";
  const attachmentCount = Number(payload.attachmentCount ?? 1);
  if (!Number.isInteger(attachmentCount) || attachmentCount < 1 || attachmentCount > 10) {
    return Response.json({ error: "Invalid attachment count" }, { status: 400 });
  }
  const data = {
    guildId: payload.guildId,
    channelId: payload.channelId,
    messageId: payload.messageId,
    authorId: payload.authorId,
    authorTag: typeof payload.authorTag === "string" ? payload.authorTag.slice(0, 100) : null,
    occurredAt,
    mediaType,
    attachmentCount,
    category,
    severity,
    confidence,
    restricted,
    status: restricted ? "RESTRICTED" : category === "UNKNOWN" ? "UNCLASSIFIED" : "PENDING",
    classifier: typeof payload.classifier === "string" ? payload.classifier.slice(0, 80) : null,
    classifierVersion: typeof payload.classifierVersion === "string" ? payload.classifierVersion.slice(0, 80) : null
  };

  let record;
  if (externalCaseId) {
    const existing = await prisma.moderationCase.findUnique({ where: { externalCaseId } });
    record = existing
      ? await prisma.moderationCase.update({
          where: { externalCaseId },
          data: {
            ...data,
            status: restricted
              ? "RESTRICTED"
              : ["CONFIRMED", "DISMISSED"].includes(existing.status)
                ? existing.status
                : data.status,
            reviewerId: ["CONFIRMED", "DISMISSED"].includes(existing.status) ? existing.reviewerId : null,
            reviewedAt: ["CONFIRMED", "DISMISSED"].includes(existing.status) ? existing.reviewedAt : null,
            reviewNote: ["CONFIRMED", "DISMISSED"].includes(existing.status) ? existing.reviewNote : null
          },
          select: { id: true, status: true, restricted: true }
        })
      : await prisma.moderationCase.create({
          data: { ...data, externalCaseId },
          select: { id: true, status: true, restricted: true }
        });
  } else {
    record = await prisma.moderationCase.create({
      data,
      select: { id: true, status: true, restricted: true }
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "case.ingested",
      targetType: "moderation_case",
      targetId: record.id,
      metadata: { category, severity, mediaType, restricted }
    }
  });

  return Response.json({ case: record }, { status: 201, headers: { "cache-control": "no-store" } });
}
