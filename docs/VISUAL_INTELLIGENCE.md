# Wake Visual Intelligence — v0.1 foundation

## Purpose
Wake Visual Intelligence is the classification contract between an isolated image-analysis worker and Wake Moderation. It separates visual-style recognition from content-risk assessment. A photo, anime/manga drawing, cartoon illustration, or AI-generated image is a style label only; style must never be treated as a safety verdict.

## Current implementation
- Normalizes style, safety-gate, category, severity, confidence and bounded signal labels.
- Accepts metadata-only results at `POST /api/analyzer/results`.
- Authenticates the analyzer with a dedicated bearer secret (`WAKE_ANALYZER_SECRET`, minimum 32 characters).
- Fails closed when the safety gate is absent, uncertain or invalid.
- Keeps the existing conservative rule: `SEXUAL_CONTENT` remains restricted even if an upstream result claims CLEAR.
- Records classifier version and a short, non-media summary in the case record, plus an audit event.
- Does not accept image bytes, attachment URLs, thumbnails, previews or message text.
- Does not expose media or enable human evidence review.

## Style labels
- `REAL_PHOTO`
- `ANIME_MANGA`
- `CARTOON_ILLUSTRATION`
- `AI_GENERATED`
- `UNKNOWN`

Style classification is independent from the safety category. Unknown style does not imply a violation.

## Safety-gate contract
- `CLEAR`: upstream analyzer has completed its safety checks.
- `RESTRICTED`: upstream analyzer has flagged a case that must not enter human media review.
- `UNCERTAIN`: insufficient confidence or unresolved age/safety signals; Wake treats it as RESTRICTED.

The current system intentionally treats every sexual-content category as RESTRICTED. Any future refinement requires a separately reviewed policy and tests; do not weaken this rule in the analyzer adapter.

## API contract
Request body:
```json
{
  "caseId": "guildId:messageId",
  "result": {
    "style": "ANIME_MANGA",
    "safetyGate": "UNCERTAIN",
    "category": "UNKNOWN",
    "severity": "UNKNOWN",
    "confidence": 0.72,
    "signals": ["AGE_UNCLEAR"]
  }
}
```

The endpoint updates an existing case by `externalCaseId`. It does not create cases and returns only case metadata. Configure `WAKE_ANALYZER_SECRET` independently from `SYLEN_API_SECRET`.

## Important limitation
This is the result-ingestion and policy foundation, not a functioning vision model. No model weights, image decoding, inference worker, image upload path or actual visual recognition are included. Sylen continues to send metadata only. An isolated, privacy-reviewed inference worker must be selected and deployed before real images can be classified. Until then, cases remain UNCLASSIFIED and unavailable for review.
