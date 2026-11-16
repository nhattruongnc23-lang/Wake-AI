#!/usr/bin/env python3
"""Evaluate saved model predictions against safe-corpus labels; never loads images."""
import argparse
import csv
import json
import math
import statistics
from collections import Counter, defaultdict
from pathlib import Path

LABELS = ("REAL_PHOTO", "ANIME_MANGA", "CARTOON_ILLUSTRATION", "AI_GENERATED", "UNKNOWN")


def load_truth(path):
    with Path(path).open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    truth = {}
    for row in rows:
        sample_id, label = row.get("id", "").strip(), row.get("label", "").strip()
        if not sample_id or label not in LABELS or sample_id in truth:
            raise ValueError("Truth CSV requires unique ids and valid labels")
        truth[sample_id] = label
    if not truth:
        raise ValueError("Truth CSV is empty")
    return truth


def load_predictions(path):
    predictions = {}
    with Path(path).open(encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, 1):
            if not line.strip():
                continue
            row = json.loads(line)
            sample_id = str(row.get("id", "")).strip()
            if not sample_id or sample_id in predictions:
                raise ValueError(f"Prediction line {line_no}: missing or duplicate id")
            label = row.get("visualStyle")
            valid = row.get("schemaValid") is True and label in LABELS
            confidence = row.get("confidence")
            if not isinstance(confidence, (int, float)) or isinstance(confidence, bool) or not 0 <= confidence <= 1:
                valid = False
            latency = row.get("latencyMs")
            if not isinstance(latency, (int, float)) or isinstance(latency, bool) or latency < 0:
                latency = None
            predictions[sample_id] = {
                "label": label if valid else "UNKNOWN",
                "schema_valid": valid,
                "latency": latency,
            }
    return predictions


def percentile(values, fraction):
    if not values:
        return None
    values = sorted(values)
    index = max(0, math.ceil(fraction * len(values)) - 1)
    return round(values[index], 2)


def evaluate(truth, predictions):
    missing = sorted(set(truth) - set(predictions))
    extras = sorted(set(predictions) - set(truth))
    matrix = {actual: Counter() for actual in LABELS}
    per_class = {}
    for sample_id, actual in truth.items():
        predicted = predictions.get(sample_id, {}).get("label", "UNKNOWN")
        matrix[actual][predicted] += 1
    f1s, recalls = [], []
    for label in LABELS:
        tp = matrix[label][label]
        support = sum(matrix[label].values())
        fp = sum(matrix[actual][label] for actual in LABELS if actual != label)
        fn = support - tp
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / support if support else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class[label] = {"precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4), "support": support}
        if support:
            f1s.append(f1)
            if label != "UNKNOWN":
                recalls.append(recall)
    matched = [predictions[sid] for sid in truth if sid in predictions]
    latencies = [item["latency"] for item in matched if item["latency"] is not None]
    correct = sum(matrix[label][label] for label in LABELS)
    count = len(truth)
    schema_valid = sum(1 for item in matched if item["schema_valid"])
    return {
        "sample_count": count,
        "matched_count": len(matched),
        "missing_ids": missing,
        "extra_prediction_ids": extras,
        "accuracy": round(correct / count, 4),
        "macro_f1": round(statistics.mean(f1s), 4) if f1s else 0.0,
        "minimum_non_unknown_class_recall": round(min(recalls), 4) if recalls else 0.0,
        "schema_valid_rate": round(schema_valid / count, 4),
        # Missing predictions are abstentions and must count as UNKNOWN.
        "unknown_prediction_rate": round(
            sum(
                1 for sid in truth
                if predictions.get(sid, {}).get("label", "UNKNOWN") == "UNKNOWN"
            ) / count,
            4,
        ),
        "latency_ms": {"p50": percentile(latencies, 0.50), "p95": percentile(latencies, 0.95)},
        "per_class": per_class,
        "confusion_matrix": {actual: {predicted: matrix[actual][predicted] for predicted in LABELS} for actual in LABELS},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--truth", required=True, help="CSV with id,label columns")
    parser.add_argument("--predictions", required=True, help="JSONL with id,visualStyle,confidence,schemaValid,latencyMs")
    parser.add_argument("--output", help="Optional JSON report path")
    args = parser.parse_args()
    report = evaluate(load_truth(args.truth), load_predictions(args.predictions))
    rendered = json.dumps(report, indent=2, ensure_ascii=False)
    if args.output:
        Path(args.output).write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
