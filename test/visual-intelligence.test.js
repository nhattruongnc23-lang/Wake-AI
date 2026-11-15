import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVisualResult } from "../src/lib/visual-intelligence.js";

test("keeps visual style separate from safety category", () => {
  const result = normalizeVisualResult({
    style: "ANIME_MANGA",
    safetyGate: "CLEAR",
    category: "OTHER",
    severity: "LOW",
    confidence: 0.91
  });
  assert.equal(result.ok, true);
  assert.equal(result.result.style, "ANIME_MANGA");
  assert.equal(result.result.restricted, false);
  assert.equal(result.result.status, "PENDING");
});

test("fails closed when safety gate is missing or uncertain", () => {
  for (const safetyGate of [undefined, "UNCERTAIN", "INVALID"]) {
    const result = normalizeVisualResult({ style: "REAL_PHOTO", safetyGate, category: "OTHER" });
    assert.equal(result.ok, true);
    assert.equal(result.result.restricted, true);
    assert.equal(result.result.status, "RESTRICTED");
  }
});

test("keeps sexual category restricted even if gate says clear", () => {
  const result = normalizeVisualResult({
    style: "CARTOON_ILLUSTRATION",
    safetyGate: "CLEAR",
    category: "SEXUAL_CONTENT"
  });
  assert.equal(result.result.restricted, true);
});

test("unknown style never becomes a safety verdict", () => {
  const result = normalizeVisualResult({
    style: "NOT_A_STYLE",
    safetyGate: "CLEAR",
    category: "UNKNOWN"
  });
  assert.equal(result.result.style, "UNKNOWN");
  assert.equal(result.result.status, "UNCLASSIFIED");
});

test("rejects invalid confidence", () => {
  assert.equal(normalizeVisualResult({ confidence: 1.5 }).ok, false);
});
