/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

vi.mock("$lib/components/help/FeatureHint.svelte", () => ({
  default: function FeatureHintMock() {
    return {};
  },
}));

vi.mock("$lib/components/vtt/EncounterManager.svelte", () => ({
  default: function EncounterManagerMock() {
    return {};
  },
}));

vi.mock("$lib/cloud-bridge/p2p/host-service.svelte", () => ({
  p2pHost: {
    startHosting: vi.fn().mockResolvedValue("peer-123"),
  },
}));

vi.mock("$lib/utils/share-link", () => ({
  startShareSession: vi.fn().mockResolvedValue("peer-123"),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    maps: {},
    allEntities: [],
    selectedEntityId: null,
    getActiveVaultHandle: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("$lib/stores/map.svelte", () => ({
  mapStore: {
    activeMapId: "map-1",
    activeMap: {
      id: "map-1",
      dimensions: {
        width: 900,
        height: 600,
      },
    },
    setCanvasSize: vi.fn(),
    showGrid: false,
    gridSize: 50,
    isGMMode: true,
    viewport: {
      pan: { x: 0, y: 0 },
      zoom: 1,
    },
  },
}));

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: {
    isGuestMode: false,
  },
}));

import VTTControls from "./VTTControls.svelte";
import { mapSession } from "$lib/stores/map-session.svelte";
import { uiStore } from "$lib/stores/ui.svelte";

describe("VTTControls", () => {
  beforeEach(() => {
    mapSession.clearSession();
    mapSession.setVttEnabled(true);
    mapSession.setMode("exploration");
    mapSession.pendingTokenCoords = null;
    uiStore.isGuestMode = false;
  });

  it("shows the pure VTT controls for the active map session", async () => {
    render(VTTControls);

    expect(screen.getByRole("button", { name: "Explore" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Combat" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Add Token" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Encounters" })).not.toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("hides token and encounter management for guests", async () => {
    uiStore.isGuestMode = true;

    render(VTTControls);

    expect(screen.getByRole("button", { name: "Explore" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Combat" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Add Token" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Encounters" })).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
  });
});
