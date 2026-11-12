import { describe, expect, it } from "bun:test";
import { formatSeed, hashSeed, normalizeSeed } from "../../src/region/seed";

describe("normalizeSeed", () => {
  it("trims and upper-cases", () => {
    expect(normalizeSeed("  k7q2-9fxm ")).toBe("K7Q2-9FXM");
  });
  it("rejects empty and over-long text", () => {
    expect(normalizeSeed("   ")).toBeNull();
    expect(normalizeSeed("")).toBeNull();
    expect(normalizeSeed("A".repeat(33))).toBeNull();
    expect(normalizeSeed("A".repeat(32))).toBe("A".repeat(32));
  });
});

describe("formatSeed", () => {
  it("is stable for the same bytes and has the form XXXX-XXXX", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(formatSeed(bytes)).toBe(formatSeed(bytes));
    expect(formatSeed(bytes)).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(normalizeSeed(formatSeed(bytes))).not.toBeNull();
  });
  it("differs for different bytes", () => {
    expect(formatSeed(new Uint8Array(8))).not.toBe(
      formatSeed(new Uint8Array(8).fill(9)),
    );
  });
});

describe("hashSeed", () => {
  it("is a stable 32-bit value", () => {
    expect(hashSeed("K7Q2-9FXM")).toBe(hashSeed("K7Q2-9FXM"));
    expect(hashSeed("K7Q2-9FXM")).not.toBe(hashSeed("K7Q2-9FXN"));
    const h = hashSeed("TEST");
    expect(Number.isInteger(h) && h >= 0 && h <= 0xffffffff).toBe(true);
    // Literal guard: a change here changes every landscape, so raise REGION_RULES_VERSION.
    expect(hashSeed("TEST")).toBe(3000449509);
  });
});
