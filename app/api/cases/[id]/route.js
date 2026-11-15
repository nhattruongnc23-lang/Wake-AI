import { auth } from "../../../../auth.js";
import { prisma } from "../../../../src/lib/prisma.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await context.params;
  const item = await prisma.moderationCase.findUnique({
    where: { id },
    select: {
      id: true, externalCaseId: true, guildId: true, channelId: true,
      messageId: true, authorId: true, authorTag: true, occurredAt: true,
      mediaType: true, attachmentCount: true, category: true, severity: true,
      confidence: true, status: true, restricted: true, classifier: true,
      classifierVersion: true, safeSummary: true, messageDeleted: true,
      reviewedAt: true, reviewerId: true, reviewNote: true, createdAt: true
    }
  });
  if (!item) return Response.json({ error: "Case not found" }, { status: 404 });

  return Response.json({ case: item }, { headers: { "cache-control": "no-store" } });
}
