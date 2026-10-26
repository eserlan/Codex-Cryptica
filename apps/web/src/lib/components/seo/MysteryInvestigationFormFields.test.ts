/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MysteryInvestigationFormFields from "./MysteryInvestigationFormFields.svelte";

vi.mock("#lib/services/seo/generator-config.js", () => ({
  factionConfig: {
    themes: ["Classic Fantasy", "Cyberpunk / Corporate", "Western"],
  },
  mysteryConfig: {
    tones: ["Grounded", "Eerie", "Tense"],
    types: ["Murder", "Disappearance", "Heist"],
    scopes: ["One-shot case", "Campaign thread"],
    complexities: ["Simple", "Standard (4 suspects)", "Layered"],
    clueDensities: ["Sparse", "Balanced", "Rich"],
    pressures: ["Low", "Moderate", "High"],
  },
  // Always pick the last option so a changed value is easy to see.
  pickFrom: (values: string[]) => values[values.length - 1],
}));

const baseProps = {
  genre: "Classic Fantasy",
  tone: "Grounded",
  mysteryType: "Murder",
  scope: "One-shot case",
  complexity: "Simple",
  clueDensity: "Sparse",
  pressure: "Low",
  campaignContext: "",
};

describe("MysteryInvestigationFormFields", () => {
  it("keeps the chosen genre when Surprise Me randomizes the case options", async () => {
    const onSurprise = vi.fn();
    render(MysteryInvestigationFormFields, { ...baseProps, onSurprise });

    await fireEvent.click(screen.getByText("Surprise Me"));

    expect(
      (screen.getByLabelText("Genre / setting") as HTMLSelectElement).value,
    ).toBe("Classic Fantasy");
    expect((screen.getByLabelText("Tone") as HTMLSelectElement).value).toBe(
      "Tense",
    );
    expect(
      (screen.getByLabelText("Danger / pressure") as HTMLSelectElement).value,
    ).toBe("High");
    expect(onSurprise).toHaveBeenCalledOnce();
  });

  it("does not require an onSurprise handler", async () => {
    render(MysteryInvestigationFormFields, baseProps);

    await fireEvent.click(screen.getByText("Surprise Me"));

    expect(
      (screen.getByLabelText("Genre / setting") as HTMLSelectElement).value,
    ).toBe("Classic Fantasy");
  });
});
