import test from "node:test";
import assert from "node:assert/strict";
import { inspectModelProvider } from "../src/core/model-health.js";

const config = {
  baseUrl: "https://model.example/v1",
  model: "wake-test",
  apiKey: "secret"
};

test("reports a reachable provider and listed model", async () => {
  const result = await inspectModelProvider({
    config,
    env: {},
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://model.example/v1/models");
      assert.equal(options.headers.authorization, "Bearer secret");
      return Response.json({ data: [{ id: "wake-test" }] });
    }
  });
  assert.deepEqual(result, {
    status: "ready", reachable: true, model: "wake-test", modelListed: true
  });
});

test("does not treat a Vercel loopback URL as a model server", async () => {
  const result = await inspectModelProvider({
    config: { ...config, baseUrl: "http://127.0.0.1:8080/v1" },
    env: { VERCEL: "1" },
    fetchImpl: async () => { throw new Error("must not call loopback"); }
  });
  assert.deepEqual(result, {
    status: "not_configured", reachable: false, model: "wake-test"
  });
});

test("reports an unreachable provider without leaking endpoint details", async () => {
  const result = await inspectModelProvider({
    config,
    env: {},
    fetchImpl: async () => { throw new Error("network error"); }
  });
  assert.deepEqual(result, {
    status: "unreachable", reachable: false, model: "wake-test"
  });
});

test("reports upstream HTTP failures", async () => {
  const result = await inspectModelProvider({
    config,
    env: {},
    fetchImpl: async () => new Response("", { status: 503 })
  });
  assert.equal(result.status, "provider_error");
  assert.equal(result.upstreamStatus, 503);
});
