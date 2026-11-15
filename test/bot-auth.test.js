import test from "node:test";
import assert from "node:assert/strict";
import { containsForbiddenMedia, validDiscordId } from "../src/lib/bot-auth.js";

test("accepts valid Discord snowflake identifiers", () => {
  assert.equal(validDiscordId("123456789012345678"), true);
  assert.equal(validDiscordId("not-a-discord-id"), false);
  assert.equal(validDiscordId("1234"), false);
});

test("rejects media URLs and media-bearing properties recursively", () => {
  assert.equal(containsForbiddenMedia({ messageId: "123456789012345678" }), false);
  assert.equal(containsForbiddenMedia({ attachment_url: "https://cdn.example/file.png" }), true);
  assert.equal(containsForbiddenMedia({ nested: { mediaUrl: "https://example.test/x" } }), true);
  assert.equal(containsForbiddenMedia({ safeSummary: "See https://example.test" }), true);
});
