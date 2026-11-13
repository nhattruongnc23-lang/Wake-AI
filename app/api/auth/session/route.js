import { authConfigured, hasValidSession } from "../../../../src/web/auth.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!authConfigured()) return Response.json({ authenticated: false, configured: false }, { status: 503, headers: { "cache-control": "no-store" } });
  return Response.json({ authenticated: hasValidSession(request), configured: true }, { headers: { "cache-control": "no-store" } });
}
