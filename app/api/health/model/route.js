import { getConfig } from "../../../../src/config.js";
import { inspectModelProvider } from "../../../../src/core/model-health.js";
import { authConfigured, hasValidSession, isSameOrigin } from "../../../../src/web/auth.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!authConfigured()) {
    return Response.json({ status: "auth_not_configured" }, { status: 503 });
  }
  if (!hasValidSession(request)) {
    return Response.json({ status: "unauthorized" }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return Response.json({ status: "forbidden" }, { status: 403 });
  }

  const result = await inspectModelProvider({ config: getConfig() });
  const statusCode = result.status === "ready" ? 200
    : result.status === "not_configured" ? 503
    : result.status === "unreachable" ? 503
    : 502;

  return Response.json(result, {
    status: statusCode,
    headers: { "cache-control": "no-store" }
  });
}
