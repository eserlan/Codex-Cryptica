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
vi.mock("$lib/stores/map.svelte", () => ({ mapStore: mapMock }));
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    maps: { "map-1": { hexCrawl: { enabled: true, hexes: {} }, pins: [] } },
    entities: {},
  },
}));
vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
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
