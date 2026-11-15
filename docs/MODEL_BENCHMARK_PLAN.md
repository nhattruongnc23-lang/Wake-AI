# Wake Vision Model Benchmark Plan

Status: proposal; no model selected and no inference integration enabled.

## Goal

Choose a free-to-download vision-language model that can serve as Wake's visual-style and general image-understanding component. This benchmark does **not** certify a model as a standalone safety moderator. Safety routing remains controlled by Wake's independent policy gate.

## Candidate models

| Candidate | Initial checkpoint | Why test it | Main concern |
|---|---|---|---|
| Qwen3-VL | Qwen3-VL-8B-Instruct | Strong general visual perception, reasoning and broad ecosystem; Apache-2.0 model card | Higher memory and inference cost than a 1B model |
| MiniCPM-V 4.7 | MiniCPM-V-4.7-1B | Small checkpoint aimed at efficient/on-device multimodal use; Apache-2.0 model card | Small model may miss subtle visual distinctions; verify runtime support |
| InternVL3.5 | InternVL3_5-8B | Strong high-resolution and general visual-understanding candidate; Apache-2.0 checkpoint listing | Runtime/setup complexity and memory footprint |

Model versions and licenses must be rechecked against the exact checkpoint card before distribution or deployment. A free checkpoint does not mean free hosted GPU capacity.

## Benchmark corpus: safe-only

Use only non-explicit, non-graphic, lawfully sourced images with known provenance and permission to use them. Do not collect, upload, store, or create explicit sexual imagery for this benchmark. Do not use images involving sexualized minors or uncertain-age sexual contexts.

Create a small, versioned corpus with labels:
- REAL_PHOTO
- ANIME_MANGA
- CARTOON_ILLUSTRATION
- AI_GENERATED
- UNKNOWN

Include benign, ordinary examples across varied lighting, resolution, image quality, skin tones, character designs, and backgrounds. Keep near-duplicate images in the same split to prevent leakage. Store only dataset IDs and labels in benchmark reports; do not commit private images to the repository.

For safety-gate software tests, use synthetic JSON fixtures (not images) to verify that RESTRICTED, UNCERTAIN, missing/invalid gates, and SEXUAL_CONTENT always fail closed. These fixtures test policy plumbing, not model recognition.

## Evaluation protocol

Run all candidates against the exact same corpus, prompts, image preprocessing, hardware, batch size, and timeout. Pin model revision, tokenizer/processor revision, runtime version, and quantization settings.

Measure:
1. Macro-F1 and per-class precision/recall for visual style.
2. Confusion matrix, especially anime vs cartoon and photo vs AI-generated.
3. Calibration: confidence vs actual correctness; report ECE or reliability bins where sample size permits.
4. Abstention: fraction returned as UNKNOWN and accuracy on non-abstained samples.
5. Structured-output validity: valid schema, bounded signals, no extra fields.
6. Robustness: varied aspect ratios, low resolution, compression, busy backgrounds, and benign embedded text.
7. Latency: p50/p95 per image, throughput, peak RAM/VRAM, cold-start time.
8. Operational fit: supported runtime, model download size, reproducibility, license, and ability to run without a paid API.

Do not use free-form confidence alone as a safety decision. Any invalid output, timeout, or uncertain result must be mapped to UNCERTAIN and handled by Wake's fail-closed policy.

## Prompt and output contract

Ask the model only for:
- visual style from the allowed style labels;
- a brief neutral, non-sensitive description of visible non-explicit elements;
- confidence and uncertainty;
- bounded machine-readable signals.

Do not ask it to estimate a person's age, identity, attractiveness, or sensitive traits. Do not request explicit descriptions. Keep the result within the existing VisualResult contract.

## Initial pass criteria

A candidate may proceed to a controlled integration trial only if:
- macro-F1 for visual style is at least 0.85 on the held-out safe-only corpus;
- no style class has recall below 0.75;
- at least 99% of outputs validate against the schema;
- invalid, missing, timed-out, and uncertain outputs reliably become UNCERTAIN/restricted;
- p95 latency and peak memory fit the actual target worker limits;
- exact checkpoint license and runtime redistribution terms are approved.

These are project gates, not claims about current model performance. If no candidate passes, expand the safe corpus or revise the model/prompt; do not weaken the safety gate to improve pass rate.

## Selection rule

Choose the smallest model that passes all quality and operational gates. If multiple candidates pass, prefer the one with better macro-F1 and calibration, then lower p95 latency and memory. Keep the model behind VisionBackend so it can be replaced without changing Wake's API contract.

## Current project status

- No candidate is selected.
- No model weights are downloaded or deployed.
- No image-upload endpoint is enabled.
- The inference worker foundation is incomplete and must be verified before integration.
- Wake continues to treat unclassified/uncertain cases conservatively.

## Primary model references

- Qwen3-VL-8B-Instruct: https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct
- MiniCPM-V-4.7-1B: https://huggingface.co/openbmb/MiniCPM-V-4.7-1B
- InternVL3.5-8B: https://huggingface.co/OpenGVLab/InternVL3_5-8B
