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

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    setGlobalError: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: {
    isStaging: false,
  },
}));

vi.mock("$lib/stores/calendar.svelte", () => ({
  calendarStore: {
    init: vi.fn(),
  },
}));

vi.mock("$lib/stores/timeline.svelte", () => ({
  timelineStore: {
    resetVaultGuard: vi.fn(),
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  bootSystem,
  initializeGlobalListeners,
  setupWindowGlobals,
  registerServiceWorker,
} from "./app-init";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { calendarStore } from "$lib/stores/calendar.svelte";
import { timelineStore } from "$lib/stores/timeline.svelte";

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
    it("should initialize core stores and set isStaging", () => {
      const mockStores = {
        categories: { init: vi.fn() },
        timeline: { init: vi.fn() },
        graph: { init: vi.fn() },
        calendar: { init: vi.fn() },
        vault: { init: vi.fn().mockResolvedValue(undefined) },
        sessionModeStore: { isStaging: false },
      };

      const result = bootSystem(mockStores as any);

      expect(result).toBe(true);
      expect(mockStores.categories.init).toHaveBeenCalled();
      expect(mockStores.timeline.init).not.toHaveBeenCalled();
      expect(mockStores.graph.init).not.toHaveBeenCalled();
      expect(mockStores.calendar.init).not.toHaveBeenCalled();
      expect(mockStores.vault.init).toHaveBeenCalled();
      expect(mockStores.sessionModeStore.isStaging).toBe(true);
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
        sessionModeStore: { isStaging: false },
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
      const mockCalendarStore = { init: vi.fn() };

      const cleanup = initializeGlobalListeners(mockCalendarStore);
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
      const mockCalendarStore = { init: vi.fn() };
      const cleanup = initializeGlobalListeners(mockCalendarStore);
      listenersCleanup.push(cleanup);

      const errorEvent = new ErrorEvent("error", {
        message: "Test Error",
        error: new Error("Test Stack"),
      });
      window.dispatchEvent(errorEvent);

      expect(notificationStore.setGlobalError).toHaveBeenCalledWith(
        "Test Error",
        expect.any(String),
      );
    });

    it("should ignore noisy script/link errors", () => {
      const mockCalendarStore = { init: vi.fn() };
      const cleanup = initializeGlobalListeners(mockCalendarStore);
      listenersCleanup.push(cleanup);

      const scriptElement = document.createElement("script");
      const errorEvent = new ErrorEvent("error", {
        message: "Script error",
      });
      // Mock target to be script element
      Object.defineProperty(errorEvent, "target", { value: scriptElement });

      window.dispatchEvent(errorEvent);
      expect(notificationStore.setGlobalError).not.toHaveBeenCalled();
    });

    it("should ignore specific ignored error messages", () => {
      const mockCalendarStore = { init: vi.fn() };
      const cleanup = initializeGlobalListeners(mockCalendarStore);
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

      expect(notificationStore.setGlobalError).not.toHaveBeenCalled();
    });

    it("should handle unhandled rejection", () => {
      const mockCalendarStore = { init: vi.fn() };
      const cleanup = initializeGlobalListeners(mockCalendarStore);
      listenersCleanup.push(cleanup);

      const p = Promise.reject("fail");
      p.catch(() => {}); // Prevent unhandled rejection warning

      const rejectionEvent = new PromiseRejectionEvent("unhandledrejection", {
        promise: p,
        reason: new Error("Rejection Reason"),
      });
      window.dispatchEvent(rejectionEvent);

      expect(notificationStore.setGlobalError).toHaveBeenCalledWith(
        "Rejection Reason",
        expect.any(String),
      );
    });

    it("should lazy-load calendar handling for vault-switched event", async () => {
      const mockCalendarStore = { init: vi.fn() };
      const cleanup = initializeGlobalListeners(mockCalendarStore);
      listenersCleanup.push(cleanup);

      window.dispatchEvent(new CustomEvent("vault-switched"));
      await vi.waitFor(() => {
        expect(calendarStore.init).toHaveBeenCalled();
      });

      expect(timelineStore.resetVaultGuard).toHaveBeenCalled();
      expect(timelineStore.init).toHaveBeenCalled();
      expect(mockCalendarStore.init).not.toHaveBeenCalled();
    });

    it("should remove event listeners on cleanup", () => {
      const removeSpy = vi.spyOn(window, "removeEventListener");
      const mockCalendarStore = { init: vi.fn() };

      const cleanup = initializeGlobalListeners(mockCalendarStore);
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
    it("should attach context to window in special env (DEV)", () => {
      const mockContext = { searchStore: { name: "search" } };
      setupWindowGlobals(mockContext as any);

      expect((window as any).searchStore).toBe(mockContext.searchStore);
    });

    it("should handle dynamic imports in setupWindowGlobals", async () => {
      // We don't necessarily need to mock the modules if we just want to hit the lines,
      // but wait for the promises to settle.
      setupWindowGlobals({} as any);

      // Wait for dynamic imports to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Just verifying it doesn't crash is often enough for these lazy loads in init
    });
  });

  describe("registerServiceWorker", () => {
    it("should not register if in DEV mode (default in Vitest)", async () => {
      const registerSpy = vi.fn();
      const mockDocument = {
        readyState: "complete",
        visibilityState: "visible",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      const mockWindow = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;

      registerServiceWorker({
        document: mockDocument,
        navigator: {
          serviceWorker: {
            register: registerSpy,
          },
        } as any,
        window: mockWindow,
        isDev: true,
      });

      expect(registerSpy).not.toHaveBeenCalled();
    });

    it("should register immediately when the document is active", () => {
      const registerSpy = vi.fn().mockResolvedValue(undefined);
      const mockDocument = {
        readyState: "complete",
        visibilityState: "visible",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      const mockWindow = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;

      registerServiceWorker({
        document: mockDocument,
        navigator: {
          serviceWorker: {
            register: registerSpy,
          },
        } as any,
        window: mockWindow,
        isDev: false,
      });

      expect(registerSpy).toHaveBeenCalledWith("/service-worker.js");
    });

    it("should reload once when a new worker takes control", () => {
      const registerSpy = vi.fn().mockResolvedValue(undefined);
      const serviceWorkerListeners = new Map<string, EventListener>();
      const reloadSpy = vi.fn();
      const mockDocument = {
        readyState: "complete",
        visibilityState: "visible",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      const mockWindow = {
        location: { reload: reloadSpy },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;

      registerServiceWorker({
        document: mockDocument,
        navigator: {
          serviceWorker: {
            controller: {},
            register: registerSpy,
            addEventListener: vi.fn((event: string, handler: EventListener) => {
              serviceWorkerListeners.set(event, handler);
            }),
          },
        } as any,
        window: mockWindow,
        isDev: false,
      });

      const controllerChange = serviceWorkerListeners.get("controllerchange");
      expect(controllerChange).toBeDefined();

      controllerChange?.(new Event("controllerchange"));
      controllerChange?.(new Event("controllerchange"));

      expect(reloadSpy).toHaveBeenCalledOnce();
    });

    it("should not reload when the first worker takes control", () => {
      const serviceWorkerListeners = new Map<string, EventListener>();
      const reloadSpy = vi.fn();
      const serviceWorker = {
        controller: null as ServiceWorker | null,
        register: vi.fn().mockResolvedValue(undefined),
        addEventListener: vi.fn((event: string, handler: EventListener) => {
          serviceWorkerListeners.set(event, handler);
        }),
      };

      registerServiceWorker({
        document: {
          readyState: "complete",
          visibilityState: "visible",
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        } as any,
        navigator: { serviceWorker } as any,
        window: {
          location: { reload: reloadSpy },
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        } as any,
        isDev: false,
      });

      serviceWorker.controller = {} as ServiceWorker;
      serviceWorkerListeners.get("controllerchange")?.(
        new Event("controllerchange"),
      );

      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it("should defer registration until the document becomes active", () => {
      const registerSpy = vi.fn().mockResolvedValue(undefined);
      const docListeners = new Map<string, EventListener>();
      const windowListeners = new Map<string, EventListener>();
      const mockDocument = {
        readyState: "loading",
        visibilityState: "hidden",
        prerendering: true,
        addEventListener: vi.fn((event: string, handler: EventListener) => {
          docListeners.set(event, handler);
        }),
        removeEventListener: vi.fn((event: string) => {
          docListeners.delete(event);
        }),
      } as any;
      const mockWindow = {
        addEventListener: vi.fn((event: string, handler: EventListener) => {
          windowListeners.set(event, handler);
        }),
        removeEventListener: vi.fn((event: string) => {
          windowListeners.delete(event);
        }),
      } as any;

      registerServiceWorker({
        document: mockDocument,
        navigator: {
          serviceWorker: {
            register: registerSpy,
          },
        } as any,
        window: mockWindow,
        isDev: false,
      });

      expect(registerSpy).not.toHaveBeenCalled();

      mockDocument.readyState = "complete";
      mockDocument.visibilityState = "visible";
      mockDocument.prerendering = false;
      const visibilityHandler = docListeners.get("visibilitychange");

      expect(visibilityHandler).toBeDefined();
      visibilityHandler?.(new Event("visibilitychange"));

      expect(registerSpy).toHaveBeenCalledWith("/service-worker.js");
      expect(mockDocument.removeEventListener).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        "pageshow",
        expect.any(Function),
      );
    });

    it("should handle registration failure", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const registerSpy = vi
        .fn()
        .mockRejectedValue(new Error("Service worker failed"));
      const mockDocument = {
        readyState: "complete",
        visibilityState: "visible",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      const mockWindow = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;

      registerServiceWorker({
        document: mockDocument,
        navigator: {
          serviceWorker: {
            register: registerSpy,
          },
        } as any,
        window: mockWindow,
        isDev: false,
      });

      await Promise.resolve();

      expect(warnSpy).toHaveBeenCalledWith(
        "Service Worker registration failed:",
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });
  });
});
