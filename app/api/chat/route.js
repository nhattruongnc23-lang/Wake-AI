import { getConfig } from "../../../src/config.js";
import { streamChatCompletion } from "../../../src/providers/openai-compatible.js";
import { authConfigured, clientKey, consumeRateLimit, hasValidSession, isSameOrigin } from "../../../src/web/auth.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 16_000;
const MAX_BODY_BYTES = 400_000;

export async function POST(request) {
  if (!authConfigured()) return Response.json({ error: "Máy chủ chưa cấu hình xác thực." }, { status: 503 });
  if (!hasValidSession(request)) return Response.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!isSameOrigin(request)) return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  if (!consumeRateLimit(`chat:${clientKey(request)}`, 12, 60 * 1000)) {
    return Response.json({ error: "Bạn gửi yêu cầu quá nhanh. Hãy chờ một phút rồi thử lại." }, { status: 429 });
  }

  let payload;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return Response.json({ error: "Nội dung gửi lên quá lớn." }, { status: 413 });
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0 || payload.messages.length > MAX_MESSAGES) {
    return Response.json({ error: `Tin nhắn phải là mảng từ 1 đến ${MAX_MESSAGES} phần tử.` }, { status: 400 });
  }

  const messages = [];
  for (const item of payload.messages) {
    if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ error: "Một tin nhắn không hợp lệ hoặc vượt giới hạn." }, { status: 400 });
    }
    messages.push({ role: item.role, content: item.content });
  }

  const config = getConfig();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of streamChatCompletion({
          config,
          messages: [{ role: "system", content: config.systemPrompt }, ...messages]
        })) controller.enqueue(encoder.encode(token));
        controller.close();
      } catch {
        // Never forward provider URLs, upstream response bodies, or secrets to the browser.
        controller.error(new Error("Không thể kết nối mô hình AI. Hãy kiểm tra cấu hình máy chủ."));
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-content-type-options": "nosniff"
    }
  });
}
