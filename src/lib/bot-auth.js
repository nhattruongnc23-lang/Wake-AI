import { timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 64 * 1024;

export function requireBotAuth(request) {
  const expected = process.env.KORO_API_SECRET || "";
  const supplied = request.headers.get("authorization") || "";
  const match = supplied.match(/^Bearer (.+)$/i);
  const actual = match?.[1] || "";

  if (!expected || !actual) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function readJsonBody(request, maxBytes = MAX_BODY_BYTES) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    return { error: Response.json({ error: "Payload too large" }, { status: 413 }) };
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return { error: Response.json({ error: "Payload too large" }, { status: 413 }) };
  }

  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { error: Response.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}

const forbiddenKey = /(?:image|mediaurl|attachmenturl|cdnurl|fileurl|base64|binary|buffer|rawmedia|previewurl|signedurl)/i;

export function containsForbiddenMedia(value) {
  if (!value || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKey.test(key)) return true;
    if (child && typeof child === "object" && containsForbiddenMedia(child)) return true;
  }
  return false;
}

export function validDiscordId(value) {
  return typeof value === "string" && /^\d{15,22}$/.test(value);
}
