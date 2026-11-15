import { timingSafeEqual } from "node:crypto";
import { prisma } from "../../../../../src/lib/prisma.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request) {
  const expected = process.env.KORO_API_SECRET || "";
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return expected.length >= 32 && supplied.length === expected.length &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function POST(request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let payload;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 4096) return Response.json({ error: "Payload too large" }, { status: 413 });
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload?.event !== "MESSAGE_DELETED" ||
      typeof payload.caseId !== "string" ||
      !/^\d{6,25}:\d{6,25}$/.test(payload.caseId)) {
    return Response.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const existing = await prisma.moderationCase.findUnique({
    where: { externalCaseId: payload.caseId },
    select: { id: true, messageDeleted: true }
  });
  if (!existing) return Response.json({ accepted: true, recorded: false }, { status: 202 });

  if (!existing.messageDeleted) {
    await prisma.$transaction([
      prisma.moderationCase.update({
        where: { id: existing.id },
        data: { messageDeleted: true }
      }),
      prisma.auditLog.create({
        data: {
          action: "case.source_message_deleted",
          targetType: "moderation_case",
          targetId: existing.id,
          metadata: { source: "koro" }
        }
      })
    ]);
  }
  return Response.json({ accepted: true, recorded: true }, { headers: { "cache-control": "no-store" } });
}
