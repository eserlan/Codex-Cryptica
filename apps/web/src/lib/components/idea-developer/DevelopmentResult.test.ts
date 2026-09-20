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

describe("DevelopmentResult marks what changed", () => {
  const next = { ...base, whatChanged: "Looked at it as an assessment." };

  it("shows no badges and no summary for a first result", () => {
    render(DevelopmentResult, {
      props: { development: base, ideaText: "A town.", changed: null },
    });
    expect(screen.queryByText("Updated")).toBeNull();
    expect(screen.queryByText(/sections updated/i)).toBeNull();
  });

  it("badges each section that changed and lists them at the top", () => {
    render(DevelopmentResult, {
      props: {
        development: next,
        ideaText: "A town.",
        changed: ["centralQuestion", "consequences"],
      },
    });
    expect(screen.getAllByText("Updated")).toHaveLength(2);
    expect(
      screen.getByText(
        /sections updated: central question, if nobody steps in/i,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/looked at it as an assessment/i)).toBeTruthy();
  });

  it("says plainly when nothing changed", () => {
    render(DevelopmentResult, {
      props: { development: next, ideaText: "A town.", changed: [] },
    });
    expect(screen.queryByText("Updated")).toBeNull();
    expect(screen.getByText(/no sections changed/i)).toBeTruthy();
  });

  it("shows the mode and which turn this is", () => {
    render(DevelopmentResult, {
      props: {
        development: { ...next, mode: "assess" },
        ideaText: "A town.",
        changed: [],
        turn: 2,
        maxTurns: 8,
      },
    });
    expect(screen.getByTestId("mode-label").textContent).toMatch(
      /assess mode.*turn 2 of 8/i,
    );
  });
});
