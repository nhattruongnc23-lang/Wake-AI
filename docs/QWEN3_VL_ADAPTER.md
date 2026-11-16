# Qwen3-VL-8B-Instruct adapter

## Verified checkpoint and runtime

- Exact checkpoint: \`Qwen/Qwen3-VL-8B-Instruct\`.
- Reviewed Hugging Face revision: \`a115a837cf3cbba4b697aa74b609721b5009ed41\`.
- The model-card metadata for that checkpoint revision declares \`apache-2.0\`.
- The official Qwen3-VL README requires Transformers \`>=4.57.0\` and documents \`Qwen3VLForConditionalGeneration\` with \`AutoProcessor\`.
- The optional runtime manifest keeps Transformers below 6.x and uses PyTorch 2.6+; install a PyTorch wheel matching the target host's CPU/CUDA build. These are project compatibility bounds, not a claim that upstream specifies an exact PyTorch minimum.

References:
- https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct/tree/a115a837cf3cbba4b697aa74b609721b5009ed41
- https://github.com/QwenLM/Qwen3-VL

Recheck the exact revision's license metadata and preserve the Apache-2.0 license and attribution notices before redistributing weights or derivatives.

## Adapter contract

\`Qwen3VLBackend\` implements \`VisionBackend.analyze(image_bytes, mime_type) -> VisualResult\`. Model imports and weight loading are lazy. The default model revision is pinned to the reviewed checkpoint; \`WAKE_QWEN_MODEL_ID\`, \`WAKE_QWEN_REVISION\`, and \`WAKE_QWEN_DEVICE_MAP\` allow controlled overrides.

Local-only loading is the default (\`WAKE_QWEN_LOCAL_FILES_ONLY=true\`). The adapter will not fetch model weights when they are absent from the local cache. No weights were downloaded while building or testing this adapter.

Optional runtime dependencies are isolated in \`inference-worker/requirements-qwen.txt\`. The lightweight worker requirements do not install PyTorch or Transformers.

## Safety boundary

This adapter classifies visual style only. Even valid model output leaves Wake's safety fields non-clear:
- \`safetyGate=UNCERTAIN\` internally, then \`RESTRICTED\` through the existing fail-closed contract
- \`category=UNKNOWN\`
- \`severity=UNKNOWN\`

It therefore cannot clear a moderation case. The model is not trusted to determine whether an image is safe, sexual, violent, graphic, or whether a depicted person's age is known. A separate, policy-reviewed safety classifier and test programme would be required before any future safety-gate integration.

Malformed output, invalid image input, unsupported MIME, timeout, model-loading failures, and inference errors return UNKNOWN/RESTRICTED. Transformers' \`max_time\` is a best-effort generation budget, not a hard process-kill deadline; a stuck native kernel still requires an external worker/process supervisor to enforce a hard wall-clock limit.

Image bytes are processed in memory only. The adapter enforces an 8 MiB compressed-size limit, verifies actual image format against MIME, and rejects images above 16 megapixels. It does not persist or log image bytes, retrieve image URLs, expose media, or provide an HTTP upload route.

## Tests and preflight

Tests use only a generated 2×2 white PNG fixture and mocked model/processor outputs. They do not load model weights or call external services.

Run from repository root:

\`\`\`bash
python -m pip install -r inference-worker/requirements.txt Pillow
python -m unittest discover -s inference-worker/benchmark -p "test_*.py" -v
PYTHONPATH=inference-worker python -m unittest discover -s inference-worker/tests -p "test_*.py" -v
python -m compileall -q inference-worker/app inference-worker/benchmark inference-worker/tests
python inference-worker/benchmark/runtime_preflight.py
\`\`\`

The runtime preflight is offline-only. It checks optional packages, RAM, free disk, CUDA/VRAM, and whether checkpoint files are already cached. It never downloads weights.
