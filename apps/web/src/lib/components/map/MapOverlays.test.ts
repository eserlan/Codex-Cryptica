/** @vitest-environment jsdom */
import { fireEvent, render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mapStore: {
    pins: [
      { id: "pin-1", entityId: "e1", coordinates: { x: 10, y: 10 } },
    ] as unknown[],
    showFog: true,
    fogOpaque: true,
    fogRevision: 0,
    showLabels: true,
    canvasSize: { width: 800, height: 600 },
    project: (p: { x: number; y: number }) => ({ x: p.x + 100, y: p.y + 100 }),
    getEntitySubMap: () => null,
    gridType: "square",
    pendingPinCoords: null,
    isGMMode: true,
    activeMapId: "map-1",
    gridSize: 50,
    gridOffsetX: 0,
    gridOffsetY: 0,
  },
  mapSession: { armedTile: null, tokens: {} },
  vault: { entities: { e1: { title: "The Red Hand" } } },
}));

vi.mock("$lib/stores/map.svelte", () => ({ mapStore: mocks.mapStore }));
vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: mocks.mapSession,
}));
vi.mock("$lib/stores/vault.svelte", () => ({ vault: mocks.vault }));
vi.mock("./PinLinker.svelte", () => ({ default: () => ({}) }));
vi.mock("./MapPinPopover.svelte", () => ({ default: () => ({}) }));
vi.mock("./TokenHealthBarPopover.svelte", () => ({ default: () => ({}) }));

const hexStoreMock = vi.hoisted(() => ({
  current: null as null | {
    isEnabled: (id: string) => boolean;
    openHex: (mapId: string, hex: unknown, opener?: HTMLElement) => void;
  },
}));
vi.mock("$lib/components/map/hex-crawl/hex-crawl-context", () => ({
  useHexCrawlStore: () => hexStoreMock.current,
}));
vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: { isGuestMode: false },
}));

import MapOverlays from "./MapOverlays.svelte";
import { pointToHex } from "map-engine";

let revealed = true;
const interactions = {
  selectedPinId: null,
  healthBarPopoverTokenId: null,
  gridFitStart: null,
  gridFitEnd: null,
  boxSelectStart: null,
  boxSelectEnd: null,
  painter: { isRevealedAt: vi.fn(() => revealed) },
} as never;

const labelShown = (container: HTMLElement) =>
  container.textContent?.includes("The Red Hand") ?? false;

beforeEach(() => {
  revealed = true;
  mocks.mapStore.showFog = true;
  mocks.mapStore.fogOpaque = true;
  mocks.mapStore.gridType = "square";
  hexStoreMock.current = null;
});

describe("MapOverlays pin labels under fog", () => {
  it("shows a label where the map is revealed", () => {
    const { container } = render(MapOverlays, { interactions });

    expect(labelShown(container)).toBe(true);
  });

  it("hides a label whose spot is under solid fog, so its name does not leak", () => {
    revealed = false;
    const { container } = render(MapOverlays, { interactions });

    expect(labelShown(container)).toBe(false);
  });

  it("keeps the label hidden while the mask is unavailable, then shows it after reveal", async () => {
    revealed = false;
    const view = render(MapOverlays, { interactions });
    expect(labelShown(view.container)).toBe(false);

    revealed = true;
    mocks.mapStore.fogRevision++;
    const currentInteractions = interactions as Record<string, unknown>;
    await view.rerender({
      interactions: {
        ...currentInteractions,
        painter: { isRevealedAt: vi.fn(() => revealed) },
      } as never,
    });
    expect(labelShown(view.container)).toBe(true);
  });

  it("keeps the label when the GM sees translucent fog and can see the spot anyway", () => {
    revealed = false;
    mocks.mapStore.fogOpaque = false;
    const { container } = render(MapOverlays, { interactions });

    expect(labelShown(container)).toBe(true);
  });

  it("keeps the label when fog is off", () => {
    revealed = false;
    mocks.mapStore.showFog = false;
    const { container } = render(MapOverlays, { interactions });

    expect(labelShown(container)).toBe(true);
  });
});

describe("MapOverlays This hex for a selected pin (FR-003b)", () => {
  const selectedPin = Object.assign({}, interactions, {
    selectedPinId: "pin-1",
  }) as never;

  it("opens the hex the selected pin stands in", async () => {
    mocks.mapStore.gridType = "hex-pointy";
    const store = { isEnabled: vi.fn(() => true), openHex: vi.fn() };
    hexStoreMock.current = store;
    const { getByRole } = render(MapOverlays, { interactions: selectedPin });

    await fireEvent.click(getByRole("button", { name: "This hex" }));

    expect(store.openHex).toHaveBeenCalledWith(
      "map-1",
      pointToHex(
        { x: 10, y: 10 },
        { orientation: "pointy", size: 50, offsetX: 0, offsetY: 0 },
      ),
      expect.any(HTMLElement),
    );
  });

  it("is absent on a square grid", () => {
    mocks.mapStore.gridType = "square";
    hexStoreMock.current = { isEnabled: () => true, openHex: vi.fn() };
    const { queryByRole } = render(MapOverlays, { interactions: selectedPin });

    expect(queryByRole("button", { name: "This hex" })).toBeNull();
  });

  it("is absent when Hex Crawl mode is off", () => {
    mocks.mapStore.gridType = "hex-pointy";
    hexStoreMock.current = { isEnabled: () => false, openHex: vi.fn() };
    const { queryByRole } = render(MapOverlays, { interactions: selectedPin });

    expect(queryByRole("button", { name: "This hex" })).toBeNull();
  });
});
