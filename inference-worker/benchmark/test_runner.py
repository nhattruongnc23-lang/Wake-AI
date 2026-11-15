import importlib.util
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("runner.py")
SPEC = importlib.util.spec_from_file_location("wake_benchmark_runner", MODULE_PATH)
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class BenchmarkRunnerTests(unittest.TestCase):
    def test_metrics_and_missing_prediction_fail_to_unknown(self):
        truth = {"a": "REAL_PHOTO", "b": "ANIME_MANGA", "c": "AI_GENERATED"}
        predictions = {
            "a": {"label": "REAL_PHOTO", "schema_valid": True, "latency": 10.0},
            "b": {"label": "ANIME_MANGA", "schema_valid": True, "latency": 20.0},
        }
        report = runner.evaluate(truth, predictions)
        self.assertEqual(report["sample_count"], 3)
        self.assertEqual(report["accuracy"], 2 / 3)
        self.assertEqual(report["unknown_prediction_rate"], 1 / 3)
        self.assertEqual(report["latency_ms"]["p95"], 20.0)

    def test_invalid_schema_prediction_is_unknown(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "predictions.jsonl"
            path.write_text('{"id":"x","visualStyle":"REAL_PHOTO","confidence":2,"schemaValid":true,"latencyMs":1}\n', encoding="utf-8")
            result = runner.load_predictions(path)
        self.assertEqual(result["x"]["label"], "UNKNOWN")
        self.assertFalse(result["x"]["schema_valid"])

    def test_duplicate_truth_id_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "truth.csv"
            path.write_text("id,label\nx,REAL_PHOTO\nx,ANIME_MANGA\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                runner.load_truth(path)


if __name__ == "__main__":
    unittest.main()
