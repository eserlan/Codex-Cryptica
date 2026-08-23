/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import PuzzleFormFields from "./PuzzleFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  puzzleConfig: {
    genres: ["Fantasy"],
    purposes: ["Sealed door", "Disable device"],
    complexities: ["Simple", "Elaborate"],
    styles: ["Environmental", "Magical"],
    participationStyles: [
      "Any character can contribute",
      "Whole-party cooperation",
    ],
    failurePressures: ["None", "Danger"],
    systems: ["System-neutral", "D&D 5e"],
  },
  pickFrom: <T>(values: readonly T[]) => values[values.length - 1],
}));

describe("PuzzleFormFields", () => {
  const props = {
    genre: "Fantasy",
    purpose: "Sealed door",
    complexity: "Simple",
    style: "Environmental",
    partyLevel: "",
    playerCount: "",
    capabilities: "",
    participationStyle: "Any character can contribute",
    failurePressure: "None",
    system: "System-neutral",
    downstreamConsequence: "",
    campaignContext: "",
  };

  it("keeps the default system-neutral when Surprise Me rolls", async () => {
    render(PuzzleFormFields, { props });
    await fireEvent.click(screen.getByRole("button", { name: "Surprise Me" }));
    expect(
      (screen.getByLabelText("System tailoring") as HTMLSelectElement).value,
    ).toBe("System-neutral");
  });

  it("preserves system tailoring only when the user selected it", async () => {
    render(PuzzleFormFields, { props: { ...props, system: "D&D 5e" } });
    await fireEvent.click(screen.getByRole("button", { name: "Surprise Me" }));
    expect(
      (screen.getByLabelText("System tailoring") as HTMLSelectElement).value,
    ).toBe("D&D 5e");
  });
});
