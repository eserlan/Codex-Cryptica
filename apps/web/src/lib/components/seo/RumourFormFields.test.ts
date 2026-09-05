/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import RumourFormFields from "./RumourFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  rumourConfig: {
    genres: ["Classic Fantasy", "Cyberpunk / Corporate"],
    tones: ["Gossipy", "Ominous"],
    dangerLevels: ["Low", "Moderate"],
    subjects: ["Balanced Mix", "Crime"],
  },
  pickFrom: <T>(values: readonly T[]) => values[values.length - 1],
}));

describe("RumourFormFields", () => {
  const props = {
    genre: "Classic Fantasy",
    tone: "Gossipy",
    dangerLevel: "Low",
    subjectFocus: "Balanced Mix",
    locationContext: "",
    campaignContext: "",
  };

  it("reports a genre change only when the user chooses one, never on Surprise Me", async () => {
    const onGenreChange = vi.fn();
    render(RumourFormFields, { props: { ...props, onGenreChange } });

    await fireEvent.change(screen.getByLabelText("Genre"), {
      target: { value: "Cyberpunk / Corporate" },
    });
    expect(onGenreChange).toHaveBeenCalledWith("Cyberpunk / Corporate");

    await fireEvent.click(screen.getByRole("button", { name: "Surprise Me" }));
    expect(onGenreChange).toHaveBeenCalledTimes(1);
  });

  it("calls onSurprise when Surprise Me is clicked", async () => {
    const onSurprise = vi.fn();
    render(RumourFormFields, { props: { ...props, onSurprise } });
    await fireEvent.click(screen.getByRole("button", { name: "Surprise Me" }));
    expect(onSurprise).toHaveBeenCalledTimes(1);
  });
});
