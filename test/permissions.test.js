import test from "node:test";
import assert from "node:assert/strict";
import { hasMinimumRole } from "../src/lib/permissions.js";

test("OWNER meets every role threshold", () => {
  assert.equal(hasMinimumRole("OWNER", "OWNER"), true);
  assert.equal(hasMinimumRole("OWNER", "ADMIN"), true);
  assert.equal(hasMinimumRole("OWNER", "VIEWER"), true);
});

test("ADMIN can review but cannot administer owners", () => {
  assert.equal(hasMinimumRole("ADMIN", "ADMIN"), true);
  assert.equal(hasMinimumRole("ADMIN", "OWNER"), false);
});

test("VIEWER is read-only and unknown roles are denied", () => {
  assert.equal(hasMinimumRole("VIEWER", "VIEWER"), true);
  assert.equal(hasMinimumRole("VIEWER", "ADMIN"), false);
  assert.equal(hasMinimumRole("UNKNOWN", "VIEWER"), false);
});
