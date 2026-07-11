/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ShipFormFields from "./ShipFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  shipConfig: {
    genres: ["Sci-Fi", "Fantasy"],
    rolesByGenre: {
      "Sci-Fi": ["Freighter", "Warship"],
      Fantasy: ["Merchant Galleon", "War Galley"],
    },
    scales: ["Small crew ship", "Frigate / Corvette"],
    conditions: ["Pristine", "Worn"],
    tones: ["Military", "Tense"],
  },
  pickFrom: <T>(arr: readonly T[]) => arr[0],
}));

describe("ShipFormFields", () => {
  it("resets ship role to the new genre's first role when genre changes", async () => {
    render(ShipFormFields, {
      props: {
        genre: "Sci-Fi",
        role: "Warship",
        scale: "Small crew ship",
        condition: "Pristine",
        tone: "Military",
        campaignContext: "",
      },
    });

    expect(screen.getByText("Warship")).toBeTruthy();

    const genreSelect = screen.getByLabelText("Genre");
    await fireEvent.change(genreSelect, { target: { value: "Fantasy" } });

    expect(screen.getByText("Merchant Galleon")).toBeTruthy();
  });

  it("notifies the page when the ship genre changes", async () => {
    const onGenreChange = vi.fn();
    render(ShipFormFields, {
      props: {
        genre: "Sci-Fi",
        role: "Freighter",
        scale: "Small crew ship",
        condition: "Pristine",
        tone: "Military",
        campaignContext: "",
        onGenreChange,
      },
    });

    await fireEvent.change(screen.getByLabelText("Genre"), {
      target: { value: "Fantasy" },
    });

    expect(onGenreChange).toHaveBeenCalledWith("Fantasy");
  });

  it("randomizes fields and calls onSurprise when Surprise Me is clicked", async () => {
    const onSurprise = vi.fn();
    render(ShipFormFields, {
      props: {
        genre: "Sci-Fi",
        role: "Freighter",
        scale: "Small crew ship",
        condition: "Pristine",
        tone: "Military",
        campaignContext: "",
        onSurprise,
      },
    });

    await fireEvent.click(screen.getByText("Surprise Me"));
    expect(onSurprise).toHaveBeenCalled();
  });
});
