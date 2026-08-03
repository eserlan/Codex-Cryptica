/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import WorldFormFields from "./WorldFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  worldConfig: {
    worldTypes: ["Terrestrial World", "Ocean World"],
    habitability: ["Earthlike", "Hostile"],
    civilisations: ["Colony", "Uninhabited"],
    genres: ["Hard Sci-Fi", "Cyberpunk"],
  },
  pickFrom: <T>(items: readonly T[]) => items[0],
}));

describe("WorldFormFields", () => {
  const props = {
    worldType: "Terrestrial World",
    habitability: "Earthlike",
    civilisation: "Colony",
    genre: "Hard Sci-Fi",
    dominantFeature: "a migrating twilight belt",
  };

  it("renders each sci-fi worldbuilding control", () => {
    render(WorldFormFields, { props });

    expect(screen.getByLabelText("World Type")).toBeTruthy();
    expect(screen.getByLabelText("Habitability")).toBeTruthy();
    expect(screen.getByLabelText("Civilisation")).toBeTruthy();
    expect(screen.getByLabelText("Genre / Tone")).toBeTruthy();
    expect(screen.getByLabelText("Dominant feature (optional)")).toBeTruthy();
  });

  it("keeps the dominant feature optional", () => {
    render(WorldFormFields, { props: { ...props, dominantFeature: "" } });

    expect(
      (screen.getByLabelText("Dominant feature (optional)") as HTMLInputElement)
        .value,
    ).toBe("");
  });

  it("randomizes the select fields and starts generation", async () => {
    const onSurprise = vi.fn();
    render(WorldFormFields, { props: { ...props, onSurprise } });

    await fireEvent.click(screen.getByText("Surprise Me"));

    expect(onSurprise).toHaveBeenCalledOnce();
  });
});
