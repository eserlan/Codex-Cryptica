/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import BiomeDetail from "./BiomeDetail.svelte";
import { getBiome } from "biome-engine";

const tundra = getBiome("tundra")!;

describe("BiomeDetail", () => {
  it("shows the name, summary and the main image with its attribution", () => {
    render(BiomeDetail, { props: { biome: tundra } });
    expect(
      screen.getByRole("heading", { name: "Tundra", level: 2 }),
    ).toBeTruthy();
    expect(screen.getByText(tundra.summary)).toBeTruthy();
    expect(
      screen.getByRole("img", { name: tundra.images[0].alt }),
    ).toBeTruthy();
    expect(screen.getByText(/AI illustration/)).toBeTruthy();
  });

  it("offers climate, landscape, vegetation, wildlife, resources and hazards behind disclosures", async () => {
    render(BiomeDetail, { props: { biome: tundra } });
    for (const name of [
      "Climate",
      "Landscape",
      "Plants",
      "Wildlife",
      "Resources",
      "Hazards",
    ]) {
      const toggle = screen.getByRole("button", {
        name: new RegExp(`^${name}`),
      });
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
    }
    const landscape = screen.getByRole("button", { name: /^Landscape/ });
    await fireEvent.click(landscape);
    expect(landscape.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(tundra.landscape[0].text)).toBeTruthy();
    await fireEvent.click(landscape);
    expect(landscape.getAttribute("aria-expanded")).toBe("false");
  });

  it("can start with every section expanded", () => {
    render(BiomeDetail, { props: { biome: tundra, expandAll: true } });
    expect(screen.getByText(tundra.landscape[0].text)).toBeTruthy();
    expect(screen.getByText(tundra.hazards[0].text)).toBeTruthy();
  });

  it("shows a back button that calls onBack", async () => {
    let called = false;
    render(BiomeDetail, {
      props: { biome: tundra, onBack: () => (called = true) },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /Back to all biomes/ }),
    );
    expect(called).toBe(true);
  });

  it("shows conditions as ranges with units, never a bare number", () => {
    render(BiomeDetail, { props: { biome: tundra, expandAll: true } });
    const temperature = tundra.conditions.temperature!;
    expect(
      screen.getByText(
        new RegExp(
          `${temperature.low}.*${temperature.high}.*${temperature.unit}`,
        ),
      ),
    ).toBeTruthy();
    const rainfall = tundra.conditions.precipitation!;
    expect(
      screen.getByText(new RegExp(`${rainfall.low}.*${rainfall.high}`)),
    ).toBeTruthy();
  });

  it("says a condition is not a fixed value when the biome has none", () => {
    const wetland = getBiome("wetland")!;
    render(BiomeDetail, { props: { biome: wetland, expandAll: true } });
    expect(screen.getAllByText("Not a fixed value").length).toBeGreaterThan(0);
  });

  it("labels each statement as a pattern, simplification or exception", () => {
    render(BiomeDetail, { props: { biome: tundra, expandAll: true } });
    expect(screen.getAllByText("Common pattern").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Exception").length).toBeGreaterThan(0);
  });

  it("lists every cited source", () => {
    render(BiomeDetail, { props: { biome: tundra } });
    const list = screen.getByRole("list", { name: "Sources" });
    expect(list.querySelectorAll("li").length).toBe(tundra.sourceIds.length);
    expect(list.textContent).toMatch(/Köppen-Geiger/);
  });

  it("offers no climate picker or classification table", () => {
    render(BiomeDetail, { props: { biome: tundra, expandAll: true } });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText(/simplified reference/i)).toBeTruthy();
  });

  it("offers Make my own, Add to compare and Copy as Markdown when handlers are given", async () => {
    const calls: string[] = [];
    render(BiomeDetail, {
      props: {
        biome: tundra,
        onMakeMine: (id: string) => calls.push(`mine:${id}`),
        onToggleCompare: (id: string) => calls.push(`compare:${id}`),
        onCopyMarkdown: (id: string) => calls.push(`copy:${id}`),
      },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Make my own" }));
    await fireEvent.click(
      screen.getByRole("button", { name: "Add to compare" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Copy as Markdown" }),
    );
    expect(calls).toEqual(["mine:tundra", "compare:tundra", "copy:tundra"]);
  });

  it("shows no action buttons when no handlers are given", () => {
    render(BiomeDetail, { props: { biome: tundra } });
    expect(screen.queryByRole("button", { name: "Make my own" })).toBeNull();
  });
});
