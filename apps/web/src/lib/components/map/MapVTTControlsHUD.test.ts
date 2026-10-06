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
  soloFog: false,
  showGrid: false,
  gridType: "square",
  gridSize: 50,
  visionRange: 60,
  brushRadius: 50,
  showLabels: true,
  layerVisibility: { terrain: true, object: true, token: true },
  layerLocked: { terrain: false, object: false, token: false },
}));

const mapSessionMock = vi.hoisted(() => ({
  vttEnabled: true,
  gridDistance: 6,
  gridUnit: "mi",
  allTokens: [] as Array<{ isVisionSource?: boolean }>,
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

import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { mapControlsUIStore } from "$lib/stores/ui/map-controls-ui.svelte";
import MapVTTControlsHUD from "./MapVTTControlsHUD.svelte";

describe("MapVTTControlsHUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionModeStoreMock.isGuestMode = false;
    sessionModeStoreMock.sharedMode = false;
    mapStoreMock.isGMMode = true;
    mapStoreMock.showFog = true;
    mapStoreMock.showGrid = false;
    mapStoreMock.gridType = "square";
    mapStoreMock.visionRange = 60;
    mapStoreMock.showLabels = true;
    mapSessionMock.vttEnabled = true;
    mapSessionMock.gridDistance = 6;
    mapSessionMock.allTokens = [];
    layoutUIStore.isMobile = false;
    mapControlsUIStore.open = false;
    mapControlsUIStore.maximized = false;
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

  describe("solo fog", () => {
    beforeEach(() => {
      mapStoreMock.showFog = true;
      mapStoreMock.soloFog = false;
      mapStoreMock.isGMMode = true;
    });

    it("offers a SOLO switch next to FOG, and flips it", async () => {
      const { container } = render(MapVTTControlsHUD, {
        props: { chatSidebarOffset: "20rem" },
      });

      const solo = screen.getByRole("button", { name: "SOLO: OFF" });
      expect(solo.getAttribute("aria-pressed")).toBe("false");
      expect(
        container.querySelector('[data-help-target="vtt-solo-fog-toggle"]'),
      ).toBe(solo);
      expect(solo.getAttribute("aria-describedby")).toBe(
        "solo-fog-description",
      );
      expect(solo.getAttribute("title")).toContain(
        "Fogged areas stay completely hidden",
      );
      solo.focus();
      expect(
        document.getElementById("solo-fog-description")?.textContent,
      ).toContain("Turn fog on first");

      await fireEvent.click(solo);
      expect(mapStoreMock.soloFog).toBe(true);
    });

    it("keeps SOLO available when phone controls are open", () => {
      layoutUIStore.isMobile = true;
      mapControlsUIStore.open = true;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });
      expect(screen.getByRole("button", { name: "SOLO: OFF" })).toBeTruthy();
    });

    it("is not offered while fog is off", () => {
      mapStoreMock.showFog = false;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });

      expect(screen.queryByRole("button", { name: /SOLO/ })).toBeNull();
    });

    it("is not offered in Player View, where the GM controls are off", () => {
      mapStoreMock.isGMMode = false;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });

      expect(screen.queryByRole("button", { name: /SOLO/ })).toBeNull();
    });
  });

  it("carries stable help targets for the GM's map controls", () => {
    const { container } = render(MapVTTControlsHUD, {
      props: { chatSidebarOffset: "20rem" },
    });

    for (const target of [
      "vtt-ruler-toggle",
      "vtt-player-view-toggle",
      "vtt-fog-toggle",
      "vtt-grid-button",
      "vtt-layer-control",
    ]) {
      expect(
        container.querySelector(`[data-help-target="${target}"]`),
      ).not.toBeNull();
    }
  });

  it("sets vision in whole hexes on hex maps and keeps square units unchanged", async () => {
    mapStoreMock.showGrid = true;
    mapStoreMock.gridType = "hex-pointy";
    mapStoreMock.visionRange = 12;
    const { unmount } = render(MapVTTControlsHUD, {
      props: { chatSidebarOffset: "20rem" },
    });
    expect(screen.getByText("Vision: 2 hexes")).toBeTruthy();
    const slider = screen.getByRole("slider", {
      name: "Vision range in hexes",
    }) as HTMLInputElement;
    expect(slider.min).toBe("0");
    expect(slider.max).toBe("10");
    expect(slider.step).toBe("1");
    await fireEvent.input(slider, { target: { value: "3" } });
    expect(mapStoreMock.visionRange).toBe(18);

    unmount();
    mapStoreMock.gridType = "square";
    render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });
    expect(screen.getByLabelText("Vision range")).toBeTruthy();
  });

  it("leaves the GM-only targets out of a player's view", () => {
    sessionModeStoreMock.isGuestMode = true;
    const { container } = render(MapVTTControlsHUD, {
      props: { chatSidebarOffset: "20rem" },
    });

    expect(
      container.querySelector('[data-help-target="vtt-fog-toggle"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-help-target="vtt-ruler-toggle"]'),
    ).toBeNull();
    sessionModeStoreMock.isGuestMode = false;
  });

  describe("maximize", () => {
    it("offers a maximize toggle inside the control bar when VTT is off", async () => {
      mapSessionMock.vttEnabled = false;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });

      const toggle = screen.getByTestId("map-maximize-toggle");
      expect(toggle.closest("#map-controls-bar")).not.toBeNull();
      expect(toggle.textContent).toContain("MAXIMIZE");
      expect(toggle.getAttribute("aria-pressed")).toBe("false");

      await fireEvent.click(toggle);

      expect(mapControlsUIStore.maximized).toBe(true);
      expect(toggle.textContent).toContain("MINIMIZE");
      expect(toggle.getAttribute("aria-pressed")).toBe("true");

      await fireEvent.click(toggle);
      expect(mapControlsUIStore.maximized).toBe(false);
      mapSessionMock.vttEnabled = true;
    });

    it("is not offered while VTT is on, which is already full-bleed", () => {
      mapSessionMock.vttEnabled = true;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });

      expect(screen.queryByTestId("map-maximize-toggle")).toBeNull();
    });

    it("tucks the phone controls panel away after maximizing so the map shows", async () => {
      mapSessionMock.vttEnabled = false;
      layoutUIStore.isMobile = true;
      mapControlsUIStore.open = true;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });

      await fireEvent.click(screen.getByTestId("map-maximize-toggle"));

      expect(mapControlsUIStore.maximized).toBe(true);
      expect(mapControlsUIStore.open).toBe(false);
      // The Map Controls button stays, so the user can always minimize again.
      expect(
        screen.getByRole("button", { name: "Map Controls" }),
      ).not.toBeNull();
      mapSessionMock.vttEnabled = true;
    });

    it("stays maximized after the phone panel closes and the toggle unmounts", async () => {
      mapSessionMock.vttEnabled = false;
      layoutUIStore.isMobile = true;
      mapControlsUIStore.open = true;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });

      await fireEvent.click(screen.getByTestId("map-maximize-toggle"));

      // The panel (and the toggle in it) is gone, but the map stays maximized.
      expect(screen.queryByTestId("map-maximize-toggle")).toBeNull();
      expect(mapControlsUIStore.maximized).toBe(true);
      mapSessionMock.vttEnabled = true;
    });

    it("keeps the panel open on larger screens", async () => {
      mapSessionMock.vttEnabled = false;
      layoutUIStore.isMobile = false;
      mapControlsUIStore.open = true;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });

      await fireEvent.click(screen.getByTestId("map-maximize-toggle"));

      expect(mapControlsUIStore.open).toBe(true);
      mapSessionMock.vttEnabled = true;
    });

    it("restores the app chrome when the map screen is left", () => {
      mapSessionMock.vttEnabled = false;
      mapControlsUIStore.maximized = true;
      const { unmount } = render(MapVTTControlsHUD, {
        props: { chatSidebarOffset: "20rem" },
      });

      unmount();

      expect(mapControlsUIStore.maximized).toBe(false);
      mapSessionMock.vttEnabled = true;
    });
  });

  describe("reveal / hide on phones", () => {
    it("starts hidden behind a button and exposes its state", () => {
      layoutUIStore.isMobile = true;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });

      const fab = screen.getByRole("button", { name: "Map Controls" });
      expect(fab.getAttribute("aria-expanded")).toBe("false");
      expect(fab.className).toContain("touch-target");
      expect(screen.queryByRole("button", { name: "LABELS: ON" })).toBeNull();
    });

    it("reveals the controls when the button is pressed and hides them again", async () => {
      layoutUIStore.isMobile = true;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });
      const fab = screen.getByRole("button", { name: "Map Controls" });

      await fireEvent.click(fab);
      expect(fab.getAttribute("aria-expanded")).toBe("true");
      expect(screen.getByRole("button", { name: "LABELS: ON" })).not.toBeNull();
      expect(fab.getAttribute("aria-controls")).toBe("map-controls-bar");
      expect(document.getElementById("map-controls-bar")).not.toBeNull();

      await fireEvent.click(fab);
      expect(fab.getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByRole("button", { name: "LABELS: ON" })).toBeNull();
    });

    it("has no button and shows the controls on larger screens", () => {
      layoutUIStore.isMobile = false;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });

      expect(screen.queryByRole("button", { name: "Map Controls" })).toBeNull();
      expect(screen.getByRole("button", { name: "LABELS: ON" })).not.toBeNull();
    });

    it("does not offer the button to guests, who have no controls to reveal", () => {
      layoutUIStore.isMobile = true;
      sessionModeStoreMock.isGuestMode = true;
      render(MapVTTControlsHUD, { props: { chatSidebarOffset: "20rem" } });

      expect(screen.queryByRole("button", { name: "Map Controls" })).toBeNull();
      sessionModeStoreMock.isGuestMode = false;
    });
  });

  it("wraps on narrow screens and only the bar takes pointer events", () => {
    render(MapVTTControlsHUD, {
      props: {
        chatSidebarOffset: "20rem",
      },
    });

    const bar = screen
      .getByRole("button", { name: "LABELS: ON" })
      .closest("div.rounded-lg") as HTMLElement;
    expect(bar.className).toContain("flex-wrap");
    expect(bar.className).toContain("max-w-full");
    expect(bar.className).toContain("pointer-events-auto");
    // The full-width row around it must not swallow map pans and pinches.
    expect(bar.parentElement?.className).toContain("pointer-events-none");
  });

  it("gives every bar control a 44px mobile touch target", () => {
    render(MapVTTControlsHUD, {
      props: {
        chatSidebarOffset: "20rem",
      },
    });

    for (const name of ["FOG: ON", "LABELS: ON", "GRID: OFF"]) {
      expect(screen.getByRole("button", { name }).className, name).toContain(
        "touch-target",
      );
    }
  });

  it("keeps controls pinned to the left edge on phones and offsets only from sm up", () => {
    const { container } = render(MapVTTControlsHUD, {
      props: {
        chatSidebarOffset: "20rem",
      },
    });

    const measure = container.querySelector(
      '[style*="--map-hud-left"]',
    ) as HTMLElement;
    expect(measure.className).toContain("left-4");
    expect(measure.className).toContain("sm:left-[var(--map-hud-left)]");
    expect(measure.getAttribute("style")).toContain("20rem");
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
