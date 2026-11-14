const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalEndpoint(baseUrl) {
  try {
    return LOCAL_HOSTS.has(new URL(baseUrl).hostname);
  } catch {
    return true;
  }
}

export async function inspectModelProvider({
  config,
  env = process.env,
  fetchImpl = fetch,
  timeoutMs = 5000
}) {
  if (!config.baseUrl || !config.model) {
    return { status: "not_configured", reachable: false, model: null };
  }

  if (env.VERCEL === "1" && isLocalEndpoint(config.baseUrl)) {
    return { status: "not_configured", reachable: false, model: config.model };
  }

  const headers = {};
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

  try {
    const response = await fetchImpl(`${config.baseUrl}/models`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      return {
        status: "provider_error",
        reachable: true,
        model: config.model,
        upstreamStatus: response.status
      };
    }

    let modelListed = null;
    try {
      const payload = await response.json();
      if (Array.isArray(payload.data)) {
        modelListed = payload.data.some(item => item?.id === config.model);
      }
    } catch {
      // Some compatible providers return a non-standard models response.
    }

    return {
      status: "ready",
      reachable: true,
      model: config.model,
      modelListed
    };
  } catch {
    return { status: "unreachable", reachable: false, model: config.model };
  }
}
