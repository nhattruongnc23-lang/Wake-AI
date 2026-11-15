import { auth } from "../../../../../auth.js";
import { prisma } from "../../../../../src/lib/prisma.js";
import { requireRole } from "../../../../../src/lib/permissions.js";
import { writeAudit } from "../../../../../src/lib/audit.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthenticated" }, { status: 401 });
  const denied = requireRole(session.user, "ADMIN");
  if (denied) return denied;

  const { id } = await context.params;
  let body;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 8 * 1024) return Response.json({ error: "Payload too large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || !["CONFIRMED", "DISMISSED"].includes(body.decision)) {
    return Response.json({ error: "decision must be CONFIRMED or DISMISSED" }, { status: 400 });
  }
  if (body.note != null && (typeof body.note !== "string" || body.note.length > 1000)) {
    return Response.json({ error: "note must be at most 1000 characters" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async tx => {
      const current = await tx.moderationCase.findUnique({ where: { id } });
      if (!current) return { response: Response.json({ error: "Case not found" }, { status: 404 }) };
      if (current.restricted || current.status === "RESTRICTED") {
        return { response: Response.json({ error: "Restricted cases cannot be reviewed through this endpoint" }, { status: 403 }) };
      }
      if (!["PENDING", "UNCLASSIFIED"].includes(current.status)) {
        return { response: Response.json({ error: "Case has already been reviewed" }, { status: 409 }) };
      }

      const updated = await tx.moderationCase.update({
        where: { id },
        data: {
          status: body.decision,
          reviewerId: session.user.id,
          reviewedAt: new Date(),
          reviewNote: body.note?.trim() || null
        },
        select: { id: true, status: true, reviewerId: true, reviewedAt: true, reviewNote: true }
      });
      await writeAudit(tx, {
        actorId: session.user.id,
        action: "CASE_REVIEWED",
        targetType: "ModerationCase",
        targetId: id,
        metadata: { decision: body.decision }
      });
      return { updated };
    });

    if (result.response) return result.response;
    return Response.json({ case: result.updated }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Case review failed", error);
    return Response.json({ error: "Unable to review case" }, { status: 500 });
  }
}
