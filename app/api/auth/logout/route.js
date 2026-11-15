import { clearSessionCookie, isSameOrigin } from "../../../../src/web/auth.js";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  return new Response(JSON.stringify({ authenticated: false }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": clearSessionCookie() }
  });
}
