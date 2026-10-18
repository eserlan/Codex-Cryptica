import { describe, it, expect } from "vitest";
import { isEntityVisible, type VisibilitySettings } from "./visibility";
import type { Entity } from "./entity";

describe("isEntityVisible", () => {
  const baseEntity: Entity = {
    id: "test-node",
    title: "Test Node",
    type: "character",
    labels: [],
    connections: [],
    content: "",
  };

  const adminSettings: VisibilitySettings = {
    sharedMode: false,
    defaultVisibility: "visible",
  };

  const sharedVisibleSettings: VisibilitySettings = {
    sharedMode: true,
    defaultVisibility: "visible",
  };

  const sharedHiddenSettings: VisibilitySettings = {
    sharedMode: true,
    defaultVisibility: "hidden",
  };

  it("should show everything in admin mode regardless of labels", () => {
    expect(
      isEntityVisible({ ...baseEntity, labels: ["hidden"] }, adminSettings),
    ).toBe(true);
    expect(isEntityVisible(baseEntity, adminSettings)).toBe(true);
  });

  describe("Shared Mode: Visible by Default", () => {
    it("should show unlabeled nodes", () => {
      expect(isEntityVisible(baseEntity, sharedVisibleSettings)).toBe(true);
    });

    it("should hide nodes labeled with 'hidden'", () => {
      expect(
        isEntityVisible(
          { ...baseEntity, labels: ["hidden"] },
          sharedVisibleSettings,
        ),
      ).toBe(false);
    });

    it("should hide nodes even if they also have 'revealed' label (precedence)", () => {
      expect(
        isEntityVisible(
          { ...baseEntity, labels: ["hidden", "revealed"] },
          sharedVisibleSettings,
        ),
      ).toBe(false);
    });
  });

  describe("Shared Mode: Hidden by Default", () => {
    it("should hide unlabeled nodes", () => {
      expect(isEntityVisible(baseEntity, sharedHiddenSettings)).toBe(false);
    });

    it("should show nodes labeled with 'revealed'", () => {
      expect(
        isEntityVisible(
          { ...baseEntity, labels: ["revealed"] },
          sharedHiddenSettings,
        ),
      ).toBe(true);
    });

    it("should show nodes with 'visible' label (alias)", () => {
      expect(
        isEntityVisible(
          { ...baseEntity, labels: ["visible"] },
          sharedHiddenSettings,
        ),
      ).toBe(true);
    });

    it("should hide nodes with 'hidden' label", () => {
      expect(
        isEntityVisible(
          { ...baseEntity, labels: ["hidden"] },
          sharedVisibleSettings,
        ),
      ).toBe(false);
    });

    it("should still hide nodes labeled with 'hidden' even if they have 'revealed'", () => {
      expect(
        isEntityVisible(
          { ...baseEntity, labels: ["hidden", "revealed"] },
          sharedHiddenSettings,
        ),
      ).toBe(false);
    });
  });

  describe("Case Sensitivity", () => {
    it("should handle uppercase labels", () => {
      expect(
        isEntityVisible(
          { ...baseEntity, labels: ["HIDDEN"] },
          sharedVisibleSettings,
        ),
      ).toBe(false);

      expect(
        isEntityVisible(
          { ...baseEntity, labels: ["REVEALED"] },
          sharedHiddenSettings,
        ),
      ).toBe(true);
    });

    it("should handle mixed-case labels", () => {
      expect(
        isEntityVisible(
          { ...baseEntity, labels: ["Hidden"] },
          sharedVisibleSettings,
        ),
      ).toBe(false);

      expect(
        isEntityVisible(
          { ...baseEntity, labels: ["Revealed"] },
          sharedHiddenSettings,
        ),
      ).toBe(true);

      expect(
        isEntityVisible(
          { ...baseEntity, labels: ["Visible"] },
          sharedHiddenSettings,
        ),
      ).toBe(true);
    });
  });

  describe("Legacy Tags Fallback", () => {
    it("should recognize legacy tags for unmigrated objects", () => {
      expect(
        isEntityVisible(
          { ...baseEntity, tags: ["hidden"] } as unknown as Entity,
          sharedVisibleSettings,
        ),
      ).toBe(false);
      expect(
        isEntityVisible(
          { ...baseEntity, tags: ["revealed"] } as unknown as Entity,
          sharedHiddenSettings,
        ),
      ).toBe(true);
    });
  });
});
