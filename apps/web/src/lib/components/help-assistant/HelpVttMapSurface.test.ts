/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VttHelpFacts } from "help-engine";

const mocks = vi.hoisted(() => ({
  mapStore: {
    activeMap: { id: "map-1" } as { id: string } | null,
    isGMMode: true,
    showGrid: true,
    gridType: "hex-pointy",
    showFog: true,
  },
  mapSession: {
    vttEnabled: true,
    mode: "combat",
    showGridSettings: false,
    setMode: vi.fn(),
    removeToken: vi.fn(),
    advanceTurn: vi.fn(),
    setVttEnabled: vi.fn(),
    selection: "t1" as string | null,
    myPeerId: "peer-1" as string | null,
    activeLayer: "token",
    tokens: {} as Record<string, unknown>,
    initiativeEntries: [{}] as unknown[],
    measurement: { active: false },
    canViewToken: vi.fn(() => true),
    canMoveToken: vi.fn(() => true),
    canAdvanceTurn: vi.fn(() => true),
  },
  session: { isGuestMode: false, sharedMode: false },
  p2pHost: { isHosting: true },
}));

vi.mock("$lib/stores/map.svelte", () => ({ mapStore: mocks.mapStore }));
vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: mocks.mapSession,
}));
vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: mocks.session,
}));
vi.mock("$lib/cloud-bridge/p2p/host-service.svelte", () => ({
  p2pHost: mocks.p2pHost,
}));

import { helpSurfaces } from "$lib/stores/help-assistant/help-surface.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { mapControlsUIStore } from "$lib/stores/ui/map-controls-ui.svelte";
import HelpVttMapSurface from "./HelpVttMapSurface.svelte";

const facts = (): VttHelpFacts => helpSurfaces.vttMap!.facts();

beforeEach(() => {
  mocks.mapStore.activeMap = { id: "map-1" };
  mocks.mapStore.isGMMode = true;
  mocks.mapStore.gridType = "hex-pointy";
  mocks.mapSession.vttEnabled = true;
  mocks.mapSession.selection = "t1";
  mocks.mapSession.tokens = { t1: { id: "t1", entityId: "e1" } };
  mocks.mapSession.canViewToken.mockReturnValue(true);
  mocks.mapSession.canMoveToken.mockReturnValue(true);
  mocks.mapSession.canAdvanceTurn.mockReturnValue(true);
  mocks.session.isGuestMode = false;
  mocks.session.sharedMode = false;
  mocks.p2pHost.isHosting = true;
  mocks.mapSession.mode = "combat";
  mocks.mapSession.showGridSettings = false;
  layoutUIStore.vttSidebarCollapsed = true;
  mapControlsUIStore.open = false;
  mapControlsUIStore.showEncounters = false;
  for (const fn of [
    mocks.mapSession.setMode,
    mocks.mapSession.removeToken,
    mocks.mapSession.advanceTurn,
    mocks.mapSession.setVttEnabled,
  ]) {
    fn.mockClear();
  }
});

afterEach(() => {
  helpSurfaces.vttMap = null;
});

describe("HelpVttMapSurface", () => {
  it("reports the GM's own state while the map is showing", () => {
    render(HelpVttMapSurface);

    expect(facts()).toEqual({
      vttOn: true,
      combat: true,
      guest: false,
      playerView: false,
      grid: "hex",
      fogOn: true,
      tokenSelected: true,
      tokenLinked: true,
      tokenManageable: true,
      layer: "token",
      hasInitiative: true,
      canAdvanceTurn: true,
      hosting: true,
      measuring: false,
    });
  });

  it("tells a player nothing about the GM's layer or hosting, or a token they cannot see", () => {
    mocks.session.isGuestMode = true;
    mocks.mapStore.isGMMode = true;
    mocks.mapSession.canViewToken.mockReturnValue(false);
    render(HelpVttMapSurface);

    expect(mocks.mapSession.canViewToken).not.toHaveBeenCalledWith(
      "t1",
      "peer-1",
      true,
    );
    expect(facts()).toMatchObject({
      guest: true,
      layer: null,
      hosting: false,
      tokenSelected: false,
      tokenLinked: false,
      tokenManageable: false,
    });
  });

  it("treats a player as a player even if the map reports GM mode", () => {
    mocks.session.isGuestMode = true;
    render(HelpVttMapSurface);
    facts();

    expect(mocks.mapSession.canMoveToken).toHaveBeenCalledWith(
      "t1",
      "peer-1",
      false,
    );
    expect(mocks.mapSession.canAdvanceTurn).toHaveBeenCalledWith(
      "peer-1",
      false,
    );
  });

  it("reports no token when nothing is selected or VTT is off", () => {
    mocks.mapSession.selection = null;
    render(HelpVttMapSurface);
    expect(facts().tokenSelected).toBe(false);

    mocks.mapSession.selection = "t1";
    mocks.mapSession.vttEnabled = false;
    expect(facts()).toMatchObject({ vttOn: false, tokenSelected: false });
  });

  it("reports the GM previewing Player View", () => {
    mocks.session.sharedMode = true;
    render(HelpVttMapSurface);

    expect(facts()).toMatchObject({ playerView: true, layer: null });
  });

  it("stops reporting when the map screen goes away", () => {
    const { unmount } = render(HelpVttMapSurface);
    expect(helpSurfaces.vttMap).not.toBeNull();

    unmount();
    expect(helpSurfaces.vttMap).toBeNull();
  });
});

describe("HelpVttMapSurface actions", () => {
  const offered = () => helpSurfaces.vttMap!.actions();

  it("offers a GM every panel and control, so a guide can open them first", () => {
    render(HelpVttMapSurface);

    expect(offered()).toEqual(
      expect.arrayContaining([
        "vtt-sidebar",
        "vtt-map-controls",
        "vtt-grid-settings",
        "vtt-encounters",
        "vtt-mode-switch",
        "vtt-fog-toggle",
        "vtt-initiative-panel",
        "vtt-share-button",
      ]),
    );
  });

  it("offers no VTT actions when the map route has no active map", () => {
    mocks.mapStore.activeMap = null;
    render(HelpVttMapSurface);

    expect(offered()).toEqual([]);
    expect(helpSurfaces.vttMap!.openPanel("vtt-grid-settings")).toBe(false);
    expect(mocks.mapSession.showGridSettings).toBe(false);
  });

  it("offers a player only the sidebar and what a player can see", () => {
    mocks.session.isGuestMode = true;
    render(HelpVttMapSurface);

    expect(offered()).toEqual(["vtt-sidebar", "vtt-initiative-panel"]);
  });

  it("switches the GM controls off in Player View, as the screen itself does", () => {
    mocks.mapStore.isGMMode = false;
    mocks.session.sharedMode = true;
    render(HelpVttMapSurface);

    expect(offered()).not.toContain("vtt-grid-settings");
    expect(offered()).not.toContain("vtt-fog-toggle");
    expect(offered()).toContain("vtt-player-view-toggle");
  });

  it("offers nothing VTT-specific while VTT is off, and no initiative outside Combat", () => {
    mocks.mapSession.vttEnabled = false;
    render(HelpVttMapSurface);
    expect(offered()).toEqual(
      expect.arrayContaining(["vtt-map-controls", "vtt-grid-settings"]),
    );
    expect(offered()).not.toContain("vtt-sidebar");
    expect(offered()).not.toContain("vtt-add-token");

    mocks.mapSession.vttEnabled = true;
    mocks.mapSession.mode = "exploration";
    expect(offered()).not.toContain("vtt-initiative-panel");
  });
});

describe("HelpVttMapSurface openPanel", () => {
  const open = (
    panel: Parameters<NonNullable<typeof helpSurfaces.vttMap>["openPanel"]>[0],
  ) => helpSurfaces.vttMap!.openPanel(panel);

  it("opens only what is showing, and never touches the session", () => {
    render(HelpVttMapSurface);

    expect(open("vtt-sidebar")).toBe(true);
    expect(layoutUIStore.vttSidebarCollapsed).toBe(false);
    expect(open("vtt-map-controls")).toBe(true);
    expect(mapControlsUIStore.open).toBe(true);
    expect(open("vtt-grid-settings")).toBe(true);
    expect(mocks.mapSession.showGridSettings).toBe(true);
    expect(open("vtt-encounters")).toBe(true);
    expect(mapControlsUIStore.showEncounters).toBe(true);

    expect(mocks.mapSession.setMode).not.toHaveBeenCalled();
    expect(mocks.mapSession.removeToken).not.toHaveBeenCalled();
    expect(mocks.mapSession.advanceTurn).not.toHaveBeenCalled();
    expect(mocks.mapSession.setVttEnabled).not.toHaveBeenCalled();
  });

  it("refuses a host panel for a player, even if asked directly", () => {
    mocks.session.isGuestMode = true;
    render(HelpVttMapSurface);

    expect(open("vtt-grid-settings")).toBe(false);
    expect(open("vtt-encounters")).toBe(false);
    expect(mocks.mapSession.showGridSettings).toBe(false);
    expect(mapControlsUIStore.showEncounters).toBe(false);
  });
});
