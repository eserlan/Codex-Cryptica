/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import RegionUndoBar from "./RegionUndoBar.svelte";
import { CENTRE, MAP_ID, setupRegion } from "./region-test-helpers";

describe("RegionUndoBar", () => {
  it("shows nothing before there is a result", () => {
    const { store } = setupRegion();
    render(RegionUndoBar, { store });
    expect(screen.queryByTestId("region-message")).toBeNull();
  });

  it("offers Undo only while it is safe, and Undo restores the map", async () => {
    const { store, hexes } = setupRegion();
    store.open(MAP_ID, "area", CENTRE, 1);
    await store.accept();
    render(RegionUndoBar, { store });
    await fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
    expect(await screen.findByText("Region undone.")).toBeTruthy();
    expect(hexes.recordFor(MAP_ID, CENTRE)).toBeUndefined();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("hides Undo once something else was saved and says why when it is blocked", async () => {
    const { store, hexes } = setupRegion();
    store.open(MAP_ID, "area", CENTRE, 1);
    await store.accept();
    await hexes.setNotes(MAP_ID, { q: 9, r: 9 }, "later");
    render(RegionUndoBar, { store });
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("explains a refusal and can be dismissed", async () => {
    const { store } = setupRegion();
    store.open(MAP_ID, "gaps", CENTRE, 2);
    render(RegionUndoBar, { store });
    expect(
      await screen.findByText("There is nothing to generate here."),
    ).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByTestId("region-message")).toBeNull();
  });
});
