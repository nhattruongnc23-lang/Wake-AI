export class ProviderError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = "ProviderError";
  }
}

export async function* streamChatCompletion({
  config,
  messages,
  fetchImpl = fetch
}) {
  const headers = { "content-type": "application/json" };
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: true
      }),
      signal: AbortSignal.timeout(config.requestTimeoutMs)
    });
  } catch (error) {
    throw new ProviderError(
      `Cannot reach model endpoint at ${config.baseUrl}: ${error.message}`,
      { cause: error }
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ProviderError(
      `Model endpoint returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ""}`
    );
  }

  if (!response.body) {
    throw new ProviderError("The model endpoint returned an empty response body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;

        let payload;
        try {
          payload = JSON.parse(data);
        } catch {
          continue;
        }

        if (payload.error) {
          throw new ProviderError(payload.error.message || "Model generation failed.");
        }

        const token = payload.choices?.[0]?.delta?.content;
        if (typeof token === "string" && token.length) yield token;
      }

      if (done) break;
    }

    const finalLine = buffer.trim();
    if (finalLine.startsWith("data:")) {
      const data = finalLine.slice(5).trim();
      if (data && data !== "[DONE]") {
        try {
          const payload = JSON.parse(data);
          const token = payload.choices?.[0]?.delta?.content;
          if (typeof token === "string" && token.length) yield token;
        } catch {
          // Ignore an incomplete trailing SSE event.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
