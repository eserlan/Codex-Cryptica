/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventurePlay from "./AdventurePlay.svelte";

function manager(phase: "ready" | "generating") {
  return {
    session: { title: "The Drowned March" },
    phase,
    draft: "Cross the flooded causeway",
    readOnly: false,
    lastRollResult: null,
    transcript: null,
    rollHistory: [],
    suggestedActions: [],
    errorMessage: null,
    submitAction: vi.fn(),
    end: vi.fn(),
    cancel: vi.fn(),
  } as any;
}

describe("AdventurePlay", () => {
  it("shows a pending Oracle status without removing the composer field", () => {
    render(AdventurePlay, { props: { manager: manager("generating") } });

    expect(screen.getByRole("status").textContent).toContain(
      "The Oracle traces the threads of consequence…",
    );
    // The field stays mounted (just hidden) rather than being torn out —
    // removing a focused element from the DOM mid-interaction silently
    // exits native fullscreen in Chrome.
    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("does not show a pending status when the player can act", () => {
    render(AdventurePlay, { props: { manager: manager("ready") } });

    expect(screen.queryByRole("status")).toBeNull();
  });
});
