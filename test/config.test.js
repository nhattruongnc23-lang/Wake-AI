import test from "node:test";
import assert from "node:assert/strict";
import { getConfig } from "../src/config.js";

test("uses safe local defaults", () => {
  const config = getConfig({});
  assert.equal(config.baseUrl, "http://127.0.0.1:8080/v1");
  assert.equal(config.model, "local-model");
  assert.equal(config.apiKey, "");
  assert.ok(config.requestTimeoutMs > 0);
});

test("reads configured model endpoint", () => {
  const config = getConfig({
    WAKE_BASE_URL: "https://example.test/v1/",
    WAKE_MODEL: "qwen-coder",
    WAKE_API_KEY: "test-key"
  });
  assert.equal(config.baseUrl, "https://example.test/v1");
  assert.equal(config.model, "qwen-coder");
  assert.equal(config.apiKey, "test-key");
});
