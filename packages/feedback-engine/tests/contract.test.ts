import { describe, expect, test } from "bun:test";
import { FeedbackReportInputSchema } from "../src/contract";

const valid = () => ({
  schemaVersion: 1,
  submissionId: "3f0c2b1e-8d4a-4c6b-9e2f-1a2b3c4d5e6f",
  kind: "problem",
  description: "The tracker stayed empty.",
  contactEmail: "gm@example.com",
  meta: {
    appVersion: "0.36.0",
    area: "tabletop",
    browser: "firefox",
    screen: "narrow",
  },
});

const parses = (input: unknown) =>
  FeedbackReportInputSchema.safeParse(input).success;

describe("FeedbackReportInputSchema", () => {
  test("accepts a complete v1 report", () => {
    expect(parses(valid())).toBe(true);
  });

  test("accepts an empty contact email as absent", () => {
    expect(parses({ ...valid(), contactEmail: "" })).toBe(true);
  });

  test("accepts a description of exactly 4,000 code points", () => {
    expect(parses({ ...valid(), description: "🎲".repeat(4000) })).toBe(true);
  });

  test.each([
    ["schemaVersion 2", { ...valid(), schemaVersion: 2 }],
    ["unknown kind", { ...valid(), kind: "rant" }],
    ["empty description", { ...valid(), description: "   " }],
    ["description over 4,000", { ...valid(), description: "x".repeat(4001) }],
    ["malformed email", { ...valid(), contactEmail: "not-an-email" }],
    ["email over 254", { ...valid(), contactEmail: `${"a".repeat(250)}@x.co` }],
    ["non-UUID submissionId", { ...valid(), submissionId: "abc" }],
    [
      "appVersion with a URL",
      { ...valid(), meta: { ...valid().meta, appVersion: "https://x" } },
    ],
    [
      "unknown area",
      { ...valid(), meta: { ...valid().meta, area: "/vault/secret" } },
    ],
    [
      "unknown browser",
      { ...valid(), meta: { ...valid().meta, browser: "netscape" } },
    ],
    [
      "unknown screen",
      { ...valid(), meta: { ...valid().meta, screen: "huge" } },
    ],
    ["unknown top-level key", { ...valid(), vaultId: "v1" }],
    [
      "unknown meta key",
      { ...valid(), meta: { ...valid().meta, userAgent: "x" } },
    ],
    ["filled honeypot", { ...valid(), website: "http://spam" }],
  ])("rejects %s", (_label, input) => {
    expect(parses(input)).toBe(false);
  });

  test("accepts an empty honeypot", () => {
    expect(parses({ ...valid(), website: "" })).toBe(true);
  });
});
