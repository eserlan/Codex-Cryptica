import { describe, it, expect } from "vitest";
import { FEATURE_HINTS, HINT_KEYS } from "./help-content";

// T061: in-app generators feature hint is registered (US5)
describe("help-content feature hints", () => {
  it("FEATURE_HINTS includes in-app-generators entry", () => {
    expect(FEATURE_HINTS["in-app-generators"]).toBeDefined();
    expect(FEATURE_HINTS["in-app-generators"].id).toBe("in-app-generators");
    expect(FEATURE_HINTS["in-app-generators"].title).toBeTruthy();
    expect(FEATURE_HINTS["in-app-generators"].content).toBeTruthy();
  });

  it("HINT_KEYS includes IN_APP_GENERATORS key", () => {
    expect(HINT_KEYS.IN_APP_GENERATORS).toBe("in-app-generators-hint-seen");
  });

  it("FEATURE_HINTS includes deterministic-imports entry", () => {
    expect(FEATURE_HINTS["deterministic-imports"]).toBeDefined();
    expect(FEATURE_HINTS["deterministic-imports"].id).toBe(
      "deterministic-imports",
    );
    expect(FEATURE_HINTS["deterministic-imports"].title).toBeTruthy();
    expect(FEATURE_HINTS["deterministic-imports"].content).toContain("Labels");
  });

  it("HINT_KEYS includes DETERMINISTIC_IMPORTS key", () => {
    expect(HINT_KEYS.DETERMINISTIC_IMPORTS).toBe(
      "deterministic-imports-hint-seen",
    );
  });

  it("FEATURE_HINTS includes chronica-imports entry", () => {
    expect(FEATURE_HINTS["chronica-imports"]).toBeDefined();
    expect(FEATURE_HINTS["chronica-imports"].id).toBe("chronica-imports");
    expect(FEATURE_HINTS["chronica-imports"].title).toBeTruthy();
    expect(FEATURE_HINTS["chronica-imports"].content).toContain(
      "multiple JSON files",
    );
  });

  it("HINT_KEYS includes CHRONICA_IMPORTS key", () => {
    expect(HINT_KEYS.CHRONICA_IMPORTS).toBe("chronica-imports-hint-seen");
  });
});
