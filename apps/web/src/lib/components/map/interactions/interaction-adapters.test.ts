import { describe, expect, it, vi } from "vitest";

const mapSessionMock = vi.hoisted(() => ({
  allTokens: [] as any[],
  myPeerId: null as string | null,
  activeLayer: "terrain" as string,
  canViewToken: (tokenId: string, _peerId: string | null, isHost: boolean) => {
    const token = mapSessionMock.allTokens.find((t) => t.id === tokenId);
    return isHost || token?.visibleTo !== "gm-only";
  },
}));

const mapStoreMock = vi.hoisted(() => ({
  isGMMode: true,
  layerVisibility: { terrain: true, object: true, token: true } as Record<
    string,
    boolean
  >,
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: mapSessionMock,
}));
vi.mock("$lib/stores/map.svelte", () => ({ mapStore: mapStoreMock }));
vi.mock("$lib/cloud-bridge/p2p/guest-service", () => ({
  p2pGuestService: { peerId: null },
}));
vi.mock("$lib/cloud-bridge/p2p/host-service.svelte", () => ({
  p2pHost: {},
}));
vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: { isGuestMode: false },
}));
vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({ layoutUIStore: {} }));
vi.mock("$lib/stores/vault.svelte", () => ({ vault: {} }));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {},
}));

import {
  createTokenDragDependencies,
  createTokenSelectionDependencies,
} from "./interaction-adapters";

function token(overrides: Partial<any> & { id: string }) {
  return { layer: "terrain", visibleTo: "all", ...overrides };
}

describe("hit-testable token filtering (selection + drag)", () => {
  it("excludes a token on a hidden layer from both selection and drag", () => {
    mapSessionMock.allTokens = [
      token({ id: "hidden-terrain", layer: "terrain" }),
      token({ id: "other-hidden-terrain", layer: "terrain" }),
    ];
    mapSessionMock.activeLayer = "terrain";
    mapStoreMock.layerVisibility = {
      terrain: false,
      object: true,
      token: true,
    };

    const selectionTokens = createTokenSelectionDependencies().getTokens();
    const dragTokens = createTokenDragDependencies().getTokens();

    expect(selectionTokens).toEqual([]);
    expect(dragTokens).toEqual([]);
  });

  it("excludes a guest-hidden token from both selection and drag", () => {
    mapSessionMock.allTokens = [
      token({ id: "gm-only", visibleTo: "gm-only" }),
      token({ id: "everyone" }),
    ];
    mapSessionMock.activeLayer = "terrain";
    mapStoreMock.layerVisibility = { terrain: true, object: true, token: true };
    mapStoreMock.isGMMode = false;

    const selectionTokens = createTokenSelectionDependencies().getTokens();

    expect(selectionTokens.map((t) => t.id)).toEqual(["everyone"]);
    mapStoreMock.isGMMode = true;
  });

  it("keeps a token on a locked-but-visible layer selectable (lock only blocks drag/move, not selection)", () => {
    mapSessionMock.allTokens = [
      token({ id: "locked-layer", layer: "terrain" }),
    ];
    mapSessionMock.activeLayer = "terrain";
    mapStoreMock.layerVisibility = { terrain: true, object: true, token: true };

    const selectionTokens = createTokenSelectionDependencies().getTokens();

    expect(selectionTokens.map((t) => t.id)).toEqual(["locked-layer"]);
  });

  it("keeps a note reachable for the host whichever layer is being edited", () => {
    mapSessionMock.allTokens = [
      token({ id: "terrain-tile", layer: "terrain" }),
      token({ id: "hero-token", layer: "token" }),
      token({ id: "note", layer: "token", kind: "note" }),
    ];
    mapStoreMock.layerVisibility = { terrain: true, object: true, token: true };
    mapStoreMock.isGMMode = true;
    mapSessionMock.activeLayer = "terrain";

    const selectionTokens = createTokenSelectionDependencies().getTokens();
    const dragTokens = createTokenDragDependencies().getTokens();

    expect(selectionTokens.map((t) => t.id)).toEqual(["terrain-tile", "note"]);
    expect(dragTokens.map((t) => t.id)).toEqual(["terrain-tile", "note"]);
  });

  it("still hides a note whose layer the host has hidden", () => {
    mapSessionMock.allTokens = [
      token({ id: "note", layer: "token", kind: "note" }),
    ];
    mapStoreMock.layerVisibility = {
      terrain: true,
      object: true,
      token: false,
    };
    mapStoreMock.isGMMode = true;
    mapSessionMock.activeLayer = "terrain";

    expect(createTokenSelectionDependencies().getTokens()).toEqual([]);
  });

  it("for the host, restricts selection/drag to only the active layer", () => {
    mapSessionMock.allTokens = [
      token({ id: "terrain-tile", layer: "terrain" }),
      token({ id: "furniture-prop", layer: "object" }),
      token({ id: "hero-token", layer: "token" }),
    ];
    mapStoreMock.layerVisibility = { terrain: true, object: true, token: true };
    mapStoreMock.isGMMode = true;
    mapSessionMock.activeLayer = "object";

    const selectionTokens = createTokenSelectionDependencies().getTokens();
    const dragTokens = createTokenDragDependencies().getTokens();

    expect(selectionTokens.map((t) => t.id)).toEqual(["furniture-prop"]);
    expect(dragTokens.map((t) => t.id)).toEqual(["furniture-prop"]);
  });

  it("does not restrict a guest to the GM's local active layer", () => {
    mapSessionMock.allTokens = [
      token({ id: "terrain-tile", layer: "terrain" }),
      token({ id: "hero-token", layer: "token" }),
    ];
    mapStoreMock.layerVisibility = { terrain: true, object: true, token: true };
    mapStoreMock.isGMMode = false;
    // A guest's local activeLayer is whatever VTTLayerManager happens to
    // default to — irrelevant, since guests aren't gated by it at all.
    mapSessionMock.activeLayer = "terrain";

    const selectionTokens = createTokenSelectionDependencies().getTokens();

    expect(selectionTokens.map((t) => t.id).sort()).toEqual([
      "hero-token",
      "terrain-tile",
    ]);
    mapStoreMock.isGMMode = true;
  });
});
