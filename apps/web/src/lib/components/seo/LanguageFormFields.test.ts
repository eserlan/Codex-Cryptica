/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import LanguageFormFields from "./LanguageFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  languageConfig: {
    genres: ["Classic Fantasy", "Sci-Fi"],
    tones: ["Lyrical & Vowel-rich", "Guttural & Harsh"],
    roles: ["Common Speech", "Sacred / Ritual"],
    structures: ["Compound Words", "Agglutinative / Appending"],
  },
  pickFrom: <T>(arr: readonly T[]) => arr[0],
}));

describe("LanguageFormFields", () => {
  it("renders with initial dropdown options", async () => {
    render(LanguageFormFields, {
      props: {
        genre: "Classic Fantasy",
        tone: "Lyrical & Vowel-rich",
        role: "Common Speech",
        structure: "Compound Words",
        campaignContext: "",
      },
    });

    expect(screen.getByText("Classic Fantasy")).toBeTruthy();
    expect(screen.getByText("Lyrical & Vowel-rich")).toBeTruthy();
    expect(screen.getByText("Common Speech")).toBeTruthy();
    expect(screen.getByText("Compound Words")).toBeTruthy();
  });

  it("keeps the genre editable but skips it on Surprise Me when preserveGenreOnSurprise", async () => {
    const onSurprise = vi.fn();
    render(LanguageFormFields, {
      props: {
        genre: "Sci-Fi",
        tone: "Lyrical & Vowel-rich",
        role: "Common Speech",
        structure: "Compound Words",
        campaignContext: "",
        preserveGenreOnSurprise: true,
        onSurprise,
      },
    });

    const select = screen.getByLabelText("Genre") as HTMLSelectElement;
    expect(select.disabled).toBe(false);

    await fireEvent.click(screen.getByText("Surprise Me"));
    expect(onSurprise).toHaveBeenCalled();
    // The mocked pickFrom returns the first option, so an unpreserved genre
    // would have been reset to "Classic Fantasy".
    expect(select.value).toBe("Sci-Fi");
  });

  it("randomizes fields and calls onSurprise when Surprise Me is clicked", async () => {
    const onSurprise = vi.fn();
    render(LanguageFormFields, {
      props: {
        genre: "Classic Fantasy",
        tone: "Lyrical & Vowel-rich",
        role: "Common Speech",
        structure: "Compound Words",
        campaignContext: "",
        onSurprise,
      },
    });

    await fireEvent.click(screen.getByText("Surprise Me"));
    expect(onSurprise).toHaveBeenCalled();
  });
});
