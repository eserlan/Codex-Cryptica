import { describe, expect, it } from "vitest";
import { COACH_MARKS } from "./help-coach-marks";
import * as publicHelp from "./help-content";

describe("mobile graph coach marks", () => {
  it("keeps the mobile navigation, controls and search targets", () => {
    expect(publicHelp.COACH_MARKS).toBe(COACH_MARKS);
    expect(COACH_MARKS.map((mark) => mark.targetSelector)).toEqual([
      '[data-testid="activity-bar"]',
      '[data-testid="graph-controls-fab"]',
      '[data-testid="mobile-search-button"]',
    ]);
  });

  it("never leaves a mark unanchored or reuses a dismissal id", () => {
    expect(new Set(COACH_MARKS.map((mark) => mark.id)).size).toBe(
      COACH_MARKS.length,
    );
    for (const mark of COACH_MARKS) {
      expect(mark.targetSelector).not.toBe("body");
      expect(mark.title.trim()).not.toBe("");
      expect(mark.body.trim()).not.toBe("");
      expect(mark.icon).toMatch(/^icon-\[lucide--[a-z0-9-]+\]$/);
    }
  });
});
