import { prisma } from "../../../../src/lib/prisma.js";
import { requireBotAuth, readJsonBody, containsForbiddenMedia, validDiscordId } from "../../../../src/lib/bot-auth.js";
import { writeAudit } from "../../../../src/lib/audit.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories = new Set(["SEXUAL_CONTENT", "VIOLENCE", "GORE", "OTHER", "UNKNOWN"]);
const severities = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"]);
const caseStatuses = new Set(["UNCLASSIFIED", "PENDING", "RESTRICTED"]);

export async function POST(request) {
  const denied = requireBotAuth(request);
  if (denied) return denied;

  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Expected a JSON object" }, { status: 400 });
  }
  if (containsForbiddenMedia(body)) {
    return Response.json({ error: "Media bytes and media URLs are not accepted" }, { status: 400 });
  }

  const requiredIds = ["guildId", "channelId", "messageId", "authorId"];
  if (requiredIds.some(key => !validDiscordId(body[key]))) {
    return Response.json({ error: "Invalid Discord identifier" }, { status: 400 });
  }
  if (typeof body.externalCaseId !== "string" || body.externalCaseId.length < 1 || body.externalCaseId.length > 100) {
    return Response.json({ error: "externalCaseId is required (1-100 characters)" }, { status: 400 });
  }
  if (typeof body.mediaType !== "string" || !/^[A-Z_]{2,32}$/.test(body.mediaType)) {
    return Response.json({ error: "Invalid mediaType" }, { status: 400 });
  }
  if (body.authorTag != null && (typeof body.authorTag !== "string" || body.authorTag.length > 100)) {
    return Response.json({ error: "Invalid authorTag" }, { status: 400 });
  }
  if (body.safeSummary != null && (typeof body.safeSummary !== "string" || body.safeSummary.length > 500)) {
    return Response.json({ error: "Invalid safeSummary" }, { status: 400 });
  }
  if (body.category != null && !categories.has(body.category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  if (body.severity != null && !severities.has(body.severity)) {
    return Response.json({ error: "Invalid severity" }, { status: 400 });
  }
  if (body.status != null && !caseStatuses.has(body.status)) {
    return Response.json({ error: "Invalid initial status" }, { status: 400 });
  }
  if (body.confidence != null && (typeof body.confidence !== "number" || !Number.isFinite(body.confidence) || body.confidence < 0 || body.confidence > 1)) {
    return Response.json({ error: "confidence must be between 0 and 1" }, { status: 400 });
  }
  if (body.attachmentCount != null && (!Number.isInteger(body.attachmentCount) || body.attachmentCount < 1 || body.attachmentCount > 20)) {
    return Response.json({ error: "attachmentCount must be between 1 and 20" }, { status: 400 });
  }

  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return Response.json({ error: "Invalid occurredAt" }, { status: 400 });
  }

  const restricted = body.restricted === true || body.status === "RESTRICTED";
  const status = restricted ? "RESTRICTED" : (body.status || "PENDING");

  try {
    const existing = await prisma.moderationCase.findUnique({
      where: { externalCaseId: body.externalCaseId },
      select: { id: true, externalCaseId: true, status: true }
    });
    if (existing) {
      return Response.json({ case: existing, duplicate: true }, { status: 200 });
    }

    const created = await prisma.$transaction(async tx => {
      const item = await tx.moderationCase.create({
        data: {
          externalCaseId: body.externalCaseId,
          guildId: body.guildId,
          channelId: body.channelId,
          messageId: body.messageId,
          authorId: body.authorId,
          authorTag: body.authorTag || null,
          occurredAt,
          mediaType: body.mediaType,
          attachmentCount: body.attachmentCount || 1,
          category: body.category || "UNKNOWN",
          severity: restricted ? "UNKNOWN" : (body.severity || "UNKNOWN"),
          confidence: restricted ? null : (body.confidence ?? null),
          status,
          restricted,
          classifier: restricted ? null : (typeof body.classifier === "string" ? body.classifier.slice(0, 80) : null),
          classifierVersion: restricted ? null : (typeof body.classifierVersion === "string" ? body.classifierVersion.slice(0, 80) : null),
          safeSummary: restricted ? null : (body.safeSummary || null)
        },
        select: { id: true, externalCaseId: true, status: true, createdAt: true }
      });
      await writeAudit(tx, {
        action: "BOT_CASE_INGESTED",
        targetType: "ModerationCase",
        targetId: item.id,
        metadata: { guildId: body.guildId, restricted }
      });
      return item;
    });

    return Response.json({ case: created, duplicate: false }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error?.code === "P2002") {
      const existing = await prisma.moderationCase.findUnique({
        where: { externalCaseId: body.externalCaseId },
        select: { id: true, externalCaseId: true, status: true }
      });
      if (existing) return Response.json({ case: existing, duplicate: true });
    }
    console.error("Sylen case ingestion failed", error);
    return Response.json({ error: "Unable to ingest case" }, { status: 500 });
  }
}
