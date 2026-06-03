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
    types: [
      "Merchant Guild",
      "Secret Society",
      "Mercenary Company",
      "Temple Order",
      "Criminal Syndicate",
      "Rebel Cell",
      "Arcane Circle",
    ],
    scopes: ["Local district", "Single city"],
    alignments: ["Pragmatic and profit-driven"],
    goals: ["Goal"],
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
});
