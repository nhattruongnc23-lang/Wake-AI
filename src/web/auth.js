import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "wake_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  return process.env.WAKE_SESSION_SECRET || "";
}

function signature(value) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authConfigured() {
  return Boolean(process.env.WAKE_ACCESS_PASSWORD && secret().length >= 32);
}

export function verifyAccessPassword(candidate) {
  const expected = process.env.WAKE_ACCESS_PASSWORD || "";
  return typeof candidate === "string" && expected.length > 0 && safeEqual(candidate, expected);
}

export function createSessionCookie() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const value = String(expires);
  const token = `${value}.${signature(value)}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function hasValidSession(request) {
  if (!authConfigured()) return false;
  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!token) return false;
  const [expires, supplied, extra] = token.split(".");
  if (!expires || !supplied || extra || !/^\d+$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(signature(expires), supplied);
}

export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

const attempts = new Map();
export function consumeRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  if (attempts.size > 5000) {
    for (const [entry, value] of attempts) if (value.resetAt <= now) attempts.delete(entry);
  }
  return true;
}

export function clientKey(request) {
  return request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
