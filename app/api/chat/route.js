import { getConfig } from "../../../src/config.js";
import { streamChatCompletion } from "../../../src/providers/openai-compatible.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 16_000;

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
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
        })) {
          controller.enqueue(encoder.encode(token));
        }
        controller.close();
      } catch (error) {
        // Do not expose provider URLs, credentials, or raw upstream errors to browsers.
        controller.error(new Error(error instanceof Error ? error.message : "Model request failed."));
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
