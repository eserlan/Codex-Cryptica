/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pointToHex } from "map-engine";
import HexThisHexButton from "./HexThisHexButton.svelte";

const storeMock = vi.hoisted(() => ({
  current: null as null | {
    isEnabled: (id: string) => boolean;
    openHex: (mapId: string, hex: unknown, opener?: HTMLElement) => void;
  },
}));
vi.mock("./hex-crawl-context", () => ({
  useHexCrawlStore: () => storeMock.current,
}));

const GRID = {
  gridType: "hex-pointy",
  gridSize: 50,
  gridOffsetX: 0,
  gridOffsetY: 0,
};
const POINT = { x: 180, y: 90 };

function setup(overrides: Record<string, unknown> = {}, enabled = true) {
  const store = {
    isEnabled: vi.fn(() => enabled),
    openHex: vi.fn(),
  };
  storeMock.current = store;
  const view = render(HexThisHexButton, {
    point: POINT,
    mapId: "map-1",
    grid: GRID,
    isGM: true,
    isGuest: false,
    ...overrides,
  });
  return { store, view };
}

describe("HexThisHexButton", () => {
  beforeEach(() => {
    storeMock.current = null;
  });

  it("opens the hex the point stands in when Hex Crawl is on", async () => {
    const { store } = setup();

    await fireEvent.click(screen.getByRole("button", { name: "This hex" }));

    expect(store.openHex).toHaveBeenCalledWith(
      "map-1",
      pointToHex(POINT, {
        orientation: "pointy",
        size: 50,
        offsetX: 0,
        offsetY: 0,
      }),
      expect.any(HTMLElement),
    );
  });

  it("is absent when Hex Crawl mode is off", () => {
    setup({}, false);
    expect(screen.queryByRole("button", { name: "This hex" })).toBeNull();
  });

  it("is absent on a square grid", () => {
    setup({ grid: { ...GRID, gridType: "square" } });

    expect(screen.queryByRole("button", { name: "This hex" })).toBeNull();
  });

  it("is absent for guests and non-GM viewers", () => {
    setup({ isGuest: true });
    expect(screen.queryByRole("button", { name: "This hex" })).toBeNull();
  });

  it("is absent when no store has been provided", () => {
    storeMock.current = null;
    render(HexThisHexButton, {
      point: POINT,
      mapId: "map-1",
      grid: GRID,
      isGM: true,
      isGuest: false,
    });

    expect(screen.queryByRole("button", { name: "This hex" })).toBeNull();
  });
});
