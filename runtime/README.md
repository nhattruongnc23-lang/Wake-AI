# Wake Model Runtime (llama.cpp)

This directory contains the first reproducible runtime definition for serving a local GGUF model through an OpenAI-compatible API. It is separate from the Next.js/Vercel application.

## Requirements

- A Linux host with Docker Engine and the Docker Compose plugin.
- Enough available RAM (and optionally supported GPU memory) for the selected model, context and concurrent requests.
- A GGUF model file that you are permitted to use.

A 9B model is not guaranteed to run on a small or CPU-only host. Start with a model that fits the actual host memory. Do not assume free hosting includes a suitable GPU or permits always-on inference.

## Configure

From this directory:

```sh
cp .env.example .env
mkdir -p models
```

Edit `.env`:
- `WAKE_MODEL_FILE`: exact GGUF filename inside the models directory.
- `WAKE_RUNTIME_API_KEY`: a long, unique random secret. Do not reuse the website password or session secret.
- `WAKE_CTX_SIZE`, `WAKE_PARALLEL`, `WAKE_GPU_LAYERS`: tune to the host's available resources. Defaults are conservative CPU-oriented settings.

Keep the real `.env` out of Git. Do not paste secrets into chat or commit them.

## Start and verify locally

```sh
docker compose --env-file .env up -d
docker compose --env-file .env logs -f wake-model
```

Wait for the model to finish loading, then check the server health endpoint:

```sh
curl http://127.0.0.1:8080/health
curl -H "Authorization: Bearer $WAKE_RUNTIME_API_KEY" http://127.0.0.1:8080/v1/models
```

The model ID returned by `/v1/models` is the value to configure as `WAKE_MODEL` in the Wake AI application. Configure `WAKE_BASE_URL` as the externally reachable HTTPS base ending in `/v1`, and set `WAKE_API_KEY` to the same runtime API key in the Vercel server-side Environment Variables.

## Network and security

- The Compose port binds to `127.0.0.1` by default. This intentionally prevents direct public access.
- For a remote Vercel deployment, place the runtime behind a properly configured TLS reverse proxy or private network tunnel. Forward only the required API paths, preserve the Authorization header, and do not expose the raw HTTP port to the public internet.
- If the host is behind NAT or a firewall, configure access only through the secured proxy. Do not change `WAKE_BIND_ADDRESS` to `0.0.0.0` as a shortcut.
- The API key protects inference requests, but it does not encrypt traffic. Use HTTPS for traffic crossing the internet.
- Do not enable llama.cpp built-in agent tools or filesystem tools for this chat runtime.

## Stop

```sh
docker compose --env-file .env down
```

The model directory is mounted read-only in the container. Model files remain on the host when the container is removed.

## Upstream reference

The container image and server invocation follow the official llama.cpp Docker documentation:
https://github.com/ggml-org/llama.cpp/blob/master/docs/docker.md
