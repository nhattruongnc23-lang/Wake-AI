import { timingSafeEqual } from "node:crypto";
import { prisma } from "../../../../src/lib/prisma.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request) {
  const expected = process.env.KORO_API_SECRET || "";
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\\s+/i, "");
  return expected.length >= 32 && supplied.length === expected.length &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

// Koro polls this endpoint. Only human-reviewed outcomes are released.
export async function GET(request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 50);
  const guildId = url.searchParams.get("guildId");
  if (guildId && !/^\\d{6,25}$/.test(guildId)) return Response.json({ error: "Invalid guild ID" }, { status: 400 });
  const cases = await prisma.moderationCase.findMany({
    where: {
      ...(guildId ? { guildId } : {}),
      status: { in: ["CONFIRMED", "DISMISSED"] },
      decisionDeliveredAt: null,
      restricted: false,
      externalCaseId: { not: null }
    },
    take: limit,
    orderBy: [{ reviewedAt: "asc" }, { createdAt: "asc" }],
    select: {
      externalCaseId: true, guildId: true, channelId: true, messageId: true,
      authorId: true, authorTag: true, occurredAt: true, category: true,
      severity: true, status: true, reviewedAt: true, reviewerId: true,
      messageDeleted: true
    }
  });
  return Response.json({ decisions: cases }, { headers: { "cache-control": "no-store" } });
}
