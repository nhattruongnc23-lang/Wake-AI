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

Malformed output, invalid inputs, timeout, model-loading failures, and inference errors return UNKNOWN/RESTRICTED. The adapter does not persist or log image bytes, retrieve URLs, expose media, or provide an HTTP upload route.
