import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertAIEnabled, isAIEnabled } from "./capability-guard";
import { uiStore } from "../../stores/ui.svelte";

vi.mock("../../stores/ui.svelte", () => ({
  uiStore: {
    aiDisabled: false,
  },
}));

describe("capability-guard", () => {
  beforeEach(() => {
    uiStore.aiDisabled = false;
  });

  describe("assertAIEnabled", () => {
    it("should not throw if aiDisabled is false", () => {
      expect(() => assertAIEnabled()).not.toThrow();
    });

    it("should throw if aiDisabled is true", () => {
      uiStore.aiDisabled = true;
      expect(() => assertAIEnabled()).toThrow("AI features are disabled.");
    });
  });

  describe("isAIEnabled", () => {
    it("should return true if aiDisabled is false", () => {
      expect(isAIEnabled()).toBe(true);
    });

    it("should return false if aiDisabled is true", () => {
      uiStore.aiDisabled = true;
      expect(isAIEnabled()).toBe(false);
    });
  });
});
