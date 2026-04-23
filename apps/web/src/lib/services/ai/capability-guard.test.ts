import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertAIEnabled, isAIEnabled } from "./capability-guard";

vi.mock("$app/environment", () => ({
  browser: true,
}));

describe("capability-guard", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("assertAIEnabled", () => {
    it("should not throw if aiDisabled is false", () => {
      localStorage.setItem("codex_ai_disabled", "false");
      expect(() => assertAIEnabled()).not.toThrow();
    });

    it("should throw if aiDisabled is true", () => {
      localStorage.setItem("codex_ai_disabled", "true");
      expect(() => assertAIEnabled()).toThrow("AI features are disabled.");
    });
  });

  describe("isAIEnabled", () => {
    it("should return true if aiDisabled is false", () => {
      localStorage.setItem("codex_ai_disabled", "false");
      expect(isAIEnabled()).toBe(true);
    });

    it("should return false if aiDisabled is true", () => {
      localStorage.setItem("codex_ai_disabled", "true");
      expect(isAIEnabled()).toBe(false);
    });

    it("should return false if codex_ai_lite_mode is true", () => {
      localStorage.setItem("codex_ai_lite_mode", "true");
      expect(isAIEnabled()).toBe(false);
    });
  });
});
