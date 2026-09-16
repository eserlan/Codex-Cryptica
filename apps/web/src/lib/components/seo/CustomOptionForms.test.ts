/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import QuestFormFields from "./QuestFormFields.svelte";
import KingdomFormFields from "./KingdomFormFields.svelte";
import NationFormFields from "./NationFormFields.svelte";
import SocialHubFormFields from "./SocialHubFormFields.svelte";
import TavernFormFields from "./TavernFormFields.svelte";
import VampireFormFields from "./VampireFormFields.svelte";
import PantheonFormFields from "./PantheonFormFields.svelte";
import NameFormFields from "./NameFormFields.svelte";

describe("Custom option forms", () => {
  async function expectCustomValuePersists(
    fieldLabel: string,
    customLabel: string,
    customValue: string,
  ) {
    await fireEvent.change(screen.getByLabelText(fieldLabel), {
      target: { value: "__custom__" },
    });
    const input = screen.getByLabelText(customLabel) as HTMLInputElement;
    await fireEvent.input(input, {
      target: { value: customValue },
    });
    expect(input.value).toBe(customValue);
  }

  it("quest fields keep a typed custom value", async () => {
    render(QuestFormFields);
    await expectCustomValuePersists("Tone", "Tone (Own option)", "Quiet dread");
  });

  it("kingdom fields keep a typed custom value", async () => {
    render(KingdomFormFields);
    await expectCustomValuePersists(
      "Polity type",
      "Polity type (Own option)",
      "Merchant protectorate",
    );
  });

  it("nation fields keep a typed custom value", async () => {
    render(NationFormFields);
    await expectCustomValuePersists(
      "Polity type",
      "Polity type (Own option)",
      "Orbital republic",
    );
  });

  it("social hub fields keep a typed custom value", async () => {
    render(SocialHubFormFields);
    await expectCustomValuePersists(
      "Venue type",
      "Venue type (Own option)",
      "Memory barge",
    );
  });

  it("tavern fields keep a typed custom value", async () => {
    render(TavernFormFields);
    await expectCustomValuePersists(
      "Tavern type",
      "Tavern type (Own option)",
      "Moonwell den",
    );
  });

  it("vampire fields keep a typed custom value", async () => {
    render(VampireFormFields);
    await expectCustomValuePersists(
      "Choose their bloodline",
      "Choose their bloodline (Own option)",
      "Ashen court",
    );
  });

  it("pantheon fields keep a typed custom value", async () => {
    render(PantheonFormFields);
    await expectCustomValuePersists(
      "Primary Domain",
      "Primary Domain (Own option)",
      "Thresholds and tides",
    );
  });

  it("name fields keep a typed custom value", async () => {
    render(NameFormFields);
    await expectCustomValuePersists(
      "Culture / Style",
      "Culture / Style (Own option)",
      "Basalt chant",
    );
  });

  it("pantheon generate target remains a constrained select", () => {
    render(PantheonFormFields);
    const select = screen.getByLabelText(
      "Generate target",
    ) as HTMLSelectElement;
    expect(
      Array.from(select.options).some((option) => option.text === "Own option"),
    ).toBe(false);
  });
});
