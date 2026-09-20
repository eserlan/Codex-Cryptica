// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import DevelopmentResult from "./DevelopmentResult.svelte";
import type { Development } from "generator-engine";

afterEach(cleanup);

const base: Development = {
  mode: "develop",
  alreadyInteresting: "Everything is made from dragon parts.",
  centralQuestion: "Where do the parts come from?",
  makeItMove: "The last shipment is late.",
  peopleWhoCare: [
    { name: "Mara", role: "Smith", wants: "Scales", conflictsWith: "Warden" },
    { name: "Mara", role: "Guard", wants: "Peace", conflictsWith: "Smith" },
  ],
  playerDirections: [
    { title: "Follow it", description: "Trace it." },
    { title: "Search it", description: "Find it." },
  ],
  consequences: "The town runs dry.",
  creatorQuestions: ["Who built it?", "Who built it?"],
  generatorSuggestions: [],
};

describe("DevelopmentResult with repeated model output", () => {
  it("shows two people who share a name instead of crashing", () => {
    render(DevelopmentResult, {
      props: { development: base, ideaText: "A town." },
    });
    expect(screen.getAllByText(/Mara/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Smith/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Guard/).length).toBeGreaterThan(0);
  });

  it("shows two identical creator questions instead of crashing", () => {
    render(DevelopmentResult, {
      props: { development: base, ideaText: "A town." },
    });
    expect(screen.getAllByText("Who built it?")).toHaveLength(2);
  });
});
