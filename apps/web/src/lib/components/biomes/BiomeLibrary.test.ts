/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import BiomeLibrary from "./BiomeLibrary.svelte";
import { BIOME_CATALOGUE } from "biome-engine";

// The card's open button is named by the biome name followed by its summary;
// the image lightbox button ("Enlarge illustration of …") also mentions the
// name, so anchor on the start to target the card button alone.
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cardButtonName = (name: string) => new RegExp(`^${escapeRegExp(name)}`);

describe("BiomeLibrary", () => {
  it("renders one card per biome with an image, name and summary", () => {
    render(BiomeLibrary, { props: { onOpen: () => {} } });
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(BIOME_CATALOGUE.length);
    const first = BIOME_CATALOGUE[0];
    expect(
      screen.getByRole("button", { name: cardButtonName(first.name) }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: `Enlarge illustration of ${first.name}`,
      }),
    ).toBeTruthy();
    expect(screen.getByText(first.summary)).toBeTruthy();
  });

  it("filters cards as the user types and announces the count", async () => {
    render(BiomeLibrary, { props: { onOpen: () => {} } });
    await fireEvent.input(screen.getByRole("searchbox"), {
      target: { value: "desert" },
    });
    expect(screen.getAllByRole("listitem").length).toBeLessThan(
      BIOME_CATALOGUE.length,
    );
    expect(screen.getByText("Hot desert")).toBeTruthy();
    const live = screen.getByTestId("biome-result-count");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toMatch(/\d+ biomes? shown/);
  });

  it("narrows the cards with filter chips and reports pressed state", async () => {
    render(BiomeLibrary, { props: { onOpen: () => {} } });
    const cold = screen.getByRole("button", { name: /^Cold/ });
    expect(cold.getAttribute("aria-pressed")).toBe("false");
    await fireEvent.click(cold);
    expect(cold.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Hot desert")).toBeNull();
    expect(screen.getByText("Tundra")).toBeTruthy();
  });

  it("shows an empty state with a Clear search button that restores everything", async () => {
    render(BiomeLibrary, { props: { onOpen: () => {} } });
    await fireEvent.input(screen.getByRole("searchbox"), {
      target: { value: "zzzzqqqq" },
    });
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText(/No biomes match/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(
      BIOME_CATALOGUE.length,
    );
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
  });

  it("opens a biome when its card is chosen", async () => {
    const onOpen = vi.fn();
    render(BiomeLibrary, { props: { onOpen } });
    await fireEvent.click(
      screen.getByRole("button", {
        name: cardButtonName(BIOME_CATALOGUE[0].name),
      }),
    );
    expect(onOpen).toHaveBeenCalledWith(BIOME_CATALOGUE[0].id);
  });

  it("does not open the biome when its illustration is enlarged", async () => {
    const onOpen = vi.fn();
    render(BiomeLibrary, { props: { onOpen } });
    await fireEvent.click(
      screen.getByRole("button", {
        name: `Enlarge illustration of ${BIOME_CATALOGUE[0].name}`,
      }),
    );
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("offers Start from blank only when a handler is given", async () => {
    const onStartBlank = vi.fn();
    const { unmount } = render(BiomeLibrary, {
      props: { onOpen: () => {}, onStartBlank },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Start from blank" }),
    );
    expect(onStartBlank).toHaveBeenCalledOnce();
    unmount();
    render(BiomeLibrary, { props: { onOpen: () => {} } });
    expect(
      screen.queryByRole("button", { name: "Start from blank" }),
    ).toBeNull();
  });
});
