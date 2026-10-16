import type { HexRecord } from "hex-crawl-engine";
/** @vitest-environment jsdom */

import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HexCrawlOverlay from "./HexCrawlOverlay.svelte";

// Gridsize 50 with a 100px offset puts hex 0,0 at (100, 100): well inside the viewport.
const GRID = {
  orientation: "pointy",
  size: 50,
  offsetX: 100,
  offsetY: 100,
} as const;

const records: Record<string, HexRecord> = {
  "0,0": {
    terrain: { kind: "preset", id: "forest" },
    explored: true,
    updatedAt: 1,
  },
  "1,0": { terrain: { kind: "custom", label: "Ash fields" }, updatedAt: 1 },
  "40,40": { terrain: { kind: "preset", id: "plains" }, updatedAt: 1 },
};

function setup(overrides: Record<string, unknown> = {}) {
  return render(HexCrawlOverlay, {
    records,
    visible: true,
    showTerrainIcons: true,
    gridConfig: GRID,
    project: (point: { x: number; y: number }) => point,
    unproject: (point: { x: number; y: number }) => point,
    viewport: { width: 800, height: 600 },
    zoom: 1,
    ...overrides,
  });
}

describe("HexCrawlOverlay", () => {
  it("draws a terrain icon only for hexes with terrain inside the viewport", () => {
    const { container } = setup();

    expect(container.querySelectorAll('[class*="lucide--trees"]')).toHaveLength(
      1,
    );
    // The plains hex at 40,40 is far outside the viewport, so it is culled.
    expect(container.querySelectorAll('[class*="lucide--wheat"]')).toHaveLength(
      0,
    );
  });

  it("uses the map pin icon for custom terrain", () => {
    const { container } = setup();

    expect(
      container.querySelectorAll('[class*="lucide--map-pin"]'),
    ).toHaveLength(1);
  });

  it("draws no terrain icons while the toggle is off", () => {
    const { container } = setup({ showTerrainIcons: false });

    expect(container.querySelectorAll('[class*="lucide--trees"]')).toHaveLength(
      0,
    );
    expect(
      container.querySelectorAll('[class*="lucide--map-pin"]'),
    ).toHaveLength(0);
  });

  it("marks explored hexes with the explored marker", () => {
    const { container } = setup({ showTerrainIcons: false });

    expect(
      container.querySelectorAll('[data-testid="hex-explored-marker"]'),
    ).toHaveLength(1);
    const marker = container.querySelector(
      '[data-testid="hex-explored-marker"]',
    );
    expect(
      marker
        ?.querySelector('[class*="circle-check-big"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("renders nothing for players, guests and Player View (FR-041)", () => {
    const { container } = setup({ visible: false });

    expect(
      container.querySelector('[data-testid="hex-crawl-overlay"]'),
    ).toBeNull();
    expect(container.querySelectorAll('[class*="lucide--trees"]')).toHaveLength(
      0,
    );
  });

  it("skips an excessively dense viewport instead of rendering an unbounded overlay", () => {
    const project = vi.fn((point: { x: number; y: number }) => point);
    const denseRecords: Record<string, HexRecord> = {};
    for (let q = 0; q < 25_001; q++) {
      denseRecords[`${q},0`] = { updatedAt: 1 };
    }
    const { container } = setup({
      records: denseRecords,
      gridConfig: { ...GRID, size: 5 },
      project,
      viewport: { width: 10_000, height: 10_000 },
    });

    expect(project).not.toHaveBeenCalled();
    expect(
      container.querySelectorAll('[data-testid="hex-explored-marker"]'),
    ).toHaveLength(0);
  });
});
