import { beforeEach, describe, expect, it } from "vitest";
import {
  clampRecentLimit,
  getRecentLimitStorageKey,
  persistRecentLimit,
  readRecentLimit,
} from "./front-page-prefs";
import { DEFAULT_RECENT_LIMIT } from "./front-page-constants";

describe("front-page-prefs", () => {
  describe("getRecentLimitStorageKey", () => {
    it("returns a vault-scoped key", () => {
      expect(getRecentLimitStorageKey("vault-1")).toBe(
        "codex_front_page_recent_limit:vault-1",
      );
      expect(getRecentLimitStorageKey("my-world")).toBe(
        "codex_front_page_recent_limit:my-world",
      );
    });
  });

  describe("clampRecentLimit", () => {
    it("clamps values below minimum to MIN", () => {
      expect(clampRecentLimit(0)).toBe(1);
      expect(clampRecentLimit(-5)).toBe(1);
    });

    it("clamps values above maximum to MAX", () => {
      expect(clampRecentLimit(25)).toBe(24);
      expect(clampRecentLimit(100)).toBe(24);
    });

    it("returns the default for NaN", () => {
      expect(clampRecentLimit(NaN)).toBe(DEFAULT_RECENT_LIMIT);
    });

    it("returns the value when in range", () => {
      expect(clampRecentLimit(6)).toBe(6);
      expect(clampRecentLimit(1)).toBe(1);
      expect(clampRecentLimit(24)).toBe(24);
    });
  });

  describe("readRecentLimit", () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it("returns the default when no key exists", () => {
      expect(readRecentLimit("vault-1")).toBe(DEFAULT_RECENT_LIMIT);
    });

    it("returns the stored value when valid", () => {
      window.localStorage.setItem(
        "codex_front_page_recent_limit:vault-1",
        "10",
      );
      expect(readRecentLimit("vault-1")).toBe(10);
    });

    it("returns the default when the stored value is not a number", () => {
      window.localStorage.setItem(
        "codex_front_page_recent_limit:vault-1",
        "abc",
      );
      expect(readRecentLimit("vault-1")).toBe(DEFAULT_RECENT_LIMIT);
    });

    it("clamps the stored value to the allowed range", () => {
      window.localStorage.setItem(
        "codex_front_page_recent_limit:vault-1",
        "50",
      );
      expect(readRecentLimit("vault-1")).toBe(24);
    });
  });

  describe("persistRecentLimit", () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it("writes the limit to localStorage", () => {
      persistRecentLimit("vault-1", 8);
      expect(
        window.localStorage.getItem("codex_front_page_recent_limit:vault-1"),
      ).toBe("8");
    });
  });
});
