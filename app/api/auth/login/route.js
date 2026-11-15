import { authConfigured, clientKey, consumeRateLimit, createSessionCookie, isSameOrigin, verifyAccessPassword } from "../../../../src/web/auth.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!authConfigured()) return Response.json({ error: "Máy chủ chưa cấu hình xác thực." }, { status: 503 });
  if (!isSameOrigin(request)) return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  if (!consumeRateLimit(`login:${clientKey(request)}`, 8, 10 * 60 * 1000)) {
    return Response.json({ error: "Bạn đã thử quá nhiều lần. Hãy chờ rồi thử lại." }, { status: 429 });
  }

  let payload;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 4096) return Response.json({ error: "Dữ liệu quá lớn." }, { status: 413 });
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Dữ liệu đăng nhập không hợp lệ." }, { status: 400 });
  }

  if (!verifyAccessPassword(payload?.password)) {
    return Response.json({ error: "Mật khẩu không chính xác." }, { status: 401 });
  }

  return new Response(JSON.stringify({ authenticated: true }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": createSessionCookie() }
  });
}
