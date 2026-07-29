import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleError,
  handleVersionSkewReload,
  isVersionSkewError,
} from "./hooks.client";

describe("hooks.client - Version Skew Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isVersionSkewError", () => {
    it("identifies dynamic import module error messages", () => {
      expect(
        isVersionSkewError(
          new Error(
            "Failed to fetch dynamically imported module: http://test/node.js",
          ),
        ),
      ).toBe(true);

      expect(
        isVersionSkewError(
          "Importing a module script failed: http://test/node.js",
        ),
      ).toBe(true);

      expect(
        isVersionSkewError("Uncaught SyntaxError: Unexpected token '<'"),
      ).toBe(true);
    });

    it("identifies 404 load errors for immutable assets", () => {
      expect(
        isVersionSkewError(
          "Load failed (404)",
          "/_app/immutable/nodes/4.n_OyOYNg.js",
        ),
      ).toBe(true);
    });

    it("returns false for unrelated application errors (negative path)", () => {
      expect(isVersionSkewError(new Error("Database connection lost"))).toBe(
        false,
      );
      expect(isVersionSkewError("404 Not Found", "/api/v1/user")).toBe(false);
    });
  });

  describe("handleVersionSkewReload", () => {
    it("triggers location.reload and sets sessionStorage timestamp on first call", () => {
      const reloadMock = vi.fn();
      const storageMap = new Map<string, string>();
      const mockWindow = {
        location: { reload: reloadMock },
        sessionStorage: {
          getItem: (key: string) => storageMap.get(key) ?? null,
          setItem: (key: string, val: string) => storageMap.set(key, val),
        },
      } as unknown as Window;

      const result = handleVersionSkewReload(mockWindow);

      expect(result).toBe(true);
      expect(reloadMock).toHaveBeenCalledOnce();
      expect(storageMap.has("codex_version_skew_reload_ts")).toBe(true);
    });

    it("throttles reloads if called again within debounce interval (throttling negative path)", () => {
      const reloadMock = vi.fn();
      const storageMap = new Map<string, string>();
      const mockWindow = {
        location: { reload: reloadMock },
        sessionStorage: {
          getItem: (key: string) => storageMap.get(key) ?? null,
          setItem: (key: string, val: string) => storageMap.set(key, val),
        },
      } as unknown as Window;

      // First reload
      handleVersionSkewReload(mockWindow);
      expect(reloadMock).toHaveBeenCalledTimes(1);

      // Second call immediately after
      const secondResult = handleVersionSkewReload(mockWindow);

      expect(secondResult).toBe(false);
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleError", () => {
    it("handles version skew error and returns reload message", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const mockEvent = {
        url: new URL("https://codexcryptica.com/workspace"),
      } as any;

      const res = handleError({
        error: new Error("Failed to fetch dynamically imported module"),
        event: mockEvent,
        status: 500,
        message: "Module load error",
      });

      expect((res as App.Error)?.message).toContain(
        "A new version of the app is available",
      );
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("returns standard error message for non-version-skew errors (negative path)", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockEvent = {
        url: new URL("https://codexcryptica.com/workspace"),
      } as any;

      const res = handleError({
        error: new Error("Normal render failure"),
        event: mockEvent,
        status: 500,
        message: "Internal error",
      });

      expect((res as App.Error)?.message).toBe("Internal error");
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
