/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/svelte";
import BiomeCompare from "./BiomeCompare.svelte";
import { makeStore } from "#lib/stores/biome-explorer.test-helpers.js";

function setup(ids: string[]) {
  const made = makeStore();
  for (const id of ids) made.store.toggleCompare(id);
  const utils = render(BiomeCompare, {
    props: { store: made.store, onBrowse: vi.fn() },
  });
  return { ...made, ...utils };
}

describe("BiomeCompare", () => {
  it("renders a table with column and row headers for two biomes", () => {
    setup(["tundra", "hot-desert"]);
    const table = screen.getByRole("table", {
      name: /Comparison of Tundra and Hot desert/,
    });
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
    expect(
      within(table).getByRole("rowheader", { name: "Rainfall and snow" }),
    ).toBeTruthy();
    expect(within(table).getByText("-20 to 0 °C")).toBeTruthy();
    expect(within(table).getByText("18 to 30 °C")).toBeTruthy();
  });

  it("also provides a stacked layout for narrow screens with the same values", () => {
    setup(["tundra", "hot-desert"]);
    const stacked = screen.getByTestId("biome-compare-stacked");
    expect(stacked.className).toContain("md:hidden");
    expect(within(stacked).getAllByText("-20 to 0 °C").length).toBeGreaterThan(
      0,
    );
  });

  it("says 'Doesn't apply' rather than leaving a blank", () => {
    setup(["wetland", "tundra"]);
    expect(screen.getAllByText("Doesn't apply").length).toBeGreaterThan(0);
  });

  it("removes a biome and then asks for another one", async () => {
    const { store } = setup(["tundra", "hot-desert"]);
    await fireEvent.click(
      screen.getByRole("button", { name: "Remove Tundra from comparison" }),
    );
    expect(store.compareIds).toEqual(["hot-desert"]);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/Choose at least two biomes/)).toBeTruthy();
  });

  it("asks for two biomes when none or one is chosen", () => {
    setup([]);
    expect(screen.getByText(/Choose at least two biomes/)).toBeTruthy();
  });

  it("offers a way back to the library to add more", async () => {
    const onBrowse = vi.fn();
    const made = makeStore();
    render(BiomeCompare, { props: { store: made.store, onBrowse } });
    await fireEvent.click(
      screen.getByRole("button", { name: "Browse biomes" }),
    );
    expect(onBrowse).toHaveBeenCalled();
  });

  it("labels each statement as a pattern, simplification or exception", () => {
    setup(["tundra", "savanna"]);
    expect(screen.getAllByText(/Common pattern/).length).toBeGreaterThan(0);
  });
});
