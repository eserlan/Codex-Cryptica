import { describe, it, expect } from "vitest";
import { isEntityVisible, type VisibilitySettings } from "./visibility";
import type { Entity } from "./entity";

describe("isEntityVisible", () => {
  const baseEntity: Entity = {
    id: "test-node",
    title: "Test Node",
    type: "character",
    tags: [],
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

  it("should show everything in admin mode regardless of tags", () => {
    expect(isEntityVisible({ ...baseEntity, tags: ["hidden"] }, adminSettings)).toBe(true);
    expect(isEntityVisible(baseEntity, adminSettings)).toBe(true);
  });

  describe("Shared Mode: Visible by Default", () => {
    it("should show untagged nodes", () => {
      expect(isEntityVisible(baseEntity, sharedVisibleSettings)).toBe(true);
    });

    it("should hide nodes tagged with 'hidden'", () => {
      expect(isEntityVisible({ ...baseEntity, tags: ["hidden"] }, sharedVisibleSettings)).toBe(false);
    });

    it("should hide nodes even if they also have 'revealed' tag (precedence)", () => {
      expect(isEntityVisible({ ...baseEntity, tags: ["hidden", "revealed"] }, sharedVisibleSettings)).toBe(false);
    });
  });

  describe("Shared Mode: Hidden by Default", () => {
    it("should hide untagged nodes", () => {
      expect(isEntityVisible(baseEntity, sharedHiddenSettings)).toBe(false);
    });

    it("should show nodes tagged with 'revealed'", () => {
      expect(isEntityVisible({ ...baseEntity, tags: ["revealed"] }, sharedHiddenSettings)).toBe(true);
    });

    it("should show nodes with 'visible' label (alias)", () => {
      expect(isEntityVisible({ ...baseEntity, labels: ["visible"] }, sharedHiddenSettings)).toBe(true);
    });

    it("should hide nodes with 'hidden' label", () => {
      expect(isEntityVisible({ ...baseEntity, labels: ["hidden"] }, sharedVisibleSettings)).toBe(false);
    });

    it("should still hide nodes tagged with 'hidden' even if they have 'revealed'", () => {
      expect(isEntityVisible({ ...baseEntity, tags: ["hidden", "revealed"] }, sharedHiddenSettings)).toBe(false);
    });
  });
});
