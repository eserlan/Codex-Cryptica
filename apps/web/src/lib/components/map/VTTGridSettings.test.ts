/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mapStore: {
    activeMapId: "map-1",
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
  guard: {
    hasRecords: vi.fn(() => false),
    requestChange: vi.fn(async () => true),
    beginSession: vi.fn(),
    endSession: vi.fn(),
  },
}));

vi.mock("#lib/stores/map.svelte.js", () => ({ mapStore: mocks.mapStore }));
vi.mock("#lib/stores/map-session.svelte.js", () => ({
  mapSession: mocks.mapSession,
}));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: mocks.notificationStore,
}));
vi.mock("#lib/stores/hex-crawl/grid-change-guard.instance.js", () => ({
  hexGridChangeGuard: mocks.guard,
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
  Object.assign(mocks.mapStore, {
    gridSize: 50,
    gridType: "square",
    showHexCoordinates: false,
    hexLabelConfig: { style: "off", startColumn: "A" },
  });
  mocks.mapStore.gridType = "square";
  mocks.mapSession.gridFitMode = false;
  mocks.mapSession.setGridSettings.mockClear();
  mocks.guard.hasRecords.mockReset().mockReturnValue(false);
  mocks.guard.requestChange.mockReset().mockResolvedValue(true);
  mocks.guard.beginSession.mockClear();
  mocks.guard.endSession.mockClear();
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

  it("preserves the startCol alias when reopening settings", async () => {
    Object.assign(mocks.mapStore, {
      hexLabelConfig: { style: "alphanumeric", startCol: "D" },
    });
    render(VTTGridSettings, { close: vi.fn() });

    await fireEvent.click(screen.getByText("Hex (Pointy)"));

    expect(screen.getByLabelText("Start Column")).toHaveProperty("value", "D");
    expect(screen.getByText(/Sample:\s*D01/)).toBeTruthy();

    await fireEvent.click(screen.getByText("Apply to All"));

    expect(mocks.mapSession.setGridSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        hexLabelConfig: expect.objectContaining({
          style: "alphanumeric",
          startCol: "D",
          startColumn: "D",
        }),
      }),
    );
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

  it("preserves a zero start row and treats the none style as disabled", async () => {
    mocks.mapStore.hexLabelConfig = {
      style: "none",
      startColumn: "A",
    };
    render(VTTGridSettings, { close: vi.fn() });

    await fireEvent.click(screen.getByText("Hex (Pointy)"));
    expect(screen.getByText(/Sample:\s*None/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Off" }).getAttribute("aria-pressed"),
    ).toBe("true");

    await fireEvent.click(screen.getByText("Alphanumeric (A01)"));
    const startRowInput = screen.getByLabelText(
      "Start Row",
    ) as HTMLInputElement;
    await fireEvent.input(startRowInput, { target: { value: "0" } });
    await fireEvent.click(screen.getByText("Apply to All"));

    expect(mocks.mapSession.setGridSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        showHexCoordinates: true,
        hexLabelConfig: expect.objectContaining({ startRow: 0 }),
      }),
    );
  });
});

describe("VTTGridSettings hex grid change guard (T081, FR-039)", () => {
  it("asks before applying a size change when hex records exist", async () => {
    mocks.guard.hasRecords.mockReturnValue(true);
    const close = vi.fn();
    render(VTTGridSettings, { close });

    await fireEvent.input(screen.getByRole("slider"), {
      target: { value: "80" },
    });
    await fireEvent.click(screen.getByText("Apply to All"));

    expect(mocks.guard.requestChange).toHaveBeenCalledWith("map-1");
    expect(mocks.mapSession.setGridSettings).toHaveBeenCalledWith(
      expect.objectContaining({ gridSize: 80 }),
    );
    expect(close).toHaveBeenCalled();
  });

  it("restores the size from before the session when the change is cancelled", async () => {
    mocks.guard.hasRecords.mockReturnValue(true);
    mocks.guard.requestChange.mockResolvedValue(false);
    const close = vi.fn();
    render(VTTGridSettings, { close });

    await fireEvent.input(screen.getByRole("slider"), {
      target: { value: "80" },
    });
    await fireEvent.click(screen.getByText("Apply to All"));

    expect(mocks.mapSession.setGridSettings).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("50");
  });

  it("asks before changing the grid type when hex records exist, and restores it on cancel", async () => {
    mocks.guard.hasRecords.mockReturnValue(true);
    mocks.guard.requestChange.mockResolvedValue(false);
    render(VTTGridSettings, { close: vi.fn() });

    await fireEvent.click(screen.getByText("Hex (Pointy)"));
    await fireEvent.click(screen.getByText("Apply to All"));

    expect(mocks.guard.requestChange).toHaveBeenCalledWith("map-1");
    expect(mocks.mapSession.setGridSettings).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole("button", { name: "Square" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("asks nothing when the map has no hex records", async () => {
    const close = vi.fn();
    render(VTTGridSettings, { close });

    await fireEvent.input(screen.getByRole("slider"), {
      target: { value: "80" },
    });
    await fireEvent.click(screen.getByText("Apply to All"));

    expect(mocks.guard.requestChange).not.toHaveBeenCalled();
    expect(mocks.mapSession.setGridSettings).toHaveBeenCalledWith(
      expect.objectContaining({ gridSize: 80 }),
    );
  });

  it("does not ask when only the labels change, since no hex moves", async () => {
    mocks.guard.hasRecords.mockReturnValue(true);
    mocks.mapStore.gridType = "hex-pointy";
    render(VTTGridSettings, { close: vi.fn() });

    await fireEvent.click(screen.getByText("Alphanumeric (A01)"));
    await fireEvent.click(screen.getByText("Apply to All"));

    expect(mocks.guard.requestChange).not.toHaveBeenCalled();
    expect(mocks.mapSession.setGridSettings).toHaveBeenCalled();
  });

  it("guards Fit Grid from Map the same way, and does not start fitting on cancel", async () => {
    mocks.guard.hasRecords.mockReturnValue(true);
    mocks.guard.requestChange.mockResolvedValue(false);
    const close = vi.fn();
    render(VTTGridSettings, { close });

    await fireEvent.click(screen.getByText("Fit Grid from Map"));

    expect(mocks.guard.requestChange).toHaveBeenCalledWith("map-1");
    expect(mocks.mapSession.gridFitMode).toBe(false);
    expect(mocks.mapSession.setGridSettings).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it("starts fitting once the change is confirmed", async () => {
    mocks.guard.hasRecords.mockReturnValue(true);
    const close = vi.fn();
    render(VTTGridSettings, { close });

    await fireEvent.click(screen.getByText("Fit Grid from Map"));
    await Promise.resolve();

    expect(mocks.mapSession.gridFitMode).toBe(true);
    expect(close).toHaveBeenCalled();
  });

  it("opens and closes a guard session around the dialog", () => {
    const { unmount } = render(VTTGridSettings, { close: vi.fn() });
    expect(mocks.guard.beginSession).toHaveBeenCalledWith("map-1");

    unmount();

    expect(mocks.guard.endSession).toHaveBeenCalledTimes(1);
  });
});
