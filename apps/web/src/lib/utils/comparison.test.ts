import { describe, it, expect } from "vitest";
import { isTemporalMetadataEqual } from "./comparison";
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
