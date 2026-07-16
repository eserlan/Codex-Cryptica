import { describe, it, expect } from "vitest";
import { FEATURE_HINTS, HINT_KEYS } from "./help-content";

// T061: in-app generators feature hint is registered (US5)
describe("help-content feature hints", () => {
  it("includes the Lineage controls hint", () => {
    expect(FEATURE_HINTS["lineage-controls"]).toMatchObject({
      id: "lineage-controls",
      title: expect.any(String),
      content: expect.stringContaining("Drag to pan"),
    });
  });

  it("FEATURE_HINTS includes in-app-generators entry", () => {
    expect(FEATURE_HINTS["in-app-generators"]).toBeDefined();
    expect(FEATURE_HINTS["in-app-generators"].id).toBe("in-app-generators");
    expect(FEATURE_HINTS["in-app-generators"].title).toBeTruthy();
    expect(FEATURE_HINTS["in-app-generators"].content).toBeTruthy();
  });

  it("HINT_KEYS includes IN_APP_GENERATORS key", () => {
    expect(HINT_KEYS.IN_APP_GENERATORS).toBe("in-app-generators-hint-seen");
  });
});
