import { describe, it, expect } from "vitest";
import {
  MODEL_REGISTRY,
  OPERATION_DEFAULTS,
  getModel,
  getOperationDefaults,
} from "./registry";

describe("registry invariants", () => {
  it("has unique model keys", () => {
    const keys = MODEL_REGISTRY.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has no dangling defaultModelKey/fallbackModelKey references", () => {
    for (const entry of OPERATION_DEFAULTS) {
      expect(getModel(entry.defaultModelKey)).toBeDefined();
      expect(getModel(entry.fallbackModelKey)).toBeDefined();
    }
  });

  it("only points structured-generation defaults/fallbacks at structuredOutput-capable models", () => {
    const structuredEntries = OPERATION_DEFAULTS.filter(
      (d) => d.operation === "structured-generation",
    );
    for (const entry of structuredEntries) {
      expect(
        getModel(entry.defaultModelKey)?.capabilities.structuredOutput,
      ).toBe(true);
      expect(
        getModel(entry.fallbackModelKey)?.capabilities.structuredOutput,
      ).toBe(true);
    }
  });

  it("only points freeform-generation defaults/fallbacks at freeformGeneration-capable models", () => {
    const freeformEntries = OPERATION_DEFAULTS.filter(
      (d) => d.operation === "freeform-generation",
    );
    for (const entry of freeformEntries) {
      expect(
        getModel(entry.defaultModelKey)?.capabilities.freeformGeneration,
      ).toBe(true);
      expect(
        getModel(entry.fallbackModelKey)?.capabilities.freeformGeneration,
      ).toBe(true);
    }
  });
});

describe("getModel", () => {
  it("returns the matching entry", () => {
    expect(getModel("gemini-flash-lite")?.provider).toBe("gemini");
  });

  it("returns undefined for an unknown key", () => {
    expect(getModel("does-not-exist")).toBeUndefined();
  });
});

describe("getOperationDefaults", () => {
  it("returns the matching operation/context pair", () => {
    const defaults = getOperationDefaults("structured-generation", "public");
    expect(defaults?.defaultModelKey).toBe("gemini-flash-lite");
  });

  it("returns undefined for an operation with no configured defaults (e.g. revision)", () => {
    expect(getOperationDefaults("revision", "public")).toBeUndefined();
  });

  it("returns undefined for a context with no configured defaults (e.g. authenticated, this slice)", () => {
    expect(
      getOperationDefaults("structured-generation", "authenticated"),
    ).toBeUndefined();
  });
});
