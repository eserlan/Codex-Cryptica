/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import FactionFormFields from "./FactionFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  factionConfig: {
    themes: [
      "Classic Fantasy",
      "Cyberpunk / Corporate",
      "Vampire / Gothic Noir",
      "Sci-Fi / Space Opera",
      "Modern Conspiracy",
      "Post-Apocalyptic",
    ],
    typesByTheme: {
      "Classic Fantasy": ["Merchant Guild", "Secret Society", "Arcane Circle"],
      "Post-Apocalyptic": [
        "Scavenger Clan",
        "Raider Warband",
        "Survivor Collective",
      ],
      "Cyberpunk / Corporate": ["Corporate Division", "Hacker Collective"],
      "Vampire / Gothic Noir": ["Occult Coven", "Criminal Syndicate"],
      "Sci-Fi / Space Opera": ["Planetary Council", "Resistance Cell"],
      "Modern Conspiracy": ["Secret Society", "Intelligence Bureau"],
    },
    scopesByTheme: {
      "Classic Fantasy": ["Local district", "Single city"],
      "Post-Apocalyptic": ["Single settlement", "Wasteland outpost cluster"],
      "Cyberpunk / Corporate": ["Single arcology block", "City megaplex"],
      "Vampire / Gothic Noir": [
        "Single city underbelly",
        "Hidden manor & surrounds",
      ],
      "Sci-Fi / Space Opera": ["Single station or colony", "Planetary surface"],
      "Modern Conspiracy": ["City borough", "Metropolitan area"],
    },
    goalsByTheme: {
      "Classic Fantasy": ["Goal"],
      "Post-Apocalyptic": ["Wasteland Goal"],
      "Cyberpunk / Corporate": ["Corp Goal"],
      "Vampire / Gothic Noir": ["Gothic Goal"],
      "Sci-Fi / Space Opera": ["Sci-Fi Goal"],
      "Modern Conspiracy": ["Conspiracy Goal"],
    },
    alignments: ["Pragmatic and profit-driven"],
    conflicts: ["Conflict"],
    hooks: ["Hook"],
  },
}));

describe("FactionFormFields Theme Swapping", () => {
  it("filters faction types dynamically based on selected theme and calls onSurprise", async () => {
    const theme = "Classic Fantasy";
    const type = "Arcane Circle";
    const scope = "Single city";
    const alignment = "Pragmatic and profit-driven";
    const campaignContext = "";
    const onSurprise = vi.fn();

    const { component: _component } = render(FactionFormFields, {
      props: {
        theme,
        type,
        scope,
        alignment,
        campaignContext,
        onSurprise,
      },
    });

    // Verify initial type is present (Classic Fantasy includes Arcane Circle)
    expect(screen.getByText("Arcane Circle")).toBeTruthy();

    // Select Post-Apocalyptic theme
    const themeSelect = screen.getByLabelText("Choose a vibe");
    await fireEvent.change(themeSelect, {
      target: { value: "Post-Apocalyptic" },
    });

    // Type should dynamically shift to Post-Apocalyptic default (e.g. Scavenger Tribe)
    await waitFor(() => {
      expect(screen.queryByText("Arcane Circle")).toBeNull();
      expect(screen.getByText("Scavenger Tribe")).toBeTruthy();
    });

    // Clicking Surprise Me randomizes fields and triggers callback
    const surpriseBtn = screen.getByText("Surprise Me");
    await fireEvent.click(surpriseBtn);
    expect(onSurprise).toHaveBeenCalled();
  });

  it("reveals a custom input when Own option is selected", async () => {
    render(FactionFormFields, {
      props: {
        theme: "Classic Fantasy",
        type: "Arcane Circle",
        scope: "Single city",
        alignment: "Pragmatic and profit-driven",
        campaignContext: "",
      },
    });

    const typeSelect = screen.getByLabelText("Choose what they are");
    await fireEvent.change(typeSelect, { target: { value: "__custom__" } });

    expect(
      screen.getByLabelText("Choose what they are (Own option)"),
    ).toBeTruthy();
  });
});
