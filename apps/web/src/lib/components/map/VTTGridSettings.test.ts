/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mapStore: {
    gridSize: 50,
    gridType: "square",
    showHexCoordinates: false,
    hexLabelConfig: {
      style: "off" as "off" | "none" | "numeric" | "alphanumeric" | "axial",
      startColumn: "A",
    },
  },
  mapSession: {
    gridUnit: "ft",
    gridDistance: 5,
    gridFitMode: false,
    gridMoveMode: false,
    setGridSettings: vi.fn(),
  },
  notificationStore: { notify: vi.fn() },
}));

vi.mock("$lib/stores/map.svelte", () => ({ mapStore: mocks.mapStore }));
vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: mocks.mapSession,
}));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: mocks.notificationStore,
}));

import VTTGridSettings from "./VTTGridSettings.svelte";

// jsdom has no Web Animations API; Svelte transitions need it.
beforeEach(() => {
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(
      () =>
        ({
          finished: Promise.resolve(),
          cancel: vi.fn(),
          play: vi.fn(),
        }) as unknown as Animation,
    );
  }
  mocks.mapStore.gridType = "square";
  mocks.mapSession.gridFitMode = false;
  mocks.mapSession.setGridSettings.mockClear();
});

describe("VTTGridSettings fitting", () => {
  it("explains fitting in squares for a square grid", () => {
    render(VTTGridSettings, { close: vi.fn() });

    expect(screen.getByText(/Drag across a span of grid squares/)).toBeTruthy();
  });

  it("explains fitting in hexes for a hex grid, along the right axis", async () => {
    render(VTTGridSettings, { close: vi.fn() });
    await fireEvent.click(screen.getByText("Hex (Pointy)"));
    expect(
      screen.getByText(/across a row over a span of printed hexes/),
    ).toBeTruthy();

    await fireEvent.click(screen.getByText("Hex (Flat)"));
    expect(
      screen.getByText(/down a column over a span of printed hexes/),
    ).toBeTruthy();
  });

  it("fits against the grid type chosen in the dialog, not the one last saved", async () => {
    const close = vi.fn();
    render(VTTGridSettings, { close });
    await fireEvent.click(screen.getByText("Hex (Flat)"));

    await fireEvent.click(screen.getByText("Fit Grid from Map"));

    expect(mocks.mapSession.setGridSettings).toHaveBeenCalledWith(
      expect.objectContaining({ gridType: "hex-flat" }),
    );
    expect(mocks.mapSession.gridFitMode).toBe(true);
    expect(close).toHaveBeenCalled();
  });

  it("lets a hex grid go smaller than a square one on the size slider", async () => {
    render(VTTGridSettings, { close: vi.fn() });
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.min).toBe("20");

    await fireEvent.click(screen.getByText("Hex (Pointy)"));
    expect(slider.min).toBe("5");
  });
});

describe("VTTGridSettings hex label configuration", () => {
  it("configures alphanumeric hex labels and saves settings", async () => {
    const close = vi.fn();
    render(VTTGridSettings, { close });

    await fireEvent.click(screen.getByText("Hex (Pointy)"));
    await fireEvent.click(screen.getByText("Alphanumeric (A01)"));

    expect(screen.getByText(/Sample:\s*A01/)).toBeTruthy();

    const startColInput = screen.getByLabelText(
      "Start Column",
    ) as HTMLInputElement;
    await fireEvent.input(startColInput, { target: { value: "B" } });

    expect(screen.getByText(/Sample:\s*B01/)).toBeTruthy();

    await fireEvent.click(screen.getByText("Apply to All"));

    expect(mocks.mapSession.setGridSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        gridType: "hex-pointy",
        showHexCoordinates: true,
        hexLabelConfig: expect.objectContaining({
          style: "alphanumeric",
          startColumn: "B",
          startRow: 1,
          rowPadding: 2,
        }),
      }),
    );
    expect(close).toHaveBeenCalled();
  });

  it("turns hex labels off", async () => {
    mocks.mapStore.hexLabelConfig = { style: "alphanumeric", startColumn: "A" };
    const close = vi.fn();
    render(VTTGridSettings, { close });

    await fireEvent.click(screen.getByText("Hex (Pointy)"));
    await fireEvent.click(screen.getByText("Off"));

    await fireEvent.click(screen.getByText("Apply to All"));

    expect(mocks.mapSession.setGridSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        showHexCoordinates: false,
        hexLabelConfig: expect.objectContaining({
          style: "off",
        }),
      }),
    );
  });
});
