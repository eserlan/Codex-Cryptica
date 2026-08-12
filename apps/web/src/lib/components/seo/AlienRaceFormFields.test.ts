/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AlienRaceFormFields from "./AlienRaceFormFields.svelte";

// vi.mock is hoisted above every declaration in this file, so the factory has
// to inline its literals rather than reference the constants below.
vi.mock("$lib/services/seo/generator-engine", () => ({
  alienRaceConfig: {
    genres: ["Hard Sci-Fi", "Space Opera", "Cyberpunk", "Cosmic Horror"],
    generationModes: ["Grounded / Evolutionary", "Freeform / Fantastic"],
    bodyPlans: [
      "Hexapodal",
      "Winged biped",
      "Crystalline lattice",
      "Plasma-bound field",
    ],
    homeEnvironments: ["High-gravity world", "Ocean world", "Deep void"],
    psychologies: ["Consensus-seeking", "Ritual-bound"],
    socialOrganisations: ["Clan lineages", "Nomadic bands"],
    technologyLevels: ["Industrial", "Interstellar"],
    relationsToOutsiders: ["First contact pending", "Uneasy ceasefire"],
    bodyPlansByMode: {
      "Grounded / Evolutionary": ["Hexapodal", "Winged biped"],
      "Freeform / Fantastic": [
        "Hexapodal",
        "Winged biped",
        "Crystalline lattice",
        "Plasma-bound field",
      ],
    },
    homeEnvironmentsByMode: {
      "Grounded / Evolutionary": ["High-gravity world", "Ocean world"],
      "Freeform / Fantastic": [
        "High-gravity world",
        "Ocean world",
        "Deep void",
      ],
    },
  },
  pickFrom: (arr: string[]) => arr[arr.length - 1],
}));

const GROUNDED = "Grounded / Evolutionary";
const FREEFORM = "Freeform / Fantastic";

const baseProps = {
  genre: "Hard Sci-Fi",
  generationMode: GROUNDED,
  homeEnvironment: "High-gravity world",
  bodyPlan: "Hexapodal",
  psychology: "Consensus-seeking",
  socialOrganisation: "Clan lineages",
  technologyLevel: "Industrial",
  relationToOutsiders: "First contact pending",
  campaignContext: "",
};

describe("AlienRaceFormFields", () => {
  it("renders every option the issue asks for", () => {
    render(AlienRaceFormFields, { props: { ...baseProps } });

    expect(screen.getByLabelText("Genre")).toBeTruthy();
    expect(screen.getByLabelText("Generation Mode")).toBeTruthy();
    expect(screen.getByLabelText("Home Environment")).toBeTruthy();
    expect(screen.getByLabelText("Body Plan")).toBeTruthy();
    expect(screen.getByLabelText("Psychology")).toBeTruthy();
    expect(screen.getByLabelText("Social Organisation")).toBeTruthy();
    expect(screen.getByLabelText("Technology Level")).toBeTruthy();
    expect(screen.getByLabelText("Relationship to Other Species")).toBeTruthy();
    expect(screen.getByLabelText("Add campaign context")).toBeTruthy();
  });

  it("hides exotic body plans and environments in grounded mode", () => {
    render(AlienRaceFormFields, { props: { ...baseProps } });

    expect(screen.queryByText("Crystalline lattice")).toBeNull();
    expect(screen.queryByText("Plasma-bound field")).toBeNull();
    expect(screen.queryByText("Deep void")).toBeNull();
    expect(screen.getByText("Hexapodal")).toBeTruthy();
  });

  it("offers exotic options once the mode is switched to freeform", async () => {
    render(AlienRaceFormFields, {
      props: { ...baseProps, generationMode: FREEFORM },
    });

    expect(screen.getByText("Crystalline lattice")).toBeTruthy();
    expect(screen.getByText("Deep void")).toBeTruthy();
  });

  it("resets an exotic selection when switching back to grounded", async () => {
    render(AlienRaceFormFields, {
      props: {
        ...baseProps,
        generationMode: FREEFORM,
        bodyPlan: "Plasma-bound field",
      },
    });

    const modeSelect = screen.getByLabelText(
      "Generation Mode",
    ) as HTMLSelectElement;
    await fireEvent.change(modeSelect, { target: { value: GROUNDED } });

    await waitFor(() => {
      const bodyPlanSelect = screen.getByLabelText(
        "Body Plan",
      ) as HTMLSelectElement;
      // Falls back to the first grounded option rather than keeping a plasma
      // being in a biologically-plausible species.
      expect(bodyPlanSelect.value).toBe("Hexapodal");
    });
  });

  it("leaves the selected genre untouched when Surprise Me is clicked", async () => {
    const onSurprise = vi.fn();
    const onGenreChange = vi.fn();

    render(AlienRaceFormFields, {
      props: {
        ...baseProps,
        genre: "Cosmic Horror",
        onSurprise,
        onGenreChange,
      },
    });

    await fireEvent.click(screen.getByText("Surprise Me"));

    expect(onSurprise).toHaveBeenCalled();
    // Genre is a user-controlled axis and also drives the page's visual skin,
    // so Surprise Me must not re-roll it or report a genre change.
    expect(onGenreChange).not.toHaveBeenCalled();
    const genreSelect = screen.getByLabelText("Genre") as HTMLSelectElement;
    expect(genreSelect.value).toBe("Cosmic Horror");
  });

  it("reports a genre change when the genre select itself changes", async () => {
    const onGenreChange = vi.fn();

    render(AlienRaceFormFields, {
      props: { ...baseProps, onGenreChange },
    });

    await fireEvent.change(screen.getByLabelText("Genre"), {
      target: { value: "Cyberpunk" },
    });

    expect(onGenreChange).toHaveBeenCalledWith("Cyberpunk");
  });

  it("allows up to 4000 characters of campaign context", () => {
    render(AlienRaceFormFields, { props: { ...baseProps } });

    const context = screen.getByLabelText(
      "Add campaign context",
    ) as HTMLTextAreaElement;
    expect(context.maxLength).toBe(4000);
  });
});
