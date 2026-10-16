import { describe, expect, it } from "vitest";
import { render } from "@testing-library/svelte";
import HexCrawlOverlay from "./HexCrawlOverlay.svelte";
import type { HexRecord } from "hex-crawl-engine";

/**
 * SC-002 performance check. Rendering only what is in view is what keeps large
 * maps fast, so this test checks the culling, not wall-clock time. Timing in
 * jsdom is indicative only; the real frame budget is measured in a browser.
 */
const GRID = {
  orientation: "pointy",
  size: 20,
  offsetX: 0,
  offsetY: 0,
} as const;

function twoThousandHexes(): Record<string, HexRecord> {
  const records: Record<string, HexRecord> = {};
  for (let q = 0; q < 100; q++) {
    for (let r = 0; r < 20; r++) {
      records[`${q},${r}`] = {
        terrain: { kind: "preset", id: "forest" },
        updatedAt: 1,
      };
    }
  }
  return records;
}

describe("HexCrawlOverlay performance (T092, SC-002)", () => {
  it("renders only the hexes near the viewport when a map has 2,000 records", () => {
    const records = twoThousandHexes();
    const started = performance.now();
    const { container } = render(HexCrawlOverlay, {
      records,
      visible: true,
      showTerrainIcons: true,
      gridConfig: GRID,
      project: (p: { x: number; y: number }) => p,
      viewport: { width: 800, height: 600 },
      zoom: 1,
    });
    const elapsed = performance.now() - started;

    const rendered = container.querySelectorAll('span[class*="icon-["]').length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(2000 / 4);
    expect(elapsed).toBeLessThan(2000);
  });

  it("renders nothing for hidden records (negative path)", () => {
    const { container } = render(HexCrawlOverlay, {
      records: twoThousandHexes(),
      visible: false,
      showTerrainIcons: true,
      gridConfig: GRID,
      project: (p: { x: number; y: number }) => p,
      viewport: { width: 800, height: 600 },
      zoom: 1,
    });
    expect(container.querySelectorAll('span[class*="icon-["]').length).toBe(0);
  });
});
