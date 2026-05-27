/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mapStoreMock = vi.hoisted(() => ({
  isGMMode: true,
  showFog: true,
  showGrid: false,
  brushRadius: 50,
  showLabels: true,
}));

const mapSessionMock = vi.hoisted(() => ({
  vttEnabled: true,
  showGridSettings: false,
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
    mapSessionMock.vttEnabled = true;
    mapSessionMock.measurement.active = false;
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
