/** @vitest-environment jsdom */

import {
  createEvent,
  fireEvent,
  render,
  screen,
} from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mapStoreMock = vi.hoisted(() => ({
  isGMMode: true,
  showFog: true,
  showGrid: false,
  brushRadius: 50,
  showLabels: true,
  layerVisibility: { terrain: true, object: true, token: true },
  layerLocked: { terrain: false, object: false, token: false },
}));

const mapSessionMock = vi.hoisted(() => ({
  vttEnabled: true,
  showGridSettings: false,
  activeLayer: "terrain",
  measurement: {
    active: false,
  },
  setMeasurementActive: vi.fn((active: boolean) => {
    mapSessionMock.measurement.active = active;
  }),
}));

const sessionModeStoreMock = vi.hoisted(() => ({
  isGuestMode: false,
  sharedMode: false,
}));

vi.mock("$lib/components/map/VTTModeToggle.svelte", () => ({
  default: function VTTModeToggleMock() {
    return {};
  },
}));

vi.mock("$lib/stores/map.svelte", () => ({
  mapStore: mapStoreMock,
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: mapSessionMock,
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: sessionModeStoreMock,
}));

import MapVTTControlsHUD from "./MapVTTControlsHUD.svelte";

describe("MapVTTControlsHUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionModeStoreMock.isGuestMode = false;
    sessionModeStoreMock.sharedMode = false;
    mapStoreMock.isGMMode = true;
    mapStoreMock.showFog = true;
    mapStoreMock.showGrid = false;
    mapStoreMock.showLabels = true;
    mapSessionMock.vttEnabled = true;
    mapSessionMock.showGridSettings = false;
    mapSessionMock.measurement.active = false;
    mapSessionMock.activeLayer = "terrain";
    mapStoreMock.layerVisibility = { terrain: true, object: true, token: true };
    mapStoreMock.layerLocked = { terrain: false, object: false, token: false };
  });

  it("renders GM controls and toggles fog", async () => {
    render(MapVTTControlsHUD, {
      props: {
        chatSidebarOffset: "20rem",
      },
    });

    await fireEvent.click(screen.getByRole("button", { name: "FOG: ON" }));

    expect(mapStoreMock.showFog).toBe(false);
    expect(screen.getByRole("button", { name: "GRID: OFF" })).not.toBeNull();
  });

  it("toggles labels visibility", async () => {
    render(MapVTTControlsHUD, {
      props: {
        chatSidebarOffset: "20rem",
      },
    });

    await fireEvent.click(screen.getByRole("button", { name: "LABELS: ON" }));

    expect(mapStoreMock.showLabels).toBe(false);
  });

  it("opens grid settings without opening the map context menu", async () => {
    render(MapVTTControlsHUD, {
      props: {
        chatSidebarOffset: "20rem",
      },
    });

    const gridButton = screen.getByRole("button", { name: "GRID: OFF" });
    const event = createEvent.contextMenu(gridButton);
    const preventDefault = vi.spyOn(event, "preventDefault");
    const stopPropagation = vi.spyOn(event, "stopPropagation");

    await fireEvent(gridButton, event);

    expect(mapSessionMock.showGridSettings).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
  });

  it("toggles the measurement tool", async () => {
    render(MapVTTControlsHUD, {
      props: {
        chatSidebarOffset: "20rem",
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Toggle measurement tool" }),
    );

    expect(mapSessionMock.setMeasurementActive).toHaveBeenCalledWith(true);
  });

  it("shows the active layer in the button label and switches it", async () => {
    render(MapVTTControlsHUD, {
      props: {
        chatSidebarOffset: "20rem",
      },
    });

    const layerButton = screen.getByRole("button", {
      name: "Layer: Terrain",
    });
    await fireEvent.click(layerButton);
    expect(screen.getByRole("menu", { name: "Map layers" })).not.toBeNull();

    await fireEvent.click(
      screen.getByRole("menuitemradio", { name: /Furniture/ }),
    );

    expect(mapSessionMock.activeLayer).toBe("object");
  });

  it("hides controls for guests", () => {
    sessionModeStoreMock.isGuestMode = true;

    render(MapVTTControlsHUD, {
      props: {
        chatSidebarOffset: "20rem",
      },
    });

    expect(screen.queryByRole("button", { name: "FOG: ON" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Toggle measurement tool" }),
    ).toBeNull();
  });
});
