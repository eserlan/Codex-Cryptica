/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CreatureFormFields from "./CreatureFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  creatureConfig: {
    genres: [
      "Classic Fantasy",
      "Cyberpunk / Corporate",
      "Sci-Fi / Space Opera",
    ],
    categories: [
      "Natural Beast",
      "Aberration / Eldritch Horror",
      "Construct / Artificial Life",
    ],
    threatLevels: [
      "Harmless / Vermin",
      "Dangerous / Predator",
      "Colossal / Legendary Threat",
    ],
    sizes: ["Small", "Medium", "Large", "Colossal"],
    temperaments: [
      "Instinctual / Territorial",
      "Semi-Sapient",
      "Alien / Inscrutable",
    ],
    habitats: [
      "Dense Forest / Deep Jungle",
      "Sprawl Underground / Sewers",
      "Asteroid Belts / Void",
    ],
    habitatByTheme: {
      "Classic Fantasy": [
        "Dense Forest / Deep Jungle",
        "Ancient Ruins / Crypts",
      ],
      "Cyberpunk / Corporate": [
        "Sprawl Underground / Sewers",
        "Corporate Enclaves",
      ],
      "Sci-Fi / Space Opera": ["Asteroid Belts / Void", "Alien Biome"],
    },
    ecologicalRoles: [
      "Apex Predator",
      "Ambush Hunter",
      "Scavenger / Decomposer",
    ],
  },
  pickFrom: (arr: string[]) => arr[arr.length - 1],
}));

const baseProps = {
  genre: "Classic Fantasy",
  category: "Natural Beast",
  threatLevel: "Dangerous / Predator",
  size: "Medium",
  temperament: "Instinctual / Territorial",
  habitat: "Dense Forest / Deep Jungle",
  ecologicalRole: "Apex Predator",
  campaignContext: "",
};

describe("CreatureFormFields", () => {
  it("renders all expected form fields", () => {
    render(CreatureFormFields, { props: { ...baseProps } });

    expect(screen.getByLabelText("Genre / Theme")).toBeTruthy();
    expect(screen.getByLabelText("Creature Category / Origin")).toBeTruthy();
    expect(screen.getByLabelText("Threat Level")).toBeTruthy();
    expect(screen.getByLabelText("Size")).toBeTruthy();
    expect(screen.getByLabelText("Intelligence / Temperament")).toBeTruthy();
    expect(screen.getByLabelText("Habitat / Environment")).toBeTruthy();
    expect(screen.getByLabelText("Ecological Role / Behaviour")).toBeTruthy();
    expect(screen.getByLabelText("Add campaign context")).toBeTruthy();
  });

  it("leaves the selected genre untouched when Surprise Me is clicked", async () => {
    const onSurprise = vi.fn();
    const onGenreChange = vi.fn();

    render(CreatureFormFields, {
      props: {
        ...baseProps,
        genre: "Cyberpunk / Corporate",
        onSurprise,
        onGenreChange,
      },
    });

    await fireEvent.click(screen.getByText("Surprise Me"));

    expect(onSurprise).toHaveBeenCalled();
    // Genre is a user-controlled axis and must not be mutated on surprise
    expect(onGenreChange).not.toHaveBeenCalled();
    const genreSelect = screen.getByLabelText(
      "Genre / Theme",
    ) as HTMLSelectElement;
    expect(genreSelect.value).toBe("Cyberpunk / Corporate");
  });

  it("reports genre changes when user changes the genre select", async () => {
    const onGenreChange = vi.fn();

    render(CreatureFormFields, {
      props: { ...baseProps, onGenreChange },
    });

    await fireEvent.change(screen.getByLabelText("Genre / Theme"), {
      target: { value: "Sci-Fi / Space Opera" },
    });

    expect(onGenreChange).toHaveBeenCalledWith("Sci-Fi / Space Opera");
  });

  it("allows up to 4000 characters of campaign context", () => {
    render(CreatureFormFields, { props: { ...baseProps } });

    const context = screen.getByLabelText(
      "Add campaign context",
    ) as HTMLTextAreaElement;
    expect(context.maxLength).toBe(4000);
  });
});
