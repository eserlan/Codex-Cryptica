import { describe, expect, it } from "vitest";
import { ONBOARDING_TOUR } from "./help-onboarding-tour";
import * as publicHelp from "./help-content";

describe("welcome tour", () => {
  it("keeps the short create, connect and optional Oracle sequence", () => {
    expect(publicHelp.ONBOARDING_TOUR).toBe(ONBOARDING_TOUR);
    expect(ONBOARDING_TOUR.map((step) => step.id)).toEqual([
      "welcome",
      "create-entity",
      "graph",
      "oracle",
    ]);
    expect(ONBOARDING_TOUR[0].targetSelector).toBe("body");
    expect(ONBOARDING_TOUR[1].targetSelector).toBe(
      '[data-testid="graph-empty-state-cta"]',
    );
  });

  it("does not require the desktop-only header creation button", () => {
    for (const step of ONBOARDING_TOUR) {
      expect(step.targetSelector).not.toMatch(/header|hamburger|new-entity/);
      expect(step.title.trim()).not.toBe("");
      expect(step.content.trim()).not.toBe("");
      expect(["top", "bottom", "left", "right"]).toContain(step.position);
    }
  });
});
