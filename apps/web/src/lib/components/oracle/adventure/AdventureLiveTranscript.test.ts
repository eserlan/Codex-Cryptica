/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("rotates a flavorful generation message while the Oracle responds", async () => {
    vi.useFakeTimers();
    render(AdventureLiveTranscript, {
      props: { manager: manager({ phase: "generating" }) },
    });

    expect(screen.getByRole("status").textContent).toContain(
      "The Oracle traces the threads of consequence…",
    );
    await vi.advanceTimersByTimeAsync(2_800);
    await tick();
    expect(screen.getByRole("status").textContent).toContain(
      "Fate gathers around your choice…",
    );
  });

  it("does not announce each visual message change to assistive technology", () => {
    render(AdventureLiveTranscript, {
      props: { manager: manager({ phase: "generating" }) },
    });

    expect(
      screen
        .getByTestId("adventure-generating-status")
        .getAttribute("aria-live"),
    ).toBe("off");
  });

  it("shows no generating indicator when the player can act", () => {
    render(AdventureLiveTranscript, { props: { manager: manager() } });

    expect(screen.queryByRole("status")).toBeNull();
  });
});
