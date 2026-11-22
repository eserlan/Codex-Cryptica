import { describe, expect, it } from "vitest";
import {
  id,
  MAX_TEXT_CHARS,
  narration,
  text,
  timestamp,
} from "../src/schema-primitives";

describe("schema primitives", () => {
  it("trims bounded identifiers and state text while allowing longer narration", () => {
    expect(id.parse(" road ")).toBe("road");
    expect(text.parse(" clue ")).toBe("clue");
    expect(narration.parse("x".repeat(2_000))).toHaveLength(2_000);
    expect(timestamp.parse("2026-11-10T12:00:00+01:00")).toContain("+01:00");
  });

  it("rejects blank, oversized and invalid values", () => {
    expect(id.safeParse(" ").success).toBe(false);
    expect(id.safeParse("x".repeat(161)).success).toBe(false);
    expect(text.safeParse("x".repeat(MAX_TEXT_CHARS + 1)).success).toBe(false);
    expect(narration.safeParse("x".repeat(2_001)).success).toBe(false);
    expect(timestamp.safeParse("tomorrow").success).toBe(false);
  });
});
