import io
import json
import sys
import unittest
from contextlib import nullcontext
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.qwen_backend import (
    DEFAULT_MODEL_ID,
    VERIFIED_MODEL_REVISION,
    Qwen3VLBackend,
    _parse_output,
)
from app.contracts import Category, SafetyGate, Severity, VisualStyle


def png_bytes():
    output = io.BytesIO()
    Image.new("RGB", (2, 2), "white").save(output, format="PNG")
    return output.getvalue()


class FakeInputs(dict):
    def to(self, device):
        return self


class FakeModel:
    device = "cpu"

    def __init__(self, error=None):
        self.error = error

    def eval(self):
        return self

    def generate(self, **kwargs):
        if self.error is not None:
            raise self.error
        return [[1, 2, 3, 4]]


class FakeProcessor:
    def __init__(self, output):
        self.output = output
        self.messages = None

    def apply_chat_template(self, messages, **kwargs):
        self.messages = messages
        return FakeInputs(input_ids=[[1, 2]])

    def batch_decode(self, *args, **kwargs):
        return [self.output]


FAKE_TORCH = SimpleNamespace(inference_mode=nullcontext)


class QwenBackendTests(unittest.TestCase):
    def backend(self, output=None, error=None):
        return Qwen3VLBackend(
            local_files_only=True,
            loader=lambda *args: (FakeModel(error), FakeProcessor(output)),
        )

    def analyze_with_fake_torch(self, backend):
        with patch.dict(sys.modules, {"torch": FAKE_TORCH}):
            return backend.analyze(png_bytes(), "image/png")

    def assert_restricted_unknown(self, result):
        self.assertEqual(result.style, VisualStyle.UNKNOWN)
        self.assertEqual(result.safetyGate, SafetyGate.RESTRICTED)
        self.assertEqual(result.category, Category.UNKNOWN)
        self.assertEqual(result.severity, Severity.UNKNOWN)

    def test_valid_output_returns_style_but_never_clears_safety(self):
        processor_output = json.dumps({"style": "ANIME_MANGA", "confidence": 0.91})
        backend = self.backend(output=processor_output)
        with patch.dict(sys.modules, {"torch": FAKE_TORCH}):
            result = backend.analyze(png_bytes(), "image/png")
        self.assertEqual(result.style, VisualStyle.ANIME_MANGA)
        self.assertEqual(result.safetyGate, SafetyGate.RESTRICTED)
        self.assertEqual(result.category, Category.UNKNOWN)
        self.assertEqual(result.severity, Severity.UNKNOWN)
        self.assertEqual(backend._processor.messages[0]["content"][0]["type"], "image")
        self.assertIsInstance(
            backend._processor.messages[0]["content"][0]["image"], Image.Image
        )

    def test_malformed_output_is_restricted_unknown(self):
        self.assert_restricted_unknown(_parse_output("not json"))

    def test_extra_model_fields_are_rejected(self):
        output = json.dumps({
            "style": "REAL_PHOTO",
            "confidence": 0.8,
            "safetyGate": "CLEAR",
        })
        self.assert_restricted_unknown(_parse_output(output))

    def test_invalid_confidence_is_rejected(self):
        output = json.dumps({"style": "REAL_PHOTO", "confidence": True})
        self.assert_restricted_unknown(_parse_output(output))

    def test_unknown_style_abstains(self):
        output = json.dumps({"style": "UNKNOWN", "confidence": 0.4})
        self.assert_restricted_unknown(_parse_output(output))

    def test_timeout_exception_is_restricted_unknown(self):
        result = self.analyze_with_fake_torch(
            self.backend(error=TimeoutError("timeout"))
        )
        self.assert_restricted_unknown(result)
        self.assertIn("MODEL_TIMEOUT", result.signals)

    def test_generation_budget_overrun_is_restricted_unknown(self):
        backend = self.backend(
            output=json.dumps({"style": "REAL_PHOTO", "confidence": 0.8})
        )
        with patch.dict(sys.modules, {"torch": FAKE_TORCH}):
            with patch("app.qwen_backend.time.monotonic", side_effect=[1.0, 32.0]):
                result = backend.analyze(png_bytes(), "image/png")
        self.assert_restricted_unknown(result)
        self.assertIn("MODEL_TIMEOUT", result.signals)

    def test_model_error_is_restricted_unknown(self):
        result = self.analyze_with_fake_torch(
            self.backend(error=RuntimeError("failure"))
        )
        self.assert_restricted_unknown(result)
        self.assertIn("MODEL_INFERENCE_ERROR", result.signals)

    def test_model_load_error_is_restricted_unknown(self):
        def failed_loader(*args):
            raise RuntimeError("weights unavailable")
        backend = Qwen3VLBackend(loader=failed_loader)
        result = backend.analyze(png_bytes(), "image/png")
        self.assert_restricted_unknown(result)
        self.assertIn("MODEL_INFERENCE_ERROR", result.signals)

    def test_invalid_empty_image_is_restricted_before_model_load(self):
        calls = []
        backend = Qwen3VLBackend(loader=lambda *args: calls.append(args))
        result = backend.analyze(b"", "image/png")
        self.assert_restricted_unknown(result)
        self.assertEqual(calls, [])

    def test_invalid_mime_is_restricted_before_model_load(self):
        calls = []
        backend = Qwen3VLBackend(loader=lambda *args: calls.append(args))
        result = backend.analyze(png_bytes(), "image/jpeg")
        self.assert_restricted_unknown(result)
        self.assertIn("IMAGE_MIME_MISMATCH", result.signals)
        self.assertEqual(calls, [])

    def test_lazy_loading_and_verified_default_revision(self):
        calls = []
        def loader(*args):
            calls.append(args)
            return FakeModel(), FakeProcessor("{}")
        backend = Qwen3VLBackend(loader=loader)
        self.assertEqual(calls, [])
        self.assertTrue(backend.local_files_only)
        self.assertEqual(backend.model_id, DEFAULT_MODEL_ID)
        self.assertEqual(backend.revision, VERIFIED_MODEL_REVISION)

    def test_custom_model_id_does_not_inherit_qwen_revision(self):
        backend = Qwen3VLBackend(model_id="example/custom-model", loader=lambda *args: (None, None))
        self.assertIsNone(backend.revision)


if __name__ == "__main__":
    unittest.main()
