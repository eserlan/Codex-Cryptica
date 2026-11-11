/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import RegionProposalOverlay from "./RegionProposalOverlay.svelte";
import { CENTRE, GRID, MAP_ID, setupRegion } from "./region-test-helpers";

function overlay(props: Record<string, unknown> = {}) {
  const { store } = setupRegion();
  store.open(MAP_ID, "area", CENTRE, 1);
  const onPick = vi.fn();
  render(RegionProposalOverlay, {
    proposal: store.review!.proposal,
    adjustments: {},
    gridConfig: GRID,
    project: (p: { x: number; y: number }) => p,
    zoom: 1,
    selectedKey: null,
    onPick,
    ...props,
  });
  return { onPick };
}

describe("RegionProposalOverlay", () => {
  it("draws one button per proposed hex, each with an icon and a label", () => {
    overlay();
    const hexes = screen.getAllByTestId("region-proposed-hex");
    expect(hexes).toHaveLength(7);
    for (const hex of hexes) {
      expect(hex.getAttribute("aria-label")).toMatch(
        /^Proposed .+ at -?\d+,-?\d+$/,
      );
      expect(hex.querySelector("span")).toBeTruthy();
    }
  });

  it("reports the tapped hex and does not let the tap reach the map", async () => {
    const { onPick } = overlay();
    const parentTap = vi.fn();
    document.body.addEventListener("click", parentTap);
    const first = screen.getAllByTestId("region-proposed-hex")[0];
    await fireEvent.click(first);
    expect(onPick).toHaveBeenCalledWith(first.getAttribute("data-hex"));
    expect(parentTap).not.toHaveBeenCalled();
    document.body.removeEventListener("click", parentTap);
  });

  it("marks the selected hex and shows an adjusted hex with its own terrain", () => {
    overlay({
      selectedKey: "0,0",
      adjustments: { "1,0": { kind: "preset", id: "desert" } },
    });
    const centre = screen
      .getAllByTestId("region-proposed-hex")
      .find((h) => h.getAttribute("data-hex") === "0,0")!;
    expect(centre.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByLabelText("Proposed Desert at 1,0, changed by you"),
    ).toBeTruthy();
  });

  it("marks explored hexes that a regeneration would change", async () => {
    const { store, hexes } = setupRegion();
    store.open(MAP_ID, "area", CENTRE, 1);
    await store.accept();
    await hexes.setExplored(MAP_ID, CENTRE, true, "gm");
    store.open(MAP_ID, "regenerate", CENTRE, 1);
    store.setSeed("ZZZZ-9999");
    render(RegionProposalOverlay, {
      proposal: store.review!.proposal,
      adjustments: {},
      gridConfig: GRID,
      project: (p: { x: number; y: number }) => p,
      zoom: 1,
      selectedKey: null,
      onPick: vi.fn(),
    });
    expect(store.review!.proposal.exploredChanges.length).toBeGreaterThan(0);
    const marks = screen.queryAllByTestId("region-explored-mark");
    expect(marks).toHaveLength(store.review!.proposal.exploredChanges.length);
  });
});
