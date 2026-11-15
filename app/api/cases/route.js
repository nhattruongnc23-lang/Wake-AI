import { auth } from "../../../auth.js";
import { prisma } from "../../../src/lib/prisma.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const take = Math.min(Math.max(Number(url.searchParams.get("limit") || 25), 1), 50);
  const where = status && ["UNCLASSIFIED", "PENDING", "CONFIRMED", "DISMISSED", "RESTRICTED"].includes(status)
    ? { status }
    : {};

  const cases = await prisma.moderationCase.findMany({
    where,
    take,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, guildId: true, channelId: true, messageId: true,
      authorId: true, authorTag: true, occurredAt: true, mediaType: true, attachmentCount: true,
      category: true, severity: true, confidence: true, status: true,
      restricted: true, messageDeleted: true, createdAt: true
    }
  });

  return Response.json({ cases }, { headers: { "cache-control": "no-store" } });
}
