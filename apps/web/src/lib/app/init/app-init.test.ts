import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: vi.fn((p: string) => p),
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

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: {
    setGlobalError: vi.fn(),
    confirm: vi.fn(),
  },
}));

vi.mock("#lib/stores/ui/session-mode.svelte.js", () => ({
  sessionModeStore: {
    isStaging: false,
  },
}));

vi.mock("#lib/stores/calendar.svelte.js", () => ({
  calendarStore: {
    init: vi.fn(),
  },
}));

vi.mock("#lib/stores/system-profile.svelte.js", () => ({
  systemProfileStore: { init: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("#lib/stores/timeline.svelte.js", () => ({
  timelineStore: {
    resetVaultGuard: vi.fn(),
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  bootSystem,
  initializeGlobalListeners,
  setupWindowGlobals,
} from "./app-init";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { calendarStore } from "#lib/stores/calendar.svelte.js";
import { timelineStore } from "#lib/stores/timeline.svelte.js";
import { systemProfileStore } from "#lib/stores/system-profile.svelte.js";
import { vault } from "#lib/stores/vault.svelte.js";
import { resolveAITemplate } from "@codex/ai-engine";
import { entityTemplateStore } from "#lib/stores/entity-templates/entity-template-store.svelte.js";
import { GENERIC_TEMPLATES } from "schema";
import { resolve } from "$app/paths";

describe("app-init", () => {
  let listenersCleanup: (() => void)[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolve).mockImplementation((path) =>
      path === "/(app)" ? "/" : path,
    );
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

    it("gives the AI engine the vault-aware template resolver", () => {
      const mockStores = {
        categories: { init: vi.fn() },
        vault: { init: vi.fn().mockResolvedValue(undefined) },
        sessionModeStore: { isStaging: false },
      };
      bootSystem(mockStores as any);

      // Before any vault templates load, the built-in template is used.
      expect(resolveAITemplate("character")).toBe(GENERIC_TEMPLATES.character);

      const spy = vi
        .spyOn(entityTemplateStore, "resolveSync")
        .mockReturnValue("## From the vault\n");
      expect(resolveAITemplate("character", "fantasy")).toBe(
        "## From the vault\n",
      );
      expect(spy).toHaveBeenCalledWith("character", "fantasy");
      spy.mockRestore();
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

    it("should ignore noisy script/link errors unless they are immutable version assets", () => {
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

    it("should handle version skew error on immutable asset script load failure", () => {
      const mockCalendarStore = { init: vi.fn() };
      const cleanup = initializeGlobalListeners(mockCalendarStore);
      listenersCleanup.push(cleanup);

      const scriptElement = document.createElement("script");
      scriptElement.src =
        "https://codexcryptica.com/_app/immutable/nodes/4.n_OyOYNg.js";
      const errorEvent = new ErrorEvent("error", {
        message: "Load failed",
      });
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

    it("loads the switched-to vault's game system profile (#3943)", async () => {
      const spy = vi
        .spyOn(vault, "activeVaultId", "get")
        .mockReturnValue("vault-7");
      listenersCleanup.push(initializeGlobalListeners({ init: vi.fn() }));

      window.dispatchEvent(new CustomEvent("vault-switched"));
      await vi.waitFor(() => {
        expect(systemProfileStore.init).toHaveBeenCalledWith("vault-7");
      });
      spy.mockRestore();
    });

    it("still loads the calendar when the game system profile fails (negative)", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(systemProfileStore.init).mockRejectedValueOnce(
        new Error("profile read failed"),
      );
      listenersCleanup.push(initializeGlobalListeners({ init: vi.fn() }));

      window.dispatchEvent(new CustomEvent("vault-switched"));
      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "[AppInit] Failed to load the vault's game system profile:",
          expect.any(Error),
        );
      });
      expect(calendarStore.init).toHaveBeenCalled();
      consoleSpy.mockRestore();
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
});
