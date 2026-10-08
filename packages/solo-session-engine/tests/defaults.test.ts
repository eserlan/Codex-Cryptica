import { describe, expect, it } from "bun:test";
import {
  normaliseSceneName,
  resolveDefaultMap,
  resolveQuickRoll,
} from "../src/defaults";

describe("resolveDefaultMap", () => {
  it("returns the last map when it is still in the vault", () => {
    expect(resolveDefaultMap("m2", ["m1", "m2"])).toBe("m2");
  });

  it("falls back to the first map when the last one is gone", () => {
    expect(resolveDefaultMap("gone", ["m1", "m2"])).toBe("m1");
  });

  it("falls back to the first map when there is no last map", () => {
    expect(resolveDefaultMap(null, ["m1"])).toBe("m1");
  });

  it("returns null for a vault with no maps", () => {
    expect(resolveDefaultMap("m1", [])).toBeNull();
    expect(resolveDefaultMap(null, [])).toBeNull();
  });
});

describe("normaliseSceneName", () => {
  it("trims the name", () => {
    expect(normaliseSceneName("  Arrival  ")).toEqual({
      ok: true,
      name: "Arrival",
    });
  });

  it("rejects empty and whitespace-only names", () => {
    expect(normaliseSceneName("")).toEqual({ ok: false });
    expect(normaliseSceneName("   ")).toEqual({ ok: false });
  });

  it("clamps names to 80 characters", () => {
    const result = normaliseSceneName("x".repeat(120));
    expect(result).toEqual({ ok: true, name: "x".repeat(80) });
  });
});

describe("resolveQuickRoll", () => {
  it("uses typed input, trimmed", () => {
    expect(resolveQuickRoll("  2d6+1 ", "d20")).toBe("2d6+1");
  });

  it("repeats the last expression on empty input", () => {
    expect(resolveQuickRoll("", "d20")).toBe("d20");
    expect(resolveQuickRoll("   ", "d20")).toBe("d20");
  });

  it("returns null when empty with no last roll", () => {
    expect(resolveQuickRoll("", null)).toBeNull();
  });
});
