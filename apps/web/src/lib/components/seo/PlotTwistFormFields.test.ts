/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import PlotTwistFormFields from "./PlotTwistFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  factionConfig: { themes: ["Classic Fantasy"] },
  plotTwistConfig: {
    twistTypes: ["Random"],
    impacts: ["Subtle", "Significant"],
    timings: ["Any"],
    foreshadowing: ["Surprise me"],
  },
}));

describe("PlotTwistFormFields", () => {
  const questPremise =
    "The drowned bell calls villagers into the marsh each night.";
  const props = {
    theme: "Classic Fantasy",
    twistType: "Random",
    impact: "Significant",
    timing: "Any",
    foreshadowing: "Surprise me",
    premise: questPremise,
    constraints: "",
    campaignContext: "",
  };

  it("keeps the handed-off Quest Hook when Surprise Me starts generation", async () => {
    const onSurprise = vi.fn();
    render(PlotTwistFormFields, { props: { ...props, onSurprise } });

    await fireEvent.click(screen.getByRole("button", { name: "Surprise Me" }));

    expect(onSurprise).toHaveBeenCalledOnce();
    expect(
      (
        screen.getByLabelText(
          "Current situation / premise",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe(questPremise);
  });
});
