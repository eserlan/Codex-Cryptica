/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VttHelpFacts } from "help-engine";

const mocks = vi.hoisted(() => ({
  mapStore: {
    isGMMode: true,
    showGrid: true,
    gridType: "hex-pointy",
    showFog: true,
  },
  mapSession: {
    vttEnabled: true,
    mode: "combat",
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
import HelpVttMapSurface from "./HelpVttMapSurface.svelte";

const facts = (): VttHelpFacts => helpSurfaces.vttMap!.facts();

beforeEach(() => {
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

    expect(facts().playerView).toBe(true);
  });

  it("stops reporting when the map screen goes away", () => {
    const { unmount } = render(HelpVttMapSurface);
    expect(helpSurfaces.vttMap).not.toBeNull();

    unmount();
    expect(helpSurfaces.vttMap).toBeNull();
  });
});
