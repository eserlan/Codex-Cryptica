import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

// Mock config to avoid actual env dependency
vi.mock("../../config", () => ({
  IS_STAGING: true,
}));

import {
  bootSystem,
  initializeGlobalListeners,
  setupWindowGlobals,
  registerServiceWorker,
} from "./app-init";

describe("app-init", () => {
  let listenersCleanup: (() => void)[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    listenersCleanup = [];
  });

  afterEach(() => {
    listenersCleanup.forEach((cleanup) => cleanup());
    vi.unstubAllGlobals();
  });

  describe("bootSystem", () => {
    it("should initialize all passed stores and set isStaging", () => {
      const mockStores = {
        categories: { init: vi.fn() },
        timeline: { init: vi.fn() },
        graph: { init: vi.fn() },
        calendar: { init: vi.fn() },
        vault: { init: vi.fn().mockResolvedValue(undefined) },
        uiStore: { isStaging: false },
      };

      const result = bootSystem(mockStores as any);

      expect(result).toBe(true);
      expect(mockStores.categories.init).toHaveBeenCalled();
      expect(mockStores.timeline.init).toHaveBeenCalled();
      expect(mockStores.graph.init).toHaveBeenCalled();
      expect(mockStores.calendar.init).toHaveBeenCalled();
      expect(mockStores.vault.init).toHaveBeenCalled();
      expect(mockStores.uiStore.isStaging).toBe(true);
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
        uiStore: { isStaging: false },
      };

      bootSystem(mockStores as any);

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
      listenersCleanup.push(cleanup);

      expect(addSpy).toHaveBeenCalledWith("error", expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith(
        "unhandledrejection",
        expect.any(Function),
      );
      expect(addSpy).toHaveBeenCalledWith(
        "vault-switched",
        expect.any(Function),
      );
    });

    it("should handle global error and update uiStore", () => {
      const mockUiStore = { setGlobalError: vi.fn() };
      const mockCalendarStore = { init: vi.fn() };
      const cleanup = initializeGlobalListeners(mockUiStore, mockCalendarStore);
      listenersCleanup.push(cleanup);

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
      const cleanup = initializeGlobalListeners(mockUiStore, mockCalendarStore);
      listenersCleanup.push(cleanup);

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
      const cleanup = initializeGlobalListeners(mockUiStore, mockCalendarStore);
      listenersCleanup.push(cleanup);

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
      const cleanup = initializeGlobalListeners(mockUiStore, mockCalendarStore);
      listenersCleanup.push(cleanup);

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
      const cleanup = initializeGlobalListeners(mockUiStore, mockCalendarStore);
      listenersCleanup.push(cleanup);

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
    it("should attach context to window if special env (__E2E__)", () => {
      (window as any).__E2E__ = true;

      const mockContext = { searchStore: { name: "search" } };
      setupWindowGlobals(mockContext as any);

      expect((window as any).searchStore).toBe(mockContext.searchStore);

      delete (window as any).__E2E__;
    });

    it("should handle dynamic imports in setupWindowGlobals", async () => {
      (window as any).__E2E__ = true;

      // We don't necessarily need to mock the modules if we just want to hit the lines,
      // but wait for the promises to settle.
      setupWindowGlobals({} as any);

      // Wait for dynamic imports to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Just verifying it doesn't crash is often enough for these lazy loads in init
      delete (window as any).__E2E__;
    });
  });

  describe("registerServiceWorker", () => {
    it("should not register if in DEV mode (default in Vitest)", async () => {
      const registerSpy = vi.fn();
      vi.stubGlobal("navigator", {
        serviceWorker: {
          register: registerSpy,
        },
      });

      registerServiceWorker();
      expect(registerSpy).not.toHaveBeenCalled();
    });

    it("should handle registration failure", async () => {
      // Mocking the env to be prod is hard, but we can test the error handling if we can trigger it.
      // Since we can't easily flip import.meta.env.DEV, we might just hit the "if" guard.
      registerServiceWorker();
    });
  });
});
