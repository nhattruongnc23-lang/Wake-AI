import { auth } from "../../../auth.js";
import { prisma } from "../../../src/lib/prisma.js";
import { requireRole } from "../../../src/lib/permissions.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthenticated" }, { status: 401 });
  const denied = requireRole(session.user, "OWNER");
  if (denied) return denied;

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") || 50);
  const take = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;

  const events = await prisma.auditLog.findMany({
    take,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, actorId: true, action: true, targetType: true,
      targetId: true, metadata: true, createdAt: true
    }
  });
  return Response.json({ events }, { headers: { "cache-control": "no-store" } });
}
