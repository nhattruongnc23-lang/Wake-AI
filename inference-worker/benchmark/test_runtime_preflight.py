import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from runtime_preflight import inspect_runtime, _model_cache_dir


class RuntimePreflightTests(unittest.TestCase):
    def test_does_not_claim_ready_without_cached_weights(self):
        with tempfile.TemporaryDirectory() as temp:
            result = inspect_runtime(cache_root=temp, disk_path=temp)
        self.assertFalse(result["weights_cached"])
        self.assertFalse(result["ready_for_inference"])
        self.assertFalse(result["network_access"])

    def test_detects_cached_safetensors_without_downloading(self):
        with tempfile.TemporaryDirectory() as temp:
            model_dir = _model_cache_dir(temp) / "snapshots" / "test-revision"
            model_dir.mkdir(parents=True)
            (model_dir / "model.safetensors").write_bytes(b"safe-test-placeholder")
            result = inspect_runtime(cache_root=temp, disk_path=temp)
        self.assertTrue(result["weights_cached"])
        self.assertFalse(result["network_access"])

    def test_missing_packages_are_reported(self):
        with tempfile.TemporaryDirectory() as temp:
            with patch("runtime_preflight.importlib.util.find_spec", return_value=None):
                result = inspect_runtime(cache_root=temp, disk_path=temp)
        self.assertFalse(result["ready_for_inference"])
        self.assertTrue(result["recommendations"])


if __name__ == "__main__":
    unittest.main()
