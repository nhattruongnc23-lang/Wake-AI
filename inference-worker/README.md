# Wake Inference Worker

The worker currently contains a model adapter foundation and benchmark tooling. It is not a deployed classifier and has no public image-ingestion endpoint.

## Qwen3-VL adapter

- Backend: `inference-worker/app/qwen_backend.py`
- Exact checkpoint: `Qwen/Qwen3-VL-8B-Instruct`
- Runtime: Transformers >= 4.57.0, PyTorch >= 2.6.0, Accelerate, Pillow.
- Optional dependencies are isolated in `requirements-qwen.txt`; install a PyTorch build matching the host's CPU/CUDA setup separately.
- Model and processor load lazily on the first call.
- Local-only model loading is the default. The adapter does not download weights unless a separate operator explicitly changes `WAKE_QWEN_LOCAL_FILES_ONLY=false` in an approved provisioning environment.
- Configure `WAKE_QWEN_MODEL_ID`, `WAKE_QWEN_REVISION`, and `WAKE_QWEN_DEVICE_MAP` as needed.

The official model card marks the exact checkpoint Apache-2.0. Confirm the license again for any pinned revision or redistributed derivative before release.

## Safety boundary

This adapter classifies visual style only. It always returns `safetyGate=UNCERTAIN`, `category=UNKNOWN`, and `severity=UNKNOWN`, including when style classification succeeds. Therefore it cannot clear a moderation case. Invalid image input, malformed output, timeout, missing runtime, or inference errors return an UNKNOWN/RESTRICTED result.

Image bytes are processed in memory only. The adapter enforces an 8 MiB compressed-size limit, checks the actual image format against its MIME type, and rejects images above 16 megapixels. It does not persist or log images, fetch image URLs, expose previews, or start an HTTP endpoint. Use safe-only test fixtures.

## Tests

From repository root:

```bash
python -m pip install -r inference-worker/requirements.txt Pillow
python -m unittest discover -s inference-worker/tests -p "test_*.py" -v
python -m compileall -q inference-worker/app inference-worker/benchmark inference-worker/tests
```

Real model weights are not downloaded by tests.
