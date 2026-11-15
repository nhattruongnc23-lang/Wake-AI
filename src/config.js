import { readFile } from "node:fs/promises";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const separator = trimmed.indexOf("=");
  if (separator < 1) return null;

  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/\s+#.*$/, "").trim();
  }

  return [key, value];
}

export async function loadEnvFile(path = ".env") {
  let source;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const line of source.split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) continue;
    const [key, value] = entry;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function getConfig(env = process.env) {
  return {
    baseUrl: (env.WAKE_BASE_URL || "http://127.0.0.1:8080/v1").replace(/\/+$/, ""),
    model: env.WAKE_MODEL || "local-model",
    apiKey: env.WAKE_API_KEY || "",
    systemPrompt:
      env.WAKE_SYSTEM_PROMPT ||
      "You are Wake, a practical AI coding assistant. Explain changes clearly, prefer safe and testable solutions, and never claim to have run code or changed files unless you actually did.",
    requestTimeoutMs: Number(env.WAKE_REQUEST_TIMEOUT_MS || 120_000)
  };
}
