# Wake Inference Worker

The worker contains a model adapter foundation, benchmark tooling, and an offline runtime preflight. It is not a deployed classifier and has no public image-ingestion endpoint.

## Qwen3-VL adapter

- Backend: inference-worker/app/qwen_backend.py
- Exact checkpoint: Qwen/Qwen3-VL-8B-Instruct
- Reviewed revision: a115a837cf3cbba4b697aa74b609721b5009ed41 (Apache-2.0 model-card metadata).
- Runtime: Transformers 4.57.0 or newer, PyTorch 2.6+ baseline, Accelerate, Pillow. Install a PyTorch build matching the host CPU/CUDA setup.
- Optional dependencies are isolated in requirements-qwen.txt; they are not part of the lightweight worker requirements.
- Model and processor load lazily on the first call.
- Local-only model loading is the default. Missing weights cause a fail-closed result; tests and CI never download weights.
- Configure WAKE_QWEN_MODEL_ID, WAKE_QWEN_REVISION, WAKE_QWEN_DEVICE_MAP, and WAKE_QWEN_LOCAL_FILES_ONLY as needed.

## Safety boundary

This adapter classifies visual style only. It never returns a CLEAR safety gate: valid style output remains UNCERTAIN and is converted to RESTRICTED by the existing fail-closed contract. Category and severity remain UNKNOWN. Invalid image input, malformed output, timeout, missing runtime, or inference errors return UNKNOWN/RESTRICTED.

Image bytes are processed in memory only. The adapter enforces an 8 MiB compressed-size limit, checks the actual image format against its MIME type, and rejects images above 16 megapixels. It does not persist or log images, fetch image URLs, expose previews, or start an HTTP endpoint. Use safe-only test fixtures.

## Offline hardware preflight

Run python inference-worker/benchmark/runtime_preflight.py before provisioning model weights. It checks optional package presence, system RAM, free disk, CUDA/VRAM, and whether model weights are already cached. It makes no network requests and never downloads weights. Planning targets are advisory: 32 GiB RAM, 24 GiB single-GPU VRAM, and 25 GiB free disk; actual performance must be measured on the intended host.

## Tests

From repository root:

    python -m pip install -r inference-worker/requirements.txt Pillow
    python -m unittest discover -s inference-worker/benchmark -p "test_*.py" -v
    PYTHONPATH=inference-worker python -m unittest discover -s inference-worker/tests -p "test_*.py" -v
    python -m compileall -q inference-worker/app inference-worker/benchmark inference-worker/tests

Real model weights are not downloaded by tests.
