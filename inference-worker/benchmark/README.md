# Wake model benchmark runner

This tool evaluates **saved predictions only**. It does not load images, download models, call model APIs, or make moderation decisions.

## Input files

Truth CSV:
`id,label` where label is one of `REAL_PHOTO`, `ANIME_MANGA`, `CARTOON_ILLUSTRATION`, `AI_GENERATED`, `UNKNOWN`.

Prediction JSONL (one object per sample):
```json
{"id":"sample-001","visualStyle":"REAL_PHOTO","confidence":0.94,"schemaValid":true,"latencyMs":182.4}
```

Invalid schema flags, invalid labels, or out-of-range confidence are counted as `UNKNOWN` and schema-invalid. Missing predictions are also scored as `UNKNOWN`. Extra prediction IDs are reported but excluded from metrics.

## Run

From repository root:

```bash
python inference-worker/benchmark/runner.py --truth path/to/labels.csv --predictions path/to/predictions.jsonl --output benchmark-report.json
```

Reports include accuracy, macro-F1, per-class precision/recall/F1, confusion matrix, UNKNOWN rate, schema-valid rate, and p50/p95 latency.

## Safety and interpretation

- Use only the safe-only, permissioned corpus described in `docs/MODEL_BENCHMARK_PLAN.md`.
- Do not put images, image URLs, filenames, user IDs, or private metadata in the report or repository.
- Do not benchmark explicit or graphic content. Safety-gate behavior is tested with synthetic JSON fixtures, not such images.
- UNKNOWN is an abstention, not a successful classification. Review macro-F1 together with UNKNOWN rate.
- These metrics cover visual-style classification only. They do not certify sexual-content, age, violence, or gore detection.
- A model's confidence is not a safety decision. Invalid, missing, timed-out, or uncertain outputs must fail closed in Wake.
