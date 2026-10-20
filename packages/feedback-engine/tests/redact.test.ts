import { describe, expect, test } from "bun:test";
import { redactSecrets, REDACTION_MARKER } from "../src/redact";

describe("redactSecrets", () => {
  test.each([
    ["an OpenAI-style key", "key sk-abc123def456ghi789jkl012mno345 here"],
    ["a GitHub token", "token ghp_abcdefghijklmnopqrstuvwxyz0123456789"],
    [
      "a fine-grained GitHub token",
      "github_pat_11ABCDEFG0123456789_abcdefghijklmnop",
    ],
    ["an AWS access key id", "AKIAIOSFODNN7EXAMPLE"],
    ["a Google API key", "AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI"],
    ["a bearer token", "Authorization: Bearer abc.def.ghi123"],
    ["a JWT", "eyJhbGciOi.eyJzdWIiOi.SflKxwRJSM"],
    [
      "a PEM private key",
      "-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----",
    ],
    ["password written with a value", "password: hunter2"],
    ["an api key written with equals", "api key = xyz987"],
    [
      "a 48-character base64 run",
      "A".repeat(24) + "b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4",
    ],
    ["a 40-character hex run", "0123456789abcdef".repeat(2) + "abcdef01"],
  ])("removes %s", (_label, text) => {
    const out = redactSecrets(text);
    expect(out).toContain(REDACTION_MARKER);
    expect(out).not.toBe(text);
  });

  test.each([
    ["ordinary prose", "The tracker stayed empty after I rolled initiative."],
    ["dice formulas", "I rolled 1d20+5 and 2d6+3 on the tabletop."],
    ["a URL", "See https://codexcryptica.com/generators/npc for the page."],
    ["a UUID", "Submission 3f0c2b1e-8d4a-4c6b-9e2f-1a2b3c4d5e6f"],
    ["a reference", "My reference is CC-7F3K-9Q2M."],
    ["a password with no value", "I forgot my password again."],
    [
      "an entity name with Token but no value",
      "The Token of Lantern Ford is lost.",
    ],
  ])("leaves %s untouched", (_label, text) => {
    expect(redactSecrets(text)).toBe(text);
  });

  test("removes several secrets and keeps the rest of the text", () => {
    const out = redactSecrets("a sk-abc123def456ghi789jkl012 b password: x c");
    expect(out).toBe(`a ${REDACTION_MARKER} b ${REDACTION_MARKER} c`);
  });
});
