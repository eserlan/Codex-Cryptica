/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AdventureLiveTranscript from "./AdventureLiveTranscript.svelte";

function manager(overrides: Record<string, unknown> = {}) {
  return {
    phase: "ready",
    transcript: {
      sessionId: "session-1",
      title: "The Drowned March",
      turns: [
        {
          sequence: 1,
          playerAction: "Cross the flooded causeway",
          narration: "The water rises past your knees...",
          committedAt: "2026-08-18T00:00:00.000Z",
        },
      ],
    },
    rollHistory: [],
    ...overrides,
  } as any;
}

describe("AdventureLiveTranscript", () => {
  it("renders a turn's player action and narration", () => {
    render(AdventureLiveTranscript, { props: { manager: manager() } });

    expect(screen.getByText("Cross the flooded causeway")).toBeTruthy();
    expect(screen.getByText("The water rises past your knees...")).toBeTruthy();
  });

  it("renders no roll chip when the turn has no matching roll history entry", () => {
    render(AdventureLiveTranscript, { props: { manager: manager() } });

    expect(screen.queryByText(/1d20/)).toBeNull();
  });

  it("collapses a resolved roll into a compact chip on its turn", () => {
    const m = manager({
      rollHistory: [
        {
          turn: { sequence: 1 },
          resolvedRoll: {
            expression: "1d20+7",
            outcome: { kind: "numeric", value: 14 },
          },
        },
      ],
    });
    render(AdventureLiveTranscript, { props: { manager: m } });

    expect(screen.getByText(/1d20\+7/)).toBeTruthy();
    expect(screen.getByText(/14/)).toBeTruthy();
  });

  it("shows a trailing generating indicator while the Oracle responds", () => {
    render(AdventureLiveTranscript, {
      props: { manager: manager({ phase: "generating" }) },
    });

    expect(screen.getByRole("status").textContent).toContain(
      "Oracle is responding to your action…",
    );
  });

  it("shows no generating indicator when the player can act", () => {
    render(AdventureLiveTranscript, { props: { manager: manager() } });

    expect(screen.queryByRole("status")).toBeNull();
  });
});
