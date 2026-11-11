/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { formatHexLabel } from "map-engine";
import RegionReviewBar from "./RegionReviewBar.svelte";
import { CENTRE, MAP_ID, setupRegion } from "./region-test-helpers";

function open(operation: "area" | "grow" = "area", radius = 2) {
  const ctx = setupRegion();
  ctx.store.open(MAP_ID, operation, CENTRE, radius);
  return ctx;
}

describe("RegionReviewBar", () => {
  it("shows the counts, the AI-off line and the seed", () => {
    const { store } = open();
    render(RegionReviewBar, { store, selectedKey: null });
    expect(screen.getByText(/Covers 19 hexes/)).toBeTruthy();
    expect(screen.getByText(/19 hexes to generate/)).toBeTruthy();
    expect(screen.getByTestId("region-ai-off").textContent).toContain(
      "Generated on this device. No AI is used.",
    );
    expect(screen.getByDisplayValue("AAAA-BBBB")).toBeTruthy();
  });

  it("hides the radius for grow and shows it, bounded 1 to 12, for an area", () => {
    const grow = open("grow");
    const view = render(RegionReviewBar, {
      store: grow.store,
      selectedKey: null,
    });
    expect(screen.queryByText(/Radius/)).toBeNull();
    view.unmount();
    const area = open("area", 3);
    render(RegionReviewBar, { store: area.store, selectedKey: null });
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect([slider.min, slider.max, slider.value]).toEqual(["1", "12", "3"]);
  });

  it("changing the radius makes a new proposal and saves nothing", async () => {
    const { store, map } = open("area", 2);
    render(RegionReviewBar, { store, selectedKey: null });
    await fireEvent.input(screen.getByRole("slider"), {
      target: { value: "4" },
    });
    expect(store.review?.radius).toBe(4);
    expect(map.hexCrawl).toBeUndefined();
  });

  it("Cancel and Escape close the review without saving", async () => {
    const { store, map } = open();
    render(RegionReviewBar, { store, selectedKey: null });
    await fireEvent.keyDown(screen.getByTestId("region-review-bar"), {
      key: "Escape",
    });
    expect(store.review).toBeNull();
    store.open(MAP_ID, "area", CENTRE, 2);
    await fireEvent.click(
      await screen.findByRole("button", { name: "Cancel" }),
    );
    expect(store.review).toBeNull();
    expect(map.hexCrawl).toBeUndefined();
  });

  it("Accept saves, and is disabled while saving", async () => {
    const { store, map } = open();
    render(RegionReviewBar, { store, selectedKey: null });
    const accept = screen.getByRole("button", { name: "Accept" });
    const done = fireEvent.click(accept);
    expect(store.busy).toBe(true);
    expect((accept as HTMLButtonElement).disabled).toBe(true);
    await done;
    await vi.waitFor(() => expect(store.review).toBeNull());
    expect(Object.keys(map.hexCrawl?.hexes ?? {})).toHaveLength(19);
  });

  it("a failed save shows an alert and keeps the review open", async () => {
    const ctx = setupRegion(false);
    ctx.store.open(MAP_ID, "area", CENTRE, 1);
    render(RegionReviewBar, { store: ctx.store, selectedKey: null });
    await fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Nothing was changed",
    );
    expect(ctx.store.review).not.toBeNull();
  });

  it("collapses to one row and expands again", async () => {
    const { store } = open();
    render(RegionReviewBar, { store, selectedKey: null });
    expect(screen.getByText("Landscape and amounts")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Collapse review" }),
    );
    expect(screen.queryByText("Landscape and amounts")).toBeNull();
    expect(screen.getByRole("button", { name: "Accept" })).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Expand review" }),
    );
    expect(screen.getByText("Landscape and amounts")).toBeTruthy();
  });

  it("moves focus into the review and gives it back when it closes", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { store } = open();
    const view = render(RegionReviewBar, { store, selectedKey: null });
    expect(document.activeElement).toBe(
      screen.getByTestId("region-review-bar"),
    );
    view.unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("selects a proposed hex by label, and rejects one outside the proposal", async () => {
    const { store } = open("area", 1);
    const onSelect = vi.fn();
    render(RegionReviewBar, { store, selectedKey: null, onSelect });
    const field = screen.getByLabelText("Hex label");
    await fireEvent.input(field, { target: { value: "9,9" } });
    await fireEvent.click(screen.getByRole("button", { name: "Select" }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toBeTruthy();
    await fireEvent.input(field, {
      target: { value: formatHexLabel({ q: 1, r: 0 }, undefined, "pointy") },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Select" }));
    expect(onSelect).toHaveBeenCalledWith("1,0");
  });

  it("warns about explored hexes when regenerating", async () => {
    const ctx = setupRegion();
    ctx.store.open(MAP_ID, "area", CENTRE, 1);
    await ctx.store.accept();
    await ctx.hexes.setExplored(MAP_ID, CENTRE, true, "gm");
    ctx.store.open(MAP_ID, "regenerate", CENTRE, 1);
    ctx.store.setSeed("ZZZZ-9999");
    render(RegionReviewBar, { store: ctx.store, selectedKey: null });
    expect(screen.getByText(/hexes would change/)).toBeTruthy();
  });
});
