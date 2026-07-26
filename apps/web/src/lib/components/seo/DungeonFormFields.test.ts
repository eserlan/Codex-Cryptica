/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DungeonFormFields from "./DungeonFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  dungeonConfig: {
    purposes: [
      "Temple & Shrine",
      "Fortress & Citadel",
      "Data Vault & Archive",
      "Ancestral Mausoleum",
    ],
    currentStates: [
      "Active Monster Lair",
      "Abandoned Ruins",
      "Overrun by Squatters",
    ],
    scales: [
      "Small Lair (1-2 Sectors)",
      "Medium Complex (3-4 Sectors)",
      "Sprawling Megadungeon (5+ Sectors)",
    ],
    purposesByGenre: {
      Fantasy: ["Temple & Shrine", "Fortress & Citadel"],
      "Cyberpunk / Corporate": ["Data Vault & Archive", "Fortress & Citadel"],
      "Vampire / Gothic Noir": ["Ancestral Mausoleum", "Temple & Shrine"],
    },
    currentStatesByGenre: {
      Fantasy: ["Active Monster Lair", "Abandoned Ruins"],
      "Cyberpunk / Corporate": ["Overrun by Squatters", "Abandoned Ruins"],
      "Vampire / Gothic Noir": ["Abandoned Ruins", "Active Monster Lair"],
    },
  },
  factionConfig: {
    themes: [
      "Fantasy",
      "Cyberpunk / Corporate",
      "Vampire / Gothic Noir",
      "Sci-Fi / Space Opera",
    ],
  },
  pickFrom: (arr: string[]) => arr[0],
  forDungeonGenre: (record: Record<string, string[]>, genre: string) =>
    record[genre] ??
    record[genre.replace(/^Classic /, "")] ??
    record[genre.replace(/ \/ .*/, "")] ??
    record["Fantasy"] ??
    record["Classic Fantasy"],
}));

describe("DungeonFormFields theme selector", () => {
  it("renders a 'Choose a vibe' theme dropdown alongside the dungeon controls", () => {
    render(DungeonFormFields, {
      props: {
        theme: "Fantasy",
        purpose: "Temple & Shrine",
        currentState: "Active Monster Lair",
        scale: "Medium Complex (3-4 Sectors)",
        campaignContext: "",
      },
    });

    const themeSelect = screen.getByLabelText(
      "Choose a vibe",
    ) as HTMLSelectElement;
    expect(themeSelect).toBeTruthy();
    expect(themeSelect.value).toBe("Fantasy");
    expect(screen.getByText("Cyberpunk / Corporate")).toBeTruthy();
    // The existing Purpose/Current State/Scale controls are still present.
    expect(screen.getByLabelText("Original Purpose")).toBeTruthy();
    expect(screen.getByLabelText("Current State & Function")).toBeTruthy();
    expect(screen.getByLabelText("Complex Scale")).toBeTruthy();
  });

  it("updates the theme select's value when a different vibe is chosen", async () => {
    render(DungeonFormFields, {
      props: {
        theme: "Fantasy",
        purpose: "Temple & Shrine",
        currentState: "Active Monster Lair",
        scale: "Medium Complex (3-4 Sectors)",
        campaignContext: "",
      },
    });

    const themeSelect = screen.getByLabelText(
      "Choose a vibe",
    ) as HTMLSelectElement;
    await fireEvent.change(themeSelect, {
      target: { value: "Vampire / Gothic Noir" },
    });

    expect(themeSelect.value).toBe("Vampire / Gothic Noir");
  });

  it("leaves the selected theme untouched when Surprise Me is clicked", async () => {
    const onSurprise = vi.fn();

    render(DungeonFormFields, {
      props: {
        theme: "Sci-Fi / Space Opera",
        purpose: "Temple & Shrine",
        currentState: "Active Monster Lair",
        scale: "Medium Complex (3-4 Sectors)",
        campaignContext: "",
        onSurprise,
      },
    });

    const themeSelect = screen.getByLabelText(
      "Choose a vibe",
    ) as HTMLSelectElement;
    const surpriseBtn = screen.getByText("Surprise Me");
    await fireEvent.click(surpriseBtn);

    expect(themeSelect.value).toBe("Sci-Fi / Space Opera");
    expect(onSurprise).toHaveBeenCalled();
  });

  it("offers only the purposes and states that suit the chosen vibe", () => {
    render(DungeonFormFields, {
      props: {
        theme: "Cyberpunk / Corporate",
        purpose: "Data Vault & Archive",
        currentState: "Overrun by Squatters",
        scale: "Medium Complex (3-4 Sectors)",
        campaignContext: "",
      },
    });

    // Cyberpunk gets its own purposes; the fantasy-only ones are not offered.
    expect(screen.getByText("Data Vault & Archive")).toBeTruthy();
    expect(screen.queryByText("Temple & Shrine")).toBeNull();
    expect(screen.getByText("Overrun by Squatters")).toBeTruthy();
    expect(screen.queryByText("Active Monster Lair")).toBeNull();
  });

  it("resets a now-unavailable purpose and state when the vibe changes", async () => {
    render(DungeonFormFields, {
      props: {
        theme: "Fantasy",
        purpose: "Temple & Shrine",
        currentState: "Active Monster Lair",
        scale: "Medium Complex (3-4 Sectors)",
        campaignContext: "",
      },
    });

    const purposeSelect = screen.getByLabelText(
      "Original Purpose",
    ) as HTMLSelectElement;
    const stateSelect = screen.getByLabelText(
      "Current State & Function",
    ) as HTMLSelectElement;
    expect(purposeSelect.value).toBe("Temple & Shrine");
    expect(stateSelect.value).toBe("Active Monster Lair");

    const themeSelect = screen.getByLabelText("Choose a vibe");
    await fireEvent.change(themeSelect, {
      target: { value: "Cyberpunk / Corporate" },
    });

    // "Temple & Shrine" / "Active Monster Lair" aren't cyberpunk options, so both
    // fall back to that genre's first choice rather than staying on a dead value.
    await waitFor(() => {
      expect(purposeSelect.value).toBe("Data Vault & Archive");
      expect(stateSelect.value).toBe("Overrun by Squatters");
    });
  });

  it("keeps a purpose that is valid in both vibes when the vibe changes", async () => {
    render(DungeonFormFields, {
      props: {
        theme: "Fantasy",
        purpose: "Fortress & Citadel",
        currentState: "Abandoned Ruins",
        scale: "Medium Complex (3-4 Sectors)",
        campaignContext: "",
      },
    });

    const purposeSelect = screen.getByLabelText(
      "Original Purpose",
    ) as HTMLSelectElement;
    const themeSelect = screen.getByLabelText("Choose a vibe");
    await fireEvent.change(themeSelect, {
      target: { value: "Cyberpunk / Corporate" },
    });

    // Fortress & Citadel is offered by both genres, so it must survive the switch.
    await waitFor(() => {
      expect(purposeSelect.value).toBe("Fortress & Citadel");
    });
  });
});
