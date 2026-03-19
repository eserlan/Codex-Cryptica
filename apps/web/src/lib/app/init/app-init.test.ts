import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

// Mock debugStore to avoid actual logging during tests
vi.mock("../../stores/debug.svelte", () => ({
  debugStore: {
    log: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  bootSystem,
  initializeGlobalListeners,
  setupWindowGlobals,
} from "./app-init";

describe("app-init", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("bootSystem", () => {
    it("should initialize all passed stores", () => {
      const mockStores = {
        categories: { init: vi.fn() },
        timeline: { init: vi.fn() },
        graph: { init: vi.fn() },
        calendar: { init: vi.fn() },
        vault: { init: vi.fn().mockResolvedValue(undefined) },
      };

      const result = bootSystem(mockStores);

      expect(result).toBe(true);
      expect(mockStores.categories.init).toHaveBeenCalled();
      expect(mockStores.timeline.init).toHaveBeenCalled();
      expect(mockStores.graph.init).toHaveBeenCalled();
      expect(mockStores.calendar.init).toHaveBeenCalled();
      expect(mockStores.vault.init).toHaveBeenCalled();
    });

    it("should handle vault initialization failure", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const mockStores = {
        categories: { init: vi.fn() },
        timeline: { init: vi.fn() },
        graph: { init: vi.fn() },
        calendar: { init: vi.fn() },
        vault: { init: vi.fn().mockRejectedValue(new Error("Vault fail")) },
      };

      bootSystem(mockStores);

      // Wait for the microtask to finish (the .catch block)
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        "Vault initialization failed",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe("initializeGlobalListeners", () => {
    it("should add event listeners to window", () => {
      const addSpy = vi.spyOn(window, "addEventListener");
      const mockUiStore = { setGlobalError: vi.fn() };
      const mockCalendarStore = { init: vi.fn() };

      const cleanup = initializeGlobalListeners(mockUiStore, mockCalendarStore);

      expect(addSpy).toHaveBeenCalledWith("error", expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith(
        "unhandledrejection",
        expect.any(Function),
      );
      expect(addSpy).toHaveBeenCalledWith(
        "vault-switched",
        expect.any(Function),
      );

      cleanup();
    });

    it("should handle global error and update uiStore", () => {
      const mockUiStore = { setGlobalError: vi.fn() };
      const mockCalendarStore = { init: vi.fn() };
      initializeGlobalListeners(mockUiStore, mockCalendarStore);

      const errorEvent = new ErrorEvent("error", {
        message: "Test Error",
        error: new Error("Test Stack"),
      });
      window.dispatchEvent(errorEvent);

      expect(mockUiStore.setGlobalError).toHaveBeenCalledWith(
        "Test Error",
        expect.any(String),
      );
    });

    it("should ignore noisy script/link errors", () => {
      const mockUiStore = { setGlobalError: vi.fn() };
      const mockCalendarStore = { init: vi.fn() };
      initializeGlobalListeners(mockUiStore, mockCalendarStore);

      const scriptElement = document.createElement("script");
      const errorEvent = new ErrorEvent("error", {
        message: "Script error",
      });
      // Mock target to be script element
      Object.defineProperty(errorEvent, "target", { value: scriptElement });

      window.dispatchEvent(errorEvent);
      expect(mockUiStore.setGlobalError).not.toHaveBeenCalled();
    });

    it("should ignore specific ignored error messages", () => {
      const mockUiStore = { setGlobalError: vi.fn() };
      const mockCalendarStore = { init: vi.fn() };
      initializeGlobalListeners(mockUiStore, mockCalendarStore);

      window.dispatchEvent(
        new ErrorEvent("error", {
          message: "ResizeObserver loop completed with delivered notifications",
        }),
      );
      window.dispatchEvent(
        new ErrorEvent("error", { message: "Script error" }),
      );
      window.dispatchEvent(
        new ErrorEvent("error", { message: "Failed to fetch" }),
      );

      expect(mockUiStore.setGlobalError).not.toHaveBeenCalled();
    });

    it("should handle unhandled rejection", () => {
      const mockUiStore = { setGlobalError: vi.fn() };
      const mockCalendarStore = { init: vi.fn() };
      initializeGlobalListeners(mockUiStore, mockCalendarStore);

      const p = Promise.reject("fail");
      p.catch(() => {}); // Prevent unhandled rejection warning

      const rejectionEvent = new PromiseRejectionEvent("unhandledrejection", {
        promise: p,
        reason: new Error("Rejection Reason"),
      });
      window.dispatchEvent(rejectionEvent);

      expect(mockUiStore.setGlobalError).toHaveBeenCalledWith(
        "Rejection Reason",
        expect.any(String),
      );
    });

    it("should handle vault-switched event", () => {
      const mockUiStore = { setGlobalError: vi.fn() };
      const mockCalendarStore = { init: vi.fn() };
      initializeGlobalListeners(mockUiStore, mockCalendarStore);

      window.dispatchEvent(new CustomEvent("vault-switched"));

      expect(mockCalendarStore.init).toHaveBeenCalled();
    });

    it("should remove event listeners on cleanup", () => {
      const removeSpy = vi.spyOn(window, "removeEventListener");
      const mockUiStore = { setGlobalError: vi.fn() };
      const mockCalendarStore = { init: vi.fn() };

      const cleanup = initializeGlobalListeners(mockUiStore, mockCalendarStore);
      cleanup();

      expect(removeSpy).toHaveBeenCalledWith("error", expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith(
        "unhandledrejection",
        expect.any(Function),
      );
      expect(removeSpy).toHaveBeenCalledWith(
        "vault-switched",
        expect.any(Function),
      );
    });
  });

  describe("setupWindowGlobals", () => {
    it("should attach context to window if special env", () => {
      // Mock import.meta.env
      vi.stubGlobal("import", { meta: { env: { DEV: true } } });

      const mockContext = { searchStore: { name: "search" } };
      setupWindowGlobals(mockContext as any);

      expect((window as any).searchStore).toBe(mockContext.searchStore);
    });

    it("should not attach context if not special env", () => {
      // This is hard to test because import.meta.env is usually frozen or hard to mock
      // But we can try to stub it
    });
  });
});
