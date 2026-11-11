/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Map as MapRecord } from "schema";
import { HexCrawlStore } from "#lib/stores/hex-crawl/hex-crawl.svelte.js";
import { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";
import RegionGenerateMenu from "./RegionGenerateMenu.svelte";
import RegionProposalOverlay from "./RegionProposalOverlay.svelte";
import RegionReviewBar from "./RegionReviewBar.svelte";
import RegionUndoBar from "./RegionUndoBar.svelte";

const MAP_ID = "11111111-1111-4111-8111-111111111111";
const CENTRE = { q: 0, r: 0 };

function setup(saveOk = true) {
  const map = {
    id: MAP_ID,
    name: "m",
    assetPath: "m.webp",
    dimensions: { width: 800, height: 600 },
    pins: [],
  } as MapRecord;
  let tick = 1;
  const hexes = new HexCrawlStore({
    getMap: () => map,
    saveMaps: async () => saveOk,
    clock: { now: () => tick++ },
    publishCapture: vi.fn(),
    isGM: () => true,
    isGuest: () => false,
  });
  const store = new RegionGenerationStore({
    hexes,
    inBounds: () => true,
    newSeed: () => "AAAA-BBBB",
    storage: null,
    clock: { now: () => tick++ },
    canEdit: () => true,
  });
  return { store, hexes };
}

describe("Generate region UI", () => {
  it("starts a preview from the menu with the chosen operation", async () => {
    const { store } = setup();
    render(RegionGenerateMenu, { store, mapId: MAP_ID, hex: CENTRE });
    await fireEvent.click(
      screen.getByRole("button", { name: /Grow from this hex/ }),
    );
    expect(store.review?.operation).toBe("grow");
  });

  it("shows the seed, the AI-off line and hides the radius for grow", () => {
    const { store } = setup();
    store.open(MAP_ID, "grow", CENTRE);
    render(RegionReviewBar, { store, selectedKey: null });
    expect(screen.getByDisplayValue("AAAA-BBBB")).toBeTruthy();
    expect(screen.getByTestId("region-ai-off").textContent).toContain(
      "Generated on this device. No AI is used.",
    );
    expect(screen.queryByText(/Radius/)).toBeNull();
  });

  it("shows the radius for an area, and cancel leaves no review", async () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 2);
    render(RegionReviewBar, { store, selectedKey: null });
    expect(screen.getByText(/Radius: 2/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(store.review).toBeNull();
  });

  it("rerolls and copies the seed", async () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 2);
    const copy = vi.fn(async () => true);
    render(RegionReviewBar, { store, selectedKey: null, copy });
    await fireEvent.click(screen.getByRole("button", { name: "Copy seed" }));
    expect(copy).toHaveBeenCalledWith("AAAA-BBBB");
    await fireEvent.click(screen.getByRole("button", { name: "Reroll" }));
    expect(store.review?.seed).toBe("AAAA-BBBB");
  });

  it("adjusts the tapped hex and picking a hex reports its key", async () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 1);
    const onPick = vi.fn();
    render(RegionProposalOverlay, {
      proposal: store.review!.proposal,
      adjustments: {},
      gridConfig: {
        orientation: "pointy",
        size: 40,
        offsetX: 0,
        offsetY: 0,
      } as never,
      project: (p: { x: number; y: number }) => p,
      zoom: 1,
      selectedKey: null,
      onPick,
    });
    const hexes = screen.getAllByTestId("region-proposed-hex");
    expect(hexes).toHaveLength(7);
    await fireEvent.click(hexes[0]);
    expect(onPick).toHaveBeenCalledWith(hexes[0].getAttribute("data-hex"));
  });

  it("lets the GM change a selected hex through the picker", async () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 1);
    render(RegionReviewBar, { store, selectedKey: "0,0" });
    await fireEvent.click(screen.getByRole("button", { name: "Desert" }));
    expect(store.review?.adjustments["0,0"]).toEqual({
      kind: "preset",
      id: "desert",
    });
  });

  it("accept saves and the undo bar offers Undo", async () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 1);
    render(RegionReviewBar, { store, selectedKey: null });
    await fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    render(RegionUndoBar, { store });
    expect(await screen.findByText(/Saved 7 hexes/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(store.message).toEqual({ kind: "undone" });
  });

  it("says nothing was changed when the save fails", async () => {
    const { store } = setup(false);
    store.open(MAP_ID, "area", CENTRE, 1);
    await store.accept();
    store.cancel();
    render(RegionUndoBar, { store });
    expect(
      await screen.findByText("Could not save. Nothing was changed."),
    ).toBeTruthy();
  });

  it("makes no network request while generating", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 4);
    await store.accept();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("RegionSeedControls timer", () => {
  it("shows the copied tick, clears it after a moment, and cleans up on unmount", async () => {
    vi.useFakeTimers();
    try {
      const { default: Seed } = await import("./RegionSeedControls.svelte");
      const { store } = setup();
      store.open(MAP_ID, "area", CENTRE, 2);
      const copy = vi.fn(async () => true);
      const view = render(Seed, { store, copy });
      await fireEvent.click(screen.getByRole("button", { name: "Copy seed" }));
      await vi.advanceTimersByTimeAsync(1600);
      view.unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the old seed when the typed one is empty", async () => {
    const { default: Seed } = await import("./RegionSeedControls.svelte");
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 2);
    render(Seed, { store });
    const input = screen.getByDisplayValue("AAAA-BBBB") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "  " } });
    await fireEvent.change(input);
    expect(store.review?.seed).toBe("AAAA-BBBB");
    expect(input.value).toBe("AAAA-BBBB");
  });
});
