import { describe, it, expect } from "vitest";
import { isTemporalMetadataEqual, isEntityMetadataEqual } from "./comparison";
import type { TemporalMetadata } from "schema";

describe("isTemporalMetadataEqual", () => {
  it("should return true for identical object references", () => {
    const meta: TemporalMetadata = { year: 2024, month: 1, day: 1 };
    expect(isTemporalMetadataEqual(meta, meta)).toBe(true);
  });

  it("should return true for null or undefined matching values", () => {
    expect(isTemporalMetadataEqual(null, null)).toBe(true);
    expect(isTemporalMetadataEqual(undefined, undefined)).toBe(true);
    expect(isTemporalMetadataEqual(null, undefined)).toBe(false);
  });

  it("should return false if one is null/undefined and the other is not", () => {
    const meta: TemporalMetadata = { year: 2024 };
    expect(isTemporalMetadataEqual(meta, null)).toBe(false);
    expect(isTemporalMetadataEqual(undefined, meta)).toBe(false);
  });

  it("should return true for deep equal metadata", () => {
    const a: TemporalMetadata = {
      year: 2024,
      month: 10,
      day: 15,
      label: "Test",
    };
    const b: TemporalMetadata = {
      year: 2024,
      month: 10,
      day: 15,
      label: "Test",
    };
    expect(isTemporalMetadataEqual(a, b)).toBe(true);
  });

  it("should return false if any field differs", () => {
    const base: TemporalMetadata = {
      year: 2024,
      month: 10,
      day: 15,
      label: "Test",
    };

    expect(isTemporalMetadataEqual(base, { ...base, year: 2025 })).toBe(false);
    expect(isTemporalMetadataEqual(base, { ...base, month: 11 })).toBe(false);
    expect(isTemporalMetadataEqual(base, { ...base, day: 16 })).toBe(false);
    expect(isTemporalMetadataEqual(base, { ...base, label: "Different" })).toBe(
      false,
    );
  });

  it("should handle partial metadata correctly", () => {
    const a: TemporalMetadata = { year: 2024 };
    const b: TemporalMetadata = { year: 2024 };
    const c: TemporalMetadata = { year: 2024, month: 1 };

    expect(isTemporalMetadataEqual(a, b)).toBe(true);
    expect(isTemporalMetadataEqual(a, c)).toBe(false);
  });
});

describe("isEntityMetadataEqual", () => {
  it("should return true for identical references", () => {
    const obj = { x: 1 };
    expect(isEntityMetadataEqual(obj, obj)).toBe(true);
  });

  it("should return false when one side is null/undefined", () => {
    expect(isEntityMetadataEqual(null, { x: 1 })).toBe(false);
    expect(isEntityMetadataEqual({ x: 1 }, undefined)).toBe(false);
    expect(isEntityMetadataEqual(null, null)).toBe(true);
  });

  it("should return true for deeply equal plain objects", () => {
    expect(
      isEntityMetadataEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }),
    ).toBe(true);
  });

  it("should return false for plain objects with different values", () => {
    expect(isEntityMetadataEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(isEntityMetadataEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("should return true for equal arrays", () => {
    expect(isEntityMetadataEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("should return false for arrays of different length or values", () => {
    expect(isEntityMetadataEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(isEntityMetadataEqual([1, 2], [1, 3])).toBe(false);
  });

  it("should correctly compare two equal Date instances", () => {
    const d1 = new Date("2024-01-01");
    const d2 = new Date("2024-01-01");
    expect(isEntityMetadataEqual(d1, d2)).toBe(true);
  });

  it("should correctly identify two different Date instances as not equal", () => {
    const d1 = new Date("2024-01-01");
    const d2 = new Date("2025-06-15");
    expect(isEntityMetadataEqual(d1, d2)).toBe(false);
  });

  it("should return false when one side is a Date and the other is not", () => {
    expect(
      isEntityMetadataEqual(new Date("2024-01-01"), { getTime: () => 0 }),
    ).toBe(false);
    expect(isEntityMetadataEqual("2024-01-01", new Date("2024-01-01"))).toBe(
      false,
    );
  });
});
