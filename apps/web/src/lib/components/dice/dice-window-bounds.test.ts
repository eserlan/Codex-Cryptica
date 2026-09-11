import { describe, expect, it, beforeEach } from "vitest";
import {
  clampBounds,
  getCenteredBounds,
  getViewportSize,
  loadSavedBounds,
  saveBounds,
  DEFAULT_WINDOW_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
  WINDOW_MARGIN,
  PLAY_TOOLS_WINDOW_STORAGE_KEY,
} from "./dice-window-bounds";

describe("dice-window-bounds", () => {
  const mockViewport = { width: 1280, height: 800 };

  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("clampBounds", () => {
    it("preserves bounds when fully inside viewport", () => {
      const bounds = { x: 100, y: 100, width: 400, height: 500 };
      const clamped = clampBounds(bounds, mockViewport);

      expect(clamped).toEqual(bounds);
    });

    it("clamps position when exceeding right/bottom edges", () => {
      const bounds = { x: 1200, y: 750, width: 400, height: 500 };
      const clamped = clampBounds(bounds, mockViewport);

      expect(clamped.x).toBe(mockViewport.width - 400 - WINDOW_MARGIN);
      expect(clamped.y).toBe(mockViewport.height - 500 - WINDOW_MARGIN);
      expect(clamped.width).toBe(400);
      expect(clamped.height).toBe(500);
    });

    it("clamps position when negative (top/left edges)", () => {
      const bounds = { x: -50, y: -20, width: 400, height: 500 };
      const clamped = clampBounds(bounds, mockViewport);

      expect(clamped.x).toBe(WINDOW_MARGIN);
      expect(clamped.y).toBe(WINDOW_MARGIN);
    });

    it("enforces minimum width and height", () => {
      const bounds = { x: 50, y: 50, width: 100, height: 150 };
      const clamped = clampBounds(bounds, mockViewport);

      expect(clamped.width).toBe(MIN_WINDOW_WIDTH);
      expect(clamped.height).toBe(MIN_WINDOW_HEIGHT);
    });

    it("handles very small viewports gracefully", () => {
      const smallViewport = { width: 300, height: 350 };
      const bounds = { x: 50, y: 50, width: 500, height: 600 };
      const clamped = clampBounds(bounds, smallViewport);

      expect(clamped.width).toBe(smallViewport.width - WINDOW_MARGIN * 2);
      expect(clamped.height).toBe(smallViewport.height - WINDOW_MARGIN * 2);
      expect(clamped.x).toBe(WINDOW_MARGIN);
      expect(clamped.y).toBe(WINDOW_MARGIN);
    });
  });

  describe("getCenteredBounds", () => {
    it("calculates centered position for default dimensions", () => {
      const centered = getCenteredBounds(
        { width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT },
        mockViewport,
      );

      expect(centered.width).toBe(DEFAULT_WINDOW_WIDTH);
      expect(centered.height).toBe(DEFAULT_WINDOW_HEIGHT);
      expect(centered.x).toBe(
        Math.round((mockViewport.width - DEFAULT_WINDOW_WIDTH) / 2),
      );
      expect(centered.y).toBe(
        Math.round((mockViewport.height - DEFAULT_WINDOW_HEIGHT) / 2),
      );
    });
  });

  describe("loadSavedBounds & saveBounds", () => {
    it("returns centered default when no storage exists", () => {
      const bounds = loadSavedBounds(null, mockViewport);
      expect(bounds.width).toBe(DEFAULT_WINDOW_WIDTH);
      expect(bounds.height).toBe(DEFAULT_WINDOW_HEIGHT);
      expect(bounds.x).toBe(
        Math.round((mockViewport.width - DEFAULT_WINDOW_WIDTH) / 2),
      );
    });

    it("loads and clamps valid saved bounds from localStorage", () => {
      const saved = { x: 200, y: 150, width: 450, height: 550 };
      saveBounds(saved, window.localStorage);

      const loaded = loadSavedBounds(window.localStorage, mockViewport);
      expect(loaded).toEqual(saved);
    });

    it("falls back to centered default when storage contains invalid JSON or NaN", () => {
      window.localStorage.setItem(
        PLAY_TOOLS_WINDOW_STORAGE_KEY,
        "invalid-json",
      );
      const loaded1 = loadSavedBounds(window.localStorage, mockViewport);
      expect(loaded1.width).toBe(DEFAULT_WINDOW_WIDTH);

      window.localStorage.setItem(
        PLAY_TOOLS_WINDOW_STORAGE_KEY,
        JSON.stringify({ x: "bad", y: 100 }),
      );
      const loaded2 = loadSavedBounds(window.localStorage, mockViewport);
      expect(loaded2.width).toBe(DEFAULT_WINDOW_WIDTH);
    });

    it("clamps stored bounds when loaded on a smaller viewport", () => {
      const saved = { x: 1000, y: 600, width: 500, height: 600 };
      saveBounds(saved, window.localStorage);

      const smallViewport = { width: 800, height: 600 };
      const loaded = loadSavedBounds(window.localStorage, smallViewport);

      expect(loaded.x + loaded.width).toBeLessThanOrEqual(
        smallViewport.width - WINDOW_MARGIN,
      );
      expect(loaded.y + loaded.height).toBeLessThanOrEqual(
        smallViewport.height - WINDOW_MARGIN,
      );
    });
  });

  describe("getViewportSize", () => {
    it("returns window dimensions in browser environment", () => {
      const vp = getViewportSize();
      expect(vp.width).toBeGreaterThan(0);
      expect(vp.height).toBeGreaterThan(0);
    });
  });
});
