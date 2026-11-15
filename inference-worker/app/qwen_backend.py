"""Lazy, local-only Qwen3-VL adapter.

This adapter classifies visual style only. It deliberately leaves all safety
fields UNCERTAIN/UNKNOWN so a general-purpose VLM cannot clear moderation risk.
"""
import io
import json
import os
import re
from typing import Any

from .backend import VisionBackend
from .contracts import Category, SafetyGate, Severity, VisualResult, VisualStyle

_ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_IMAGE_BYTES = 8 * 1024 * 1024
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
    try:
        match = re.fullmatch(r"\s*(?:```json\s*)?(\{.*\})(?:\s*```)?\s*", text, re.DOTALL)
        if not match:
            return _uncertain_result("INVALID_MODEL_OUTPUT")
        payload = json.loads(match.group(1))
        if not isinstance(payload, dict) or set(payload) != {"style", "confidence"}:
            return _uncertain_result("INVALID_MODEL_SCHEMA")
        style = payload["style"]
        confidence = payload["confidence"]
        if style not in _STYLE_LABELS:
            return _uncertain_result("INVALID_MODEL_STYLE")
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
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
    except (ValueError, TypeError, json.JSONDecodeError):
        return _uncertain_result("INVALID_MODEL_OUTPUT")


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
        self.model_id = model_id or os.getenv("WAKE_QWEN_MODEL_ID", "Qwen/Qwen3-VL-8B-Instruct")
        self.revision = revision or os.getenv("WAKE_QWEN_REVISION") or None
        self.device_map = device_map or os.getenv("WAKE_QWEN_DEVICE_MAP", "auto")
        if local_files_only is None:
            local_files_only = os.getenv("WAKE_QWEN_LOCAL_FILES_ONLY", "true").lower() not in {"0", "false", "no"}
        self.local_files_only = local_files_only
        self.max_new_tokens = max(16, min(int(max_new_tokens), 128))
        self.generation_timeout_seconds = max(1.0, float(os.getenv("WAKE_QWEN_GENERATION_TIMEOUT_SECONDS", "30")))
        self._loader = loader
        self._model = None
        self._processor = None

    def _load(self):
        if self._model is not None and self._processor is not None:
            return self._model, self._processor
        if self.local_files_only and not self._loader:
            # Hugging Face libraries honor local_files_only on both calls.
            pass
        if self._loader:
            model, processor = self._loader(
                self.model_id, self.revision, self.device_map, self.local_files_only
            )
        else:
            try:
                import torch
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
            if not isinstance(image_bytes, bytes) or not image_bytes or len(image_bytes) > _MAX_IMAGE_BYTES:
                return _uncertain_result("INVALID_IMAGE_INPUT")
            if mime_type not in _ALLOWED_MIME:
                return _uncertain_result("UNSUPPORTED_IMAGE_MIME")

            from PIL import Image
            with Image.open(io.BytesIO(image_bytes)) as source:
                source.verify()
            with Image.open(io.BytesIO(image_bytes)) as source:
                image = source.convert("RGB")

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
            if hasattr(inputs, "to"):
                inputs = inputs.to(model.device)
            if isinstance(inputs, dict):
                inputs.pop("token_type_ids", None)
            import torch
            with torch.inference_mode():
                generated = model.generate(\n                    **inputs,\n                    max_new_tokens=self.max_new_tokens,\n                    max_time=self.generation_timeout_seconds,\n                    do_sample=False,\n                )
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
