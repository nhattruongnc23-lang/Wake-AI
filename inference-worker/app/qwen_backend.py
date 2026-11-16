"""Lazy, local-only Qwen3-VL adapter.

This adapter classifies visual style only. It deliberately leaves all safety
fields UNCERTAIN/UNKNOWN so a general-purpose VLM cannot clear moderation risk.
"""
import io
import json
import math
import os
import re
import time
from typing import Any

from .backend import VisionBackend
from .contracts import Category, SafetyGate, Severity, VisualResult, VisualStyle

DEFAULT_MODEL_ID = "Qwen/Qwen3-VL-8B-Instruct"
# Hugging Face model-card revision checked on 2026-11-16; license metadata is
# Apache-2.0. Pinning avoids silently changing the reviewed checkpoint.
VERIFIED_MODEL_REVISION = "a115a837cf3cbba4b697aa74b609721b5009ed41"

_ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_IMAGE_BYTES = 8 * 1024 * 1024
_MAX_IMAGE_PIXELS = 16_000_000
_MIME_FORMATS = {
    "image/jpeg": {"JPEG"},
    "image/png": {"PNG"},
    "image/webp": {"WEBP"},
    "image/gif": {"GIF"},
}
_STYLE_LABELS = {item.value for item in VisualStyle}
_PROMPT = """Classify only the broad visual presentation style of this image.
Choose exactly one label from: REAL_PHOTO, ANIME_MANGA,
CARTOON_ILLUSTRATION, AI_GENERATED, UNKNOWN.
Do not assess safety, age, identity, attractiveness, or sensitive traits.
Do not describe sexual, violent, or graphic details. If style is ambiguous,
choose UNKNOWN. Return one JSON object only, with exactly these keys:
{"style":"one allowed label","confidence":0.0}
Confidence must be a number from 0 to 1. Do not include markdown."""


def _uncertain_result(signal: str = "MODEL_UNAVAILABLE") -> VisualResult:
    return VisualResult(
        style=VisualStyle.UNKNOWN,
        safetyGate=SafetyGate.UNCERTAIN,
        category=Category.UNKNOWN,
        severity=Severity.UNKNOWN,
        confidence=None,
        signals=[signal],
    ).fail_closed()


def _parse_output(text: str) -> VisualResult:
    """Strictly parse model output; anything unexpected abstains."""
    if not isinstance(text, str):
        return _uncertain_result("INVALID_MODEL_OUTPUT")
    try:
        match = re.fullmatch(r"\s*(\{.*\})\s*", text, re.DOTALL)
        if not match:
            return _uncertain_result("INVALID_MODEL_OUTPUT")
        payload = json.loads(match.group(1))
        if not isinstance(payload, dict) or set(payload) != {"style", "confidence"}:
            return _uncertain_result("INVALID_MODEL_SCHEMA")
        style = payload["style"]
        confidence = payload["confidence"]
        if not isinstance(style, str) or style not in _STYLE_LABELS:
            return _uncertain_result("INVALID_MODEL_STYLE")
        if (
            isinstance(confidence, bool)
            or not isinstance(confidence, (int, float))
            or not math.isfinite(float(confidence))
            or not 0 <= confidence <= 1
        ):
            return _uncertain_result("INVALID_MODEL_CONFIDENCE")
        if style == VisualStyle.UNKNOWN.value:
            return _uncertain_result("MODEL_ABSTAINED")
        # This adapter is intentionally not a safety classifier.
        return VisualResult(
            style=VisualStyle(style),
            safetyGate=SafetyGate.UNCERTAIN,
            category=Category.UNKNOWN,
            severity=Severity.UNKNOWN,
            confidence=float(confidence),
            signals=["STYLE_ONLY_CLASSIFICATION"],
        ).fail_closed()
    except (ValueError, TypeError, OverflowError, json.JSONDecodeError):
        return _uncertain_result("INVALID_MODEL_OUTPUT")


def _bounded_timeout(value: str | float | int, default: float = 30.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError, OverflowError):
        return default
    if not math.isfinite(parsed):
        return default
    return min(max(parsed, 1.0), 120.0)


class Qwen3VLBackend(VisionBackend):
    """Qwen/Qwen3-VL-8B-Instruct adapter using Transformers.

    Weights are loaded only on first analyze() and are local-only by default.
    Set WAKE_QWEN_LOCAL_FILES_ONLY=false only in a separately approved,
    controlled model-provisioning environment.
    """

    name = "qwen3-vl"
    version = "8b-instruct"

    def __init__(
        self,
        model_id: str | None = None,
        revision: str | None = None,
        device_map: str | None = None,
        local_files_only: bool | None = None,
        max_new_tokens: int = 96,
        loader: Any = None,
    ):
        self.model_id = model_id or os.getenv("WAKE_QWEN_MODEL_ID", DEFAULT_MODEL_ID)
        requested_revision = revision or os.getenv("WAKE_QWEN_REVISION") or None
        self.revision = requested_revision or (
            VERIFIED_MODEL_REVISION if self.model_id == DEFAULT_MODEL_ID else None
        )
        self.device_map = device_map or os.getenv("WAKE_QWEN_DEVICE_MAP", "auto")
        if local_files_only is None:
            local_files_only = os.getenv("WAKE_QWEN_LOCAL_FILES_ONLY", "true").lower() not in {
                "0", "false", "no"
            }
        self.local_files_only = local_files_only
        try:
            token_limit = int(max_new_tokens)
        except (TypeError, ValueError):
            token_limit = 96
        self.max_new_tokens = min(max(token_limit, 16), 128)
        self.generation_timeout_seconds = _bounded_timeout(
            os.getenv("WAKE_QWEN_GENERATION_TIMEOUT_SECONDS", "30")
        )
        self._loader = loader
        self._model = None
        self._processor = None

    def _load(self):
        if self._model is not None and self._processor is not None:
            return self._model, self._processor
        if self._loader is not None:
            model, processor = self._loader(
                self.model_id, self.revision, self.device_map, self.local_files_only
            )
        else:
            try:
                import torch  # noqa: F401
                from transformers import AutoProcessor, Qwen3VLForConditionalGeneration
            except ImportError as exc:
                raise RuntimeError(
                    "Install inference-worker/requirements-qwen.txt to enable Qwen3-VL"
                ) from exc
            kwargs = {
                "device_map": self.device_map,
                "dtype": "auto",
                "local_files_only": self.local_files_only,
            }
            if self.revision:
                kwargs["revision"] = self.revision
            model = Qwen3VLForConditionalGeneration.from_pretrained(self.model_id, **kwargs)
            processor = AutoProcessor.from_pretrained(
                self.model_id,
                local_files_only=self.local_files_only,
                **({"revision": self.revision} if self.revision else {}),
            )
            model.eval()
        self._model, self._processor = model, processor
        return self._model, self._processor

    def analyze(self, image_bytes: bytes, mime_type: str) -> VisualResult:
        try:
            if (
                not isinstance(image_bytes, bytes)
                or not image_bytes
                or len(image_bytes) > _MAX_IMAGE_BYTES
            ):
                return _uncertain_result("INVALID_IMAGE_INPUT")
            if not isinstance(mime_type, str) or mime_type not in _ALLOWED_MIME:
                return _uncertain_result("UNSUPPORTED_IMAGE_MIME")

            from PIL import Image
            try:
                with Image.open(io.BytesIO(image_bytes)) as source:
                    if source.format not in _MIME_FORMATS[mime_type]:
                        return _uncertain_result("IMAGE_MIME_MISMATCH")
                    width, height = source.size
                    if width < 1 or height < 1 or width * height > _MAX_IMAGE_PIXELS:
                        return _uncertain_result("IMAGE_DIMENSIONS_EXCEEDED")
                    source.verify()
                with Image.open(io.BytesIO(image_bytes)) as source:
                    source.seek(0)
                    image = source.convert("RGB")
            except Exception:
                return _uncertain_result("INVALID_IMAGE_INPUT")

            model, processor = self._load()
            messages = [{
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": _PROMPT},
                ],
            }]
            inputs = processor.apply_chat_template(
                messages,
                tokenize=True,
                add_generation_prompt=True,
                return_dict=True,
                return_tensors="pt",
            )
            if hasattr(inputs, "pop"):
                inputs.pop("token_type_ids", None)
            if hasattr(inputs, "to"):
                inputs = inputs.to(model.device)

            import torch
            started_at = time.monotonic()
            with torch.inference_mode():
                generated = model.generate(
                    **inputs,
                    max_new_tokens=self.max_new_tokens,
                    max_time=self.generation_timeout_seconds,
                    do_sample=False,
                )
            # Transformers max_time is best-effort. This post-check rejects a
            # late result; a process supervisor is still needed for hard kills.
            if time.monotonic() - started_at > self.generation_timeout_seconds:
                return _uncertain_result("MODEL_TIMEOUT")

            input_ids = inputs["input_ids"]
            trimmed = [out[len(inp):] for inp, out in zip(input_ids, generated)]
            decoded = processor.batch_decode(
                trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
            )
            if len(decoded) != 1 or not isinstance(decoded[0], str):
                return _uncertain_result("INVALID_MODEL_OUTPUT")
            return _parse_output(decoded[0])
        except TimeoutError:
            return _uncertain_result("MODEL_TIMEOUT")
        except Exception:
            # Do not log exception contents: image payloads or paths must not leak.
            return _uncertain_result("MODEL_INFERENCE_ERROR")
