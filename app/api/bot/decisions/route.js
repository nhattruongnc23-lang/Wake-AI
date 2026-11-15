import { prisma } from "../../../../src/lib/prisma.js";
import { requireBotAuth } from "../../../../src/lib/bot-auth.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const denied = requireBotAuth(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") || 25);
  const take = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 25;

  const decisions = await prisma.moderationCase.findMany({
    where: {
      status: { in: ["CONFIRMED", "DISMISSED"] },
      decisionDeliveredAt: null,
      restricted: false
    },
    take,
    orderBy: { reviewedAt: "asc" },
    select: {
      externalCaseId: true,
      guildId: true,
      channelId: true,
      messageId: true,
      authorId: true,
      status: true,
      category: true,
      severity: true,
      reviewedAt: true,
      reviewNote: true
    }
  });

  return Response.json({ decisions }, { headers: { "cache-control": "no-store" } });
}
