import io
import json
import unittest
from PIL import Image
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.qwen_backend import Qwen3VLBackend, _parse_output
from app.contracts import SafetyGate, VisualStyle


def png_bytes():
    output = io.BytesIO()
    Image.new("RGB", (2, 2), "white").save(output, format="PNG")
    return output.getvalue()


class FakeInputs(dict):
    def to(self, device):
        return self


class FakeModel:
    device = "cpu"

    def __init__(self, output):
        self.output = output

    def eval(self):
        return self

    def generate(self, **kwargs):
        if isinstance(self.output, Exception):
            raise self.output
        return [[1, 2, 3, 4]]


class FakeProcessor:
    def __init__(self, output):
        self.output = output

    def apply_chat_template(self, *args, **kwargs):
        return FakeInputs(input_ids=[[1, 2]])

    def batch_decode(self, *args, **kwargs):
        return [self.output]


class FakeTorch:
    class inference_mode:
        def __enter__(self):
            return self
        def __exit__(self, *args):
            return False


class QwenBackendTests(unittest.TestCase):
    def backend(self, output):
        return Qwen3VLBackend(
            local_files_only=True,
            loader=lambda *args: (FakeModel(output), FakeProcessor(output)),
        )

    def test_valid_output_returns_style_but_never_clears_safety(self):
        backend = self.backend(json.dumps({"style": "ANIME_MANGA", "confidence": 0.91}))
        # The runtime's torch context is patched without importing/downloading model weights.
        import sys
        original = sys.modules.get("torch")
        sys.modules["torch"] = type("TorchModule", (), {"inference_mode": FakeTorch.inference_mode})
        try:
            result = backend.analyze(png_bytes(), "image/png")
        finally:
            if original is None:
                sys.modules.pop("torch", None)
            else:
                sys.modules["torch"] = original
        self.assertEqual(result.style, VisualStyle.ANIME_MANGA)
        self.assertEqual(result.safetyGate, SafetyGate.RESTRICTED)
        self.assertEqual(result.category.value, "UNKNOWN")

    def test_malformed_output_is_restricted_unknown(self):
        result = _parse_output("not json")
        self.assertEqual(result.style, VisualStyle.UNKNOWN)
        self.assertEqual(result.safetyGate, SafetyGate.RESTRICTED)

    def test_timeout_is_restricted_unknown(self):
        backend = self.backend(TimeoutError("timeout"))
        import sys
        original = sys.modules.get("torch")
        sys.modules["torch"] = type("TorchModule", (), {"inference_mode": FakeTorch.inference_mode})
        try:
            result = backend.analyze(png_bytes(), "image/png")
        finally:
            if original is None:
                sys.modules.pop("torch", None)
            else:
                sys.modules["torch"] = original
        self.assertEqual(result.safetyGate, SafetyGate.RESTRICTED)
        self.assertIn("MODEL_TIMEOUT", result.signals)

    def test_model_error_is_restricted_unknown(self):
        backend = self.backend(RuntimeError("failure"))
        import sys
        original = sys.modules.get("torch")
        sys.modules["torch"] = type("TorchModule", (), {"inference_mode": FakeTorch.inference_mode})
        try:
            result = backend.analyze(png_bytes(), "image/png")
        finally:
            if original is None:
                sys.modules.pop("torch", None)
            else:
                sys.modules["torch"] = original
        self.assertEqual(result.safetyGate, SafetyGate.RESTRICTED)
        self.assertIn("MODEL_INFERENCE_ERROR", result.signals)

    def test_unknown_style_abstains(self):
        result = _parse_output(json.dumps({"style": "UNKNOWN", "confidence": 0.4}))
        self.assertEqual(result.style, VisualStyle.UNKNOWN)
        self.assertEqual(result.safetyGate, SafetyGate.RESTRICTED)

    def test_lazy_loading_and_local_only_default(self):
        calls = []
        def loader(*args):
            calls.append(args)
            return FakeModel("{}"), FakeProcessor("{}")
        backend = Qwen3VLBackend(loader=loader)
        self.assertEqual(calls, [])
        self.assertTrue(backend.local_files_only)


if __name__ == "__main__":
    unittest.main()
