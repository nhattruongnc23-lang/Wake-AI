import { auth } from "../../../../../auth.js";
import { prisma } from "../../../../../src/lib/prisma.js";
import { requireRole } from "../../../../../src/lib/permissions.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthenticated" }, { status: 401 });
  const denied = requireRole(session.user, "ADMIN");
  if (denied) return denied;

  let payload;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 4096) return Response.json({ error: "Payload too large" }, { status: 413 });
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!["CONFIRMED", "DISMISSED"].includes(payload?.decision)) {
    return Response.json({ error: "Decision must be CONFIRMED or DISMISSED" }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.moderationCase.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Case not found" }, { status: 404 });
  if (existing.restricted || existing.status === "RESTRICTED") {
    return Response.json({ error: "This case is restricted and cannot be reviewed in the standard queue." }, { status: 403 });
  }
  if (existing.category === "UNKNOWN" || existing.status !== "PENDING") {
    return Response.json({ error: "This case has already been reviewed." }, { status: 409 });
  }

  const reviewedAt = new Date();
  const updated = await prisma.$transaction(async tx => {
    const result = await tx.moderationCase.update({
      where: { id },
      data: {
        status: payload.decision,
        reviewerId: session.user.id,
        reviewedAt,
        reviewNote: typeof payload.note === "string" ? payload.note.slice(0, 1000) : null
      },
      select: { id: true, status: true, reviewerId: true, reviewedAt: true }
    });
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: payload.decision === "CONFIRMED" ? "case.confirmed" : "case.dismissed",
        targetType: "moderation_case",
        targetId: id,
        metadata: { noteProvided: Boolean(payload.note) }
      }
    });
    return result;
  });

  return Response.json({ case: updated }, { headers: { "cache-control": "no-store" } });
}
