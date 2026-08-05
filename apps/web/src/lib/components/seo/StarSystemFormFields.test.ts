/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import StarSystemFormFields from "./StarSystemFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  starSystemConfig: {
    systemTypes: ["Single Star", "Binary System"],
    genres: ["Hard Sci-Fi", "Cyberpunk"],
    civilisationLevels: ["Unexplored", "Frontier"],
    systemCharacters: ["Prosperous", "Contested"],
    scientificRealism: ["Cinematic", "Grounded"],
  },
  pickFrom: <T>(items: readonly T[]) => items[0],
}));

describe("StarSystemFormFields", () => {
  const props = {
    systemType: "Single Star",
    genre: "Hard Sci-Fi",
    civilisationLevel: "Frontier",
    systemCharacter: "Contested",
    scientificRealism: "Grounded",
  };

  it("renders each star system control", () => {
    render(StarSystemFormFields, { props });

    expect(screen.getByLabelText("Genre")).toBeTruthy();
    expect(screen.getByLabelText("System Type")).toBeTruthy();
    expect(screen.getByLabelText("Civilisation Level")).toBeTruthy();
    expect(screen.getByLabelText("System Character")).toBeTruthy();
    expect(screen.getByLabelText("Scientific Realism")).toBeTruthy();
  });

  it("reflects the bound values in each select", () => {
    render(StarSystemFormFields, { props });

    expect(
      (screen.getByLabelText("System Type") as HTMLSelectElement).value,
    ).toBe("Single Star");
    expect(
      (screen.getByLabelText("Civilisation Level") as HTMLSelectElement).value,
    ).toBe("Frontier");
  });

  it("notifies onGenreChange when the genre select changes", async () => {
    const onGenreChange = vi.fn();
    render(StarSystemFormFields, { props: { ...props, onGenreChange } });

    await fireEvent.change(screen.getByLabelText("Genre"), {
      target: { value: "Cyberpunk" },
    });

    expect(onGenreChange).toHaveBeenCalledWith("Cyberpunk");
  });

  it("randomizes the select fields and starts generation", async () => {
    const onSurprise = vi.fn();
    render(StarSystemFormFields, { props: { ...props, onSurprise } });

    await fireEvent.click(screen.getByText("Surprise Me"));

    expect(onSurprise).toHaveBeenCalledOnce();
  });
});
