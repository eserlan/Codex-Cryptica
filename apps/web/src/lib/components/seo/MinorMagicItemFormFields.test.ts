/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MinorMagicItemFormFields from "./MinorMagicItemFormFields.svelte";

describe("MinorMagicItemFormFields", () => {
  it("renders all form fields and labels", () => {
    render(MinorMagicItemFormFields, {
      props: {
        theme: "Classic Fantasy",
        form: "Charm / Talisman",
        usageLimit: "Single Use (Breaks / Consumed on Activation)",
        utility:
          "Sensory & Detection (Finding water, detecting lies, seeing warmth, hearing whispers)",
        activation: "Snapping / Crushing in hand",
        quirkSeverity: "None (Clean, quiet, functional)",
        campaignContext: "A dusty apothecary in the old quarter.",
      },
    });

    expect(screen.getByLabelText("Choose a vibe")).toBeTruthy();
    expect(screen.getByLabelText("Item Form")).toBeTruthy();
    expect(screen.getByLabelText("Usage Limit / Charges")).toBeTruthy();
    expect(screen.getByLabelText("Focus / Primary Utility")).toBeTruthy();
    expect(screen.getByLabelText("Activation Method")).toBeTruthy();
    expect(screen.getByLabelText("Quirk or Side Effect")).toBeTruthy();
    expect(screen.getByLabelText("Optional Campaign Context")).toBeTruthy();
  });

  it("triggers onSurprise callback when clicking Surprise Me", async () => {
    const onSurprise = vi.fn();
    render(MinorMagicItemFormFields, {
      props: {
        theme: "Classic Fantasy",
        form: "Charm / Talisman",
        usageLimit: "Single Use (Breaks / Consumed on Activation)",
        utility:
          "Sensory & Detection (Finding water, detecting lies, seeing warmth, hearing whispers)",
        activation: "Snapping / Crushing in hand",
        quirkSeverity: "None (Clean, quiet, functional)",
        campaignContext: "",
        onSurprise,
      },
    });

    const surpriseBtn = screen.getByTitle(
      "Randomize all options and generate a draft from the result",
    );
    await fireEvent.click(surpriseBtn);

    expect(onSurprise).toHaveBeenCalled();
  });
});
