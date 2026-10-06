/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { mapControlsUIStore } from "$lib/stores/ui/map-controls-ui.svelte";
import VTTControls from "./VTTControls.svelte";
import { mapSession } from "$lib/stores/map-session.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

describe("VTTControls", () => {
  beforeEach(() => {
    mapSession.clearSession();
    mapSession.setVttEnabled(true);
    mapSession.setMode("exploration");
    mapSession.pendingTokenCoords = null;
    mapSession.pendingNoteCoords = null;
    mapSession.cancelNotePlacement();
    mapSession.bindToMap("map-1");
    sessionModeStore.isGuestMode = false;
  });

  it("shows the pure VTT controls for the active map session", async () => {
    const { container } = render(VTTControls);

    const exploreButton = screen.getByRole("button", { name: "Explore" });
    const combatButton = screen.getByRole("button", { name: "Combat" });

    expect(exploreButton).not.toBeNull();
    expect(exploreButton.getAttribute("aria-pressed")).toBe("true");

    expect(combatButton).not.toBeNull();
    expect(combatButton.getAttribute("aria-pressed")).toBe("false");

    const addTokenButton = screen.getByRole("button", { name: "Add Token" });
    const encountersButton = screen.getByRole("button", { name: "Encounters" });

    expect(addTokenButton).not.toBeNull();
    expect(addTokenButton.getAttribute("aria-haspopup")).toBe("dialog");
    expect(addTokenButton.getAttribute("aria-expanded")).toBe("false");

    expect(encountersButton).not.toBeNull();
    expect(encountersButton.getAttribute("aria-haspopup")).toBe("dialog");
    expect(encountersButton.getAttribute("aria-expanded")).toBe("false");

    expect(screen.queryByRole("tab")).toBeNull();
    expect(container.firstElementChild?.className).toContain("flex-col");
    expect(container.firstElementChild?.firstElementChild?.className).toContain(
      "min-w-0",
    );
  });

  it("carries stable help targets for the mode switch, Add Token and Encounters", () => {
    const { container } = render(VTTControls);

    for (const target of [
      "vtt-mode-switch",
      "vtt-add-token",
      "vtt-encounters-button",
    ]) {
      expect(
        container.querySelector(`[data-help-target="${target}"]`),
      ).not.toBeNull();
    }
    // The switch wraps both mode buttons, so the highlight rings both.
    const sw = container.querySelector('[data-help-target="vtt-mode-switch"]')!;
    expect(sw.querySelectorAll("button")).toHaveLength(2);
  });

  it("opens Encounter Snapshots from the shared store the help assistant uses", async () => {
    render(VTTControls);
    const button = screen.getByRole("button", { name: "Encounters" });
    expect(button.getAttribute("aria-expanded")).toBe("false");

    mapControlsUIStore.showEncounters = true;
    await tick();
    expect(button.getAttribute("aria-expanded")).toBe("true");

    mapControlsUIStore.showEncounters = false;
    await tick();
    expect(button.getAttribute("aria-expanded")).toBe("false");

    await fireEvent.click(button);
    expect(mapControlsUIStore.showEncounters).toBe(true);
    mapControlsUIStore.showEncounters = false;
  });

  it("hides token and encounter management for guests", async () => {
    sessionModeStore.isGuestMode = true;

    render(VTTControls);

    expect(screen.getByRole("button", { name: "Explore" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Combat" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Add Token" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Encounters" })).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("opens token placement at the centered map origin", async () => {
    render(VTTControls);

    await screen.getByRole("button", { name: "Add Token" }).click();

    expect(mapSession.pendingTokenCoords).toEqual({ x: 0, y: 0 });
  });

  it("arms note placement instead of dropping a note immediately", async () => {
    render(VTTControls);

    const noteButton = screen.getByRole("button", { name: "Pin Note" });
    expect(noteButton.getAttribute("aria-pressed")).toBe("false");

    await noteButton.click();

    expect(mapSession.notePlacementArmed).toBe(true);
    // Nothing is placed until the GM picks the spot.
    expect(mapSession.pendingNoteCoords).toBeNull();
  });

  it("backs out of note placement when the button is pressed again", async () => {
    render(VTTControls);

    const noteButton = screen.getByRole("button", { name: "Pin Note" });
    await noteButton.click();
    await noteButton.click();

    expect(mapSession.notePlacementArmed).toBe(false);
    expect(mapSession.pendingNoteCoords).toBeNull();
  });

  it("hides note placement from guests", async () => {
    sessionModeStore.isGuestMode = true;

    render(VTTControls);

    expect(screen.queryByRole("button", { name: "Pin Note" })).toBeNull();
  });
});
