/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import HexJourneyOverlay from "./HexJourneyOverlay.svelte";

describe("HexJourneyOverlay", () => {
  it("projects the route and distinguishes origin, current and destination", () => {
    const route = {
      hexes: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ],
    };
    render(HexJourneyOverlay, {
      route,
      completedSteps: 1,
      gridConfig: { orientation: "pointy", size: 20, offsetX: 0, offsetY: 0 },
      project: (p) => p,
      viewport: { width: 500, height: 500 },
      visible: true,
    });
    expect(screen.getByLabelText("Journey route")).toBeTruthy();
    expect(screen.getByLabelText("Journey origin")).toBeTruthy();
    expect(screen.getByLabelText("Current journey hex")).toBeTruthy();
    expect(screen.getByLabelText("Journey destination")).toBeTruthy();
    expect(screen.getByLabelText("Completed journey route")).toBeTruthy();
    expect(screen.getByLabelText("Remaining journey route")).toBeTruthy();
  });
  it("renders nothing when hidden", () => {
    render(HexJourneyOverlay, {
      route: { hexes: [{ q: 0, r: 0 }] },
      completedSteps: 0,
      gridConfig: { orientation: "flat", size: 20, offsetX: 0, offsetY: 0 },
      project: (p) => p,
      viewport: { width: 500, height: 500 },
      visible: false,
    });
    expect(screen.queryByLabelText("Journey route")).toBeNull();
  });

  it("projects flat-grid coordinates through pan and zoom and culls off-screen markers", () => {
    render(HexJourneyOverlay, {
      route: {
        hexes: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 20, r: 0 },
        ],
      },
      completedSteps: 0,
      gridConfig: { orientation: "flat", size: 20, offsetX: 0, offsetY: 0 },
      project: (p) => ({ x: p.x * 2 + 30, y: p.y * 2 + 40 }),
      viewport: { width: 180, height: 180 },
      visible: true,
    });
    const origin = screen.getByLabelText("Journey origin");
    expect(origin.getAttribute("cx")).toBe("30");
    expect(origin.getAttribute("cy")).toBe("40");
    expect(screen.queryByLabelText("Journey destination")).toBeNull();
  });
});
