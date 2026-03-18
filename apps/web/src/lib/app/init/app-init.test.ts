import { describe, it, expect, vi } from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
}));

import { bootSystem, initializeGlobalListeners } from "./app-init";

describe("app-init", () => {
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
});
