/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import WorldFormFields from "./WorldFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  worldConfig: {
    worldTypes: ["Terrestrial World", "Ocean World"],
    habitability: ["Earthlike", "Hostile"],
    civilisations: ["Colony", "Uninhabited"],
    societalModels: ["Scientific Expedition", "Prison Society"],
    worldTags: ["Colonized Population", "Local Specialty", "Trade Hub"],
    defaultWorldTags: ["Colonized Population", "Local Specialty"],
    genres: ["Hard Sci-Fi", "Cyberpunk", "Lancer"],
    campaignPressures: [
      "Resource Access and Rationing",
      "Labour Rights and Working Conditions",
    ],
    lancerWorldFrames: ["Union Core World", "Long Rim Frontier"],
    lancerConflicts: [
      "Autonomy and Union Legitimacy",
      "Colonial Ownership and Labour",
    ],
  },
  pickFrom: <T>(items: readonly T[]) => items[0],
}));

describe("WorldFormFields", () => {
  const props = {
    worldType: "Terrestrial World",
    habitability: "Earthlike",
    civilisation: "Colony",
    societalModel: "Scientific Expedition",
    worldTagOne: "Colonized Population",
    worldTagTwo: "Local Specialty",
    genre: "Hard Sci-Fi",
    lancerWorldFrame: "Union Core World",
    campaignPressure: "Resource Access and Rationing",
    dominantFeature: "a migrating twilight belt",
  };

  it("renders each sci-fi worldbuilding control", () => {
    render(WorldFormFields, { props });

    expect(screen.getByLabelText("World Type")).toBeTruthy();
    expect(screen.getByLabelText("Habitability")).toBeTruthy();
    expect(screen.getByLabelText("Civilisation")).toBeTruthy();
    expect(screen.getByLabelText("Genre / Tone")).toBeTruthy();
    expect(screen.getByLabelText("Primary Societal Model")).toBeTruthy();
    expect(
      screen.getByLabelText("World Tag 1 (Stars Without Number)"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("World Tag 2 (Stars Without Number)"),
    ).toBeTruthy();
    expect(screen.getByLabelText("Dominant feature (optional)")).toBeTruthy();
  });

  it("keeps the dominant feature optional", () => {
    render(WorldFormFields, { props: { ...props, dominantFeature: "" } });

    expect(
      (screen.getByLabelText("Dominant feature (optional)") as HTMLInputElement)
        .value,
    ).toBe("");
  });

  it("keeps the societal model independent from civilisation", () => {
    render(WorldFormFields, {
      props: { ...props, societalModel: "Prison Society" },
    });

    expect(
      (screen.getByLabelText("Primary Societal Model") as HTMLSelectElement)
        .value,
    ).toBe("Prison Society");
  });

  it("replaces the societal model with Lancer framing and keeps campaign pressure universal", async () => {
    const { rerender } = render(WorldFormFields, { props });

    expect(screen.queryByLabelText("Lancer World Frame")).toBeNull();
    expect(screen.getByLabelText("Primary Societal Model")).toBeTruthy();
    expect(screen.getByLabelText("Campaign Pressure")).toBeTruthy();

    await rerender({ ...props, genre: "Lancer" });

    expect(screen.getByLabelText("Lancer World Frame")).toBeTruthy();
    expect(screen.getByLabelText("Campaign Pressure")).toBeTruthy();
    expect(screen.queryByLabelText("Primary Societal Model")).toBeNull();
  });

  it("keeps the two world tags distinct", async () => {
    render(WorldFormFields, { props });

    await fireEvent.change(
      screen.getByLabelText("World Tag 1 (Stars Without Number)"),
      {
        target: { value: "Local Specialty" },
      },
    );

    expect(
      (
        screen.getByLabelText(
          "World Tag 1 (Stars Without Number)",
        ) as HTMLSelectElement
      ).value,
    ).toBe("Local Specialty");
    expect(
      (
        screen.getByLabelText(
          "World Tag 2 (Stars Without Number)",
        ) as HTMLSelectElement
      ).value,
    ).not.toBe("Local Specialty");
  });

  it("randomizes the select fields and starts generation", async () => {
    const onSurprise = vi.fn();
    render(WorldFormFields, { props: { ...props, onSurprise } });

    await fireEvent.click(screen.getByText("Surprise Me"));

    expect(onSurprise).toHaveBeenCalledOnce();
  });
});
