/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ArtifactFormFields from "./ArtifactFormFields.svelte";

describe("ArtifactFormFields", () => {
  it("renders all form fields and labels", () => {
    render(ArtifactFormFields, {
      props: {
        theme: "Classic Fantasy",
        form: "Crown / Regalia of Rule",
        originEra: "Primordial / Mythic Age",
        powerTier: "Heroic Wonder (Alters individuals & skirmishes)",
        currentStatus: "Sealed in Royal / High-Security Vault",
        curseCost: "Sacrificial Price (Requires vital tribute/blood)",
        campaignContext: "The ancient sun dynasty of Highrock.",
      },
    });

    expect(screen.getByLabelText("Choose a vibe")).toBeTruthy();
    expect(screen.getByLabelText("Item Form")).toBeTruthy();
    expect(screen.getByLabelText("Origin Era")).toBeTruthy();
    expect(screen.getByLabelText("Power Tier / Scope")).toBeTruthy();
    expect(screen.getByLabelText("Current Status")).toBeTruthy();
    expect(screen.getByLabelText("Curse / Cost / Drawback")).toBeTruthy();
    expect(screen.getByLabelText("Optional Campaign Context")).toBeTruthy();
  });

  it("triggers onSurprise callback when clicking Surprise Me", async () => {
    const onSurprise = vi.fn();
    render(ArtifactFormFields, {
      props: {
        theme: "Classic Fantasy",
        form: "Crown / Regalia of Rule",
        originEra: "Primordial / Mythic Age",
        powerTier: "Heroic Wonder (Alters individuals & skirmishes)",
        currentStatus: "Sealed in Royal / High-Security Vault",
        curseCost: "Sacrificial Price (Requires vital tribute/blood)",
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
