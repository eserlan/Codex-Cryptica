/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SoloTravelReadout from "./SoloTravelReadout.svelte";

describe("SoloTravelReadout", () => {
  it("shows travel with a polite announcement and resets on request", async () => {
    const recorder = {
      lastMove: { hexes: 3, distance: 18, unit: "mi" },
      total: { hexes: 12, distance: 72, unit: "mi" },
      reset: vi.fn(),
    };
    const { container } = render(SoloTravelReadout, {
      props: { recorder: recorder as never, visible: true },
    });
    expect(
      screen.getByText("Last: 3 hexes (18 mi) · Total: 12 hexes (72 mi)"),
    ).toBeTruthy();
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Reset travel distance" }),
    );
    expect(recorder.reset).toHaveBeenCalledOnce();
  });

  it("stays hidden when SOLO is off", () => {
    const { container } = render(SoloTravelReadout, {
      props: { recorder: {} as never, visible: false },
    });
    expect(
      container.querySelector("[data-help-target='vtt-travel-readout']"),
    ).toBeNull();
  });

  it("uses singular wording for one hex", () => {
    const recorder = {
      lastMove: { hexes: 1, distance: 6, unit: "mi" },
      total: { hexes: 1, distance: 6, unit: "mi" },
      reset: vi.fn(),
    };
    render(SoloTravelReadout, {
      props: { recorder: recorder as never, visible: true },
    });
    expect(
      screen.getByText("Last: 1 hex (6 mi) · Total: 1 hex (6 mi)"),
    ).toBeTruthy();
  });

  it("shows square and gridless travel without hex-only punctuation", () => {
    const recorder = {
      lastMove: { hexes: null, distance: 12, unit: "mi" },
      total: { hexes: null, distance: 12, unit: "mi" },
      reset: vi.fn(),
    };
    render(SoloTravelReadout, {
      props: { recorder: recorder as never, visible: true },
    });
    expect(screen.getByText("Last: 12 mi · Total: 12 mi")).toBeTruthy();
  });
});
