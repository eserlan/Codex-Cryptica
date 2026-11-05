/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AdventureStateSummary from "./AdventureStateSummary.svelte";

function manager(recap: any) {
  return {
    session: { title: "The Drowned March" },
    recap,
  } as any;
}

describe("AdventureStateSummary", () => {
  it("collapses situation details behind a single-line location strip", () => {
    render(AdventureStateSummary, {
      manager: manager({
        location: {
          id: "loc-1",
          text: "Tiny village in the high slopes of nombe",
        },
        situation: { id: "sit-1", text: "Sela is fixing a shutter." },
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      }),
    });
    const details = screen.getByTestId("adventure-scene-details");
    expect(details).toHaveProperty("open", false);
    expect(details.querySelector("summary")?.textContent).toContain(
      "Tiny village in the high slopes of nombe",
    );
    expect(details.querySelector("summary")?.className).toContain("flex");
    expect(screen.getByText("Sela is fixing a shutter.")).toBeTruthy();
  });

  it("renders nothing when there is no active session", () => {
    render(AdventureStateSummary, {
      manager: { session: null, recap: null } as any,
    });
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders location, situation, objectives, characters, and known facts", () => {
    render(AdventureStateSummary, {
      manager: manager({
        location: { id: "loc-1", text: "The lantern road" },
        situation: { id: "sit-1", text: "The ward is failing" },
        objectives: [{ id: "obj-1", text: "Reach the bell-stone" }],
        activeCharacters: [{ id: "char-1", text: "Father Gideon" }],
        knownFacts: [{ id: "fact-1", text: "The gate is breached" }],
        recentTurnSummaries: [],
      }),
    });

    // Once in the compact summary line and once, untruncated, in the details.
    expect(screen.getAllByText("The lantern road")).toHaveLength(2);
    expect(screen.getByText("The ward is failing")).toBeTruthy();
    expect(screen.getByText("Reach the bell-stone")).toBeTruthy();
    expect(screen.getByText("Father Gideon")).toBeTruthy();
    expect(screen.getByText("The gate is breached")).toBeTruthy();
  });

  it("shows a recap of recent turns only when there are any", () => {
    render(AdventureStateSummary, {
      manager: manager({
        location: undefined,
        situation: undefined,
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: ["The gate holds against the flood."],
      }),
    });

    expect(screen.getByText("Recap: what just happened")).toBeTruthy();
    expect(screen.getByText("The gate holds against the flood.")).toBeTruthy();
  });

  it("never renders a field sourced from hidden state", () => {
    const { container } = render(AdventureStateSummary, {
      manager: manager({
        location: { id: "loc-1", text: "The lantern road" },
        situation: undefined,
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      }),
    });

    expect(container.textContent).not.toContain("secret");
    expect(container.textContent).not.toContain("hidden");
  });

  it("shows the full location in the expanded details, not only the truncated line", () => {
    const long =
      "The flooded undercroft beneath the old lantern-keepers' hall at the edge of town";
    render(AdventureStateSummary, {
      manager: manager({
        location: { id: "loc-1", text: long },
        situation: undefined,
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      }),
    });
    const full = screen.getByTestId("adventure-scene-location");
    expect(full.textContent).toContain(long);
    expect(full.querySelector(".truncate")).toBeNull();
  });
});
