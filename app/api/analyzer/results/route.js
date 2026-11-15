import { timingSafeEqual } from "node:crypto";
import { prisma } from "../../../../src/lib/prisma.js";
import { normalizeVisualResult } from "../../../../src/lib/visual-intelligence.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSecret(request) {
  const expected = process.env.WAKE_ANALYZER_SECRET || "";
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (expected.length < 32 || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function POST(request) {
  if (!validSecret(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 8_192) return Response.json({ error: "Payload too large" }, { status: 413 });
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof payload?.caseId !== "string" || payload.caseId.length > 100) {
    return Response.json({ error: "Invalid caseId" }, { status: 400 });
  }

  const normalized = normalizeVisualResult(payload.result);
  if (!normalized.ok) return Response.json({ error: normalized.error }, { status: 400 });
  const result = normalized.result;

  const existing = await prisma.moderationCase.findUnique({
    where: { externalCaseId: payload.caseId },
    select: { id: true, status: true, restricted: true }
  });
  if (!existing) return Response.json({ error: "Case not found" }, { status: 404 });

  const terminal = ["CONFIRMED", "DISMISSED"].includes(existing.status);
  const restricted = result.restricted || existing.restricted;
  const status = restricted
    ? "RESTRICTED"
    : terminal
      ? existing.status
      : result.status;

  const updated = await prisma.moderationCase.update({
    where: { id: existing.id },
    data: {
      category: result.category,
      severity: result.severity,
      confidence: result.confidence,
      restricted,
      status,
      classifier: "wake-visual-intelligence",
      classifierVersion: "0.1.0",
      safeSummary: JSON.stringify({
        visualStyle: result.style,
        safetyGate: result.safetyGate,
        signals: result.signals
      }).slice(0, 500),
      ...(terminal && !restricted ? {} : { reviewerId: null, reviewedAt: null, reviewNote: null })
    },
    select: { id: true, status: true, restricted: true, category: true, severity: true, confidence: true }
  });

  await prisma.auditLog.create({
    data: {
      action: "case.classified",
      targetType: "moderation_case",
      targetId: existing.id,
      metadata: {
        classifier: "wake-visual-intelligence",
        style: result.style,
        safetyGate: result.safetyGate,
        category: result.category,
        severity: result.severity,
        restricted
      }
    }
  });

  return Response.json({ case: updated }, {
    status: 200,
    headers: { "cache-control": "no-store" }
  });
}
