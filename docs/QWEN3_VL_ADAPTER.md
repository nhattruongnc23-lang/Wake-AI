# Qwen3-VL-8B-Instruct adapter

## Verified model/runtime references

- Exact checkpoint: `Qwen/Qwen3-VL-8B-Instruct`.
- Hugging Face model card metadata declares `apache-2.0`.
- Official Qwen3-VL README states Transformers `>=4.57.0` is required and demonstrates the Transformers processor/model generation flow.
- The adapter uses the official `Qwen3VLForConditionalGeneration` and `AutoProcessor` APIs. PyTorch must be installed using a build appropriate for the worker host; it is intentionally not pinned in the core worker requirements.

References:
- https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct
- https://github.com/QwenLM/Qwen3-VL

Recheck the exact revision's license metadata and dependencies before distributing model weights or a derivative.

## Adapter contract

`Qwen3VLBackend` implements `VisionBackend.analyze(image_bytes, mime_type) -> VisualResult`. The backend is injected through the existing abstract contract; model imports and weight loading are lazy. Local-only loading is the default, so this code does not fetch weights.

## Deliberate limitation

The adapter is a visual-style classifier only. Even valid model output leaves Wake's safety fields as:
- `safetyGate=UNCERTAIN`
- `category=UNKNOWN`
- `severity=UNKNOWN`

Wake's existing fail-closed policy consequently keeps the result restricted. The model is not trusted to determine whether an image is safe, sexual, violent, graphic, or whether a depicted person's age is known. A separate, policy-reviewed classifier and test programme would be required before any future safety-gate integration.

Malformed output, invalid inputs, timeout, model-loading failures, and inference errors return UNKNOWN/RESTRICTED. Transformers' `max_time` is a best-effort generation budget, not a hard process-kill deadline; a stuck native kernel still requires an external worker/process supervisor to enforce a hard wall-clock limit. The adapter does not persist or log image bytes, retrieve URLs, expose media, or provide an HTTP upload route.

## Resource preflight

Run `python inference-worker/benchmark/runtime_preflight.py` before provisioning weights. The check is offline-only and reports installed packages, RAM, free disk, CUDA/VRAM, and whether checkpoint files are already cached. The current Hugging Face repository listing is about 17.5 GB; the preflight uses 25 GiB free disk as a buffer target. Its 32 GiB RAM and 24 GiB single-GPU VRAM targets are planning guidance, not guarantees. No model weights have been downloaded as part of this work.
