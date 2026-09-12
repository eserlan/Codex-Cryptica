/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import PersonalityFormFields from "./PersonalityFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  personalityConfig: {
    genres: ["Classic Fantasy", "Cyberpunk / Corporate"],
    roleHints: ["Random", "Ally / Companion"],
    temperaments: ["Random", "Calm"],
    socialStyles: ["Random", "Warm and open"],
    moralOutlooks: ["Random", "Pragmatic self-interest"],
    emotionalOpenness: ["Random", "Very open"],
    confidenceLevels: ["Random", "Quietly certain"],
    optimismSpectrum: ["Random", "Cautiously hopeful"],
    expressiveness: ["Random", "Measured"],
    cooperationStyles: ["Random", "Cooperative"],
  },
  pickFrom: <T>(values: readonly T[]) => values[values.length - 1],
}));

describe("PersonalityFormFields", () => {
  const props = {
    genre: "Classic Fantasy",
    roleHint: "Random",
    temperament: "Random",
    socialStyle: "Random",
    moralOutlook: "Random",
    emotionalOpenness: "Random",
    confidence: "Random",
    optimism: "Random",
    expressiveness: "Random",
    cooperationStyle: "Random",
    ageOrLifeStage: "",
    relationshipContext: "",
    concept: "",
    campaignContext: "",
  };

  it("reports a genre change only when the user chooses one, never on Surprise Me", async () => {
    const onGenreChange = vi.fn();
    render(PersonalityFormFields, { props: { ...props, onGenreChange } });

    await fireEvent.change(screen.getByLabelText("Choose a vibe"), {
      target: { value: "Cyberpunk / Corporate" },
    });
    expect(onGenreChange).toHaveBeenCalledWith("Cyberpunk / Corporate");

    await fireEvent.click(screen.getByRole("button", { name: "Surprise Me" }));
    expect(onGenreChange).toHaveBeenCalledTimes(1);
  });

  it("does not randomize genre when Surprise Me is clicked", async () => {
    render(PersonalityFormFields, { props });
    await fireEvent.click(screen.getByRole("button", { name: "Surprise Me" }));
    const select = screen.getByLabelText("Choose a vibe") as HTMLSelectElement;
    expect(select.value).toBe("Classic Fantasy");
  });

  it("calls onSurprise when Surprise Me is clicked", async () => {
    const onSurprise = vi.fn();
    render(PersonalityFormFields, { props: { ...props, onSurprise } });
    await fireEvent.click(screen.getByRole("button", { name: "Surprise Me" }));
    expect(onSurprise).toHaveBeenCalledTimes(1);
  });
});
