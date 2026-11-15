import { prisma } from "../../../../../src/lib/prisma.js";
import { requireBotAuth, readJsonBody } from "../../../../../src/lib/bot-auth.js";
import { writeAudit } from "../../../../../src/lib/audit.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const denied = requireBotAuth(request);
  if (denied) return denied;

  const parsed = await readJsonBody(request, 16 * 1024);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  if (!body || typeof body !== "object" || Array.isArray(body) ||
      typeof body.externalCaseId !== "string" || body.externalCaseId.length > 100) {
    return Response.json({ error: "Invalid event payload" }, { status: 400 });
  }
  if (!["MESSAGE_DELETED", "DECISION_DELIVERED"].includes(body.eventType)) {
    return Response.json({ error: "Unsupported eventType" }, { status: 400 });
  }

  const item = await prisma.moderationCase.findUnique({
    where: { externalCaseId: body.externalCaseId },
    select: { id: true, messageDeleted: true, decisionDeliveredAt: true, status: true }
  });
  if (!item) return Response.json({ error: "Case not found" }, { status: 404 });

  try {
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.moderationCase.update({
        where: { id: item.id },
        data: body.eventType === "MESSAGE_DELETED"
          ? { messageDeleted: true }
          : (["CONFIRMED", "DISMISSED"].includes(item.status) && !item.decisionDeliveredAt
              ? { decisionDeliveredAt: new Date() }
              : {}),
        select: { id: true, messageDeleted: true, decisionDeliveredAt: true, status: true }
      });
      await writeAudit(tx, {
        action: body.eventType,
        targetType: "ModerationCase",
        targetId: item.id
      });
      return result;
    });
    return Response.json({ case: updated }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Koro case event failed", error);
    return Response.json({ error: "Unable to process event" }, { status: 500 });
  }
}
