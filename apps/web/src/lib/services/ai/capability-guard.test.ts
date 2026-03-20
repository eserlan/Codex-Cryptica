import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertAIEnabled, isAIEnabled } from "./capability-guard";
import { uiStore } from "../../stores/ui.svelte";

vi.mock("../../stores/ui.svelte", () => ({
  uiStore: {
    liteMode: false,
  },
}));

describe("capability-guard", () => {
  beforeEach(() => {
    uiStore.liteMode = false;
  });

  describe("assertAIEnabled", () => {
    it("should not throw if liteMode is false", () => {
      expect(() => assertAIEnabled()).not.toThrow();
    });

    it("should throw if liteMode is true", () => {
      uiStore.liteMode = true;
      expect(() => assertAIEnabled()).toThrow(
        "AI features are disabled in Lite Mode.",
      );
    });
  });

  describe("isAIEnabled", () => {
    it("should return true if liteMode is false", () => {
      expect(isAIEnabled()).toBe(true);
    });

    it("should return false if liteMode is true", () => {
      uiStore.liteMode = true;
      expect(isAIEnabled()).toBe(false);
    });
  });
});
