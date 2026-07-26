/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DungeonFormFields from "./DungeonFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  dungeonConfig: {
    purposes: ["Temple & Shrine", "Fortress & Citadel"],
    currentStates: ["Active Monster Lair", "Abandoned Ruins"],
    scales: [
      "Small Lair (1-2 Sectors)",
      "Medium Complex (3-4 Sectors)",
      "Sprawling Megadungeon (5+ Sectors)",
    ],
  },
  factionConfig: {
    themes: [
      "Classic Fantasy",
      "Cyberpunk / Corporate",
      "Vampire / Gothic Noir",
      "Sci-Fi / Space Opera",
    ],
  },
  pickFrom: (arr: string[]) => arr[0],
}));

describe("DungeonFormFields theme selector", () => {
  it("renders a 'Choose a vibe' theme dropdown alongside the dungeon controls", () => {
    render(DungeonFormFields, {
      props: {
        theme: "Classic Fantasy",
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
    expect(themeSelect.value).toBe("Classic Fantasy");
    expect(screen.getByText("Cyberpunk / Corporate")).toBeTruthy();
    // The existing Purpose/Current State/Scale controls are still present.
    expect(screen.getByLabelText("Original Purpose")).toBeTruthy();
    expect(screen.getByLabelText("Current State & Function")).toBeTruthy();
    expect(screen.getByLabelText("Complex Scale")).toBeTruthy();
  });

  it("updates the theme select's value when a different vibe is chosen", async () => {
    render(DungeonFormFields, {
      props: {
        theme: "Classic Fantasy",
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
});
