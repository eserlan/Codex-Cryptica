/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const mapMock = vi.hoisted(() => ({
  activeMapId: "map-1",
  gridType: "hex-pointy",
  gridSize: 50,
  gridOffsetX: 0,
  gridOffsetY: 0,
  showTerrainIcons: false,
  hexLabelConfig: undefined,
  viewport: { zoom: 1 },
  canvasSize: { width: 800, height: 600 },
  project: (p: { x: number; y: number }) => p,
  unproject: (p: { x: number; y: number }) => p,
}));
vi.mock("#lib/stores/map.svelte.js", () => ({ mapStore: mapMock }));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    maps: { "map-1": { hexCrawl: { enabled: true, hexes: {} }, pins: [] } },
    entities: {},
  },
}));
vi.mock("#lib/stores/ui/discovery-policy.svelte.js", () => ({
  discoveryPolicyStore: { aiDisabled: true },
}));

import HexCrawlLayer from "./HexCrawlLayer.svelte";

function services(
  offerCurrent: { mapId: string; hex: { q: number; r: number } } | null = null,
  route: { hexes: { q: number; r: number }[] } | null = null,
) {
  return {
    store: { selectedHex: null, isEnabled: () => true, openHex: vi.fn() },
    observer: {},
    controller: {},
    offer: { current: offerCurrent },
    region: {
      review: null,
      message: null,
      undoAvailable: false,
      mapId: null,
      leave: vi.fn(),
    },
    journey: {
      route,
      committedSteps: 0,
      eligibleTokens: [],
      selectedTokenId: null,
      error: null,
      dispose: vi.fn(),
      validateIdentity: vi.fn(),
    },
  };
}

describe("HexCrawlLayer journey visibility and arrival", () => {
  it("shows one explicit Explore invitation for a newly explored arrival", async () => {
    const svc = services({ mapId: "map-1", hex: { q: 2, r: -1 } });
    render(HexCrawlLayer, {
      services: svc as never,
      painter: { isRevealedAt: () => true } as never,
      isGM: true,
      isGuest: false,
      viewportSize: { width: 800, height: 600 },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Explore" }));
    expect(svc.store.openHex).toHaveBeenCalledWith(
      "map-1",
      { q: 2, r: -1 },
      expect.any(HTMLElement),
    );
  });

  it("hides journey controls and arrival offers from guests and Player View", () => {
    const svc = services(
      { mapId: "map-1", hex: { q: 1, r: 0 } },
      {
        hexes: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ],
      },
    );
    const guest = render(HexCrawlLayer, {
      services: svc as never,
      painter: { isRevealedAt: () => true } as never,
      isGM: true,
      isGuest: true,
      viewportSize: { width: 800, height: 600 },
    });
    expect(screen.queryByRole("region", { name: "Hex journey" })).toBeNull();
    expect(screen.queryByLabelText("Journey route")).toBeNull();
    expect(screen.queryByRole("button", { name: "Explore" })).toBeNull();
    guest.unmount();
    render(HexCrawlLayer, {
      services: svc as never,
      painter: { isRevealedAt: () => true } as never,
      isGM: false,
      isGuest: false,
      viewportSize: { width: 800, height: 600 },
    });
    expect(screen.queryByRole("region", { name: "Hex journey" })).toBeNull();
    expect(screen.queryByLabelText("Journey route")).toBeNull();
    expect(screen.queryByRole("button", { name: "Explore" })).toBeNull();
  });
});

describe("HexCrawlLayer region review", () => {
  async function withReview() {
    const { RegionGenerationStore } =
      await import("#lib/stores/hex-crawl/region-generation.svelte.js");
    const state = { enabled: true, hexes: {} as Record<string, never> };
    const hexes = {
      stateFor: () => state,
      applyChange: vi.fn(
        async (_id: string, change: (s: typeof state) => unknown) => {
          change(state);
          return true;
        },
      ),
      revision: 0,
    };
    const region = new RegionGenerationStore({
      hexes: hexes as never,
      inBounds: () => true,
      newSeed: () => "AAAA-BBBB",
      storage: null,
      clock: { now: () => 1 },
      canEdit: () => true,
    });
    const svc = services();
    svc.region = region as never;
    (svc.store as { closeHex?: () => void }).closeHex = vi.fn();
    return { svc, region, hexes };
  }
  const props = (svc: unknown) => ({
    services: svc as never,
    painter: { isRevealedAt: () => true } as never,
    isGM: true,
    isGuest: false,
    viewportSize: { width: 800, height: 600 },
  });

  it("mounts the overlay and review bar while a review is open, and the undo bar after", async () => {
    const { svc, region } = await withReview();
    region.open("map-1", "area", { q: 0, r: 0 }, 1);
    render(HexCrawlLayer, props(svc));
    expect(screen.getAllByTestId("region-proposed-hex")).toHaveLength(7);
    expect(screen.getByTestId("region-review-bar")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(await screen.findByTestId("region-message")).toBeTruthy();
    expect(screen.queryByTestId("region-review-bar")).toBeNull();
  });

  it("a tap during a review closes the hex panel instead of opening it behind", async () => {
    const { svc, region } = await withReview();
    (svc.store as { selectedHex: unknown }).selectedHex = {
      mapId: "map-1",
      hex: { q: 8, r: 8 },
    };
    region.open("map-1", "area", { q: 0, r: 0 }, 1);
    render(HexCrawlLayer, props(svc));
    expect(
      (svc.store as unknown as { closeHex: ReturnType<typeof vi.fn> }).closeHex,
    ).toHaveBeenCalled();
  });

  it("tapping a proposed hex lets the GM change it", async () => {
    const { svc, region } = await withReview();
    region.open("map-1", "area", { q: 0, r: 0 }, 1);
    render(HexCrawlLayer, props(svc));
    const hex = screen.getAllByTestId("region-proposed-hex")[0];
    await fireEvent.click(hex);
    await fireEvent.click(
      await screen.findByRole("button", { name: "Desert" }),
    );
    expect(region.review?.adjustments[hex.getAttribute("data-hex")!]).toEqual({
      kind: "preset",
      id: "desert",
    });
  });

  it("drops the undo and message when the active map changes after an accept", async () => {
    const { svc, region } = await withReview();
    region.open("map-1", "area", { q: 0, r: 0 }, 1);
    const view = render(HexCrawlLayer, props(svc));
    await fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(await screen.findByRole("button", { name: "Undo" })).toBeTruthy();
    mapMock.activeMapId = "map-2";
    view.unmount();
    render(HexCrawlLayer, props(svc));
    mapMock.activeMapId = "map-1";
    expect(region.undoAvailable).toBe(false);
    expect(region.message).toBeNull();
    expect(region.mapId).toBeNull();
  });

  it("drops the review when the layer unmounts", async () => {
    const { svc, region } = await withReview();
    region.open("map-1", "area", { q: 0, r: 0 }, 1);
    const view = render(HexCrawlLayer, props(svc));
    view.unmount();
    expect(region.review).toBeNull();
  });

  it("shows no region UI to a guest", async () => {
    const { svc, region } = await withReview();
    region.open("map-1", "area", { q: 0, r: 0 }, 1);
    render(HexCrawlLayer, { ...props(svc), isGuest: true });
    expect(screen.queryByTestId("region-review-bar")).toBeNull();
  });
});
