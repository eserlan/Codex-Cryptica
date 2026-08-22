/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureRollPrompt from "./AdventureRollPrompt.svelte";

function manager(overrides: Record<string, unknown> = {}) {
  return {
    session: {
      pendingRoll: {
        uncertainty: "Can the bridge hold?",
        stakes: "A fall means the crossing is lost.",
        suppliedOutcome: undefined,
      },
    },
    errorMessage: null,
    recordRollOutcome: vi.fn(),
    resolveRoll: vi.fn(),
    rollCodexDice: vi.fn(),
    dismissRoll: vi.fn(),
    ...overrides,
  } as any;
}

describe("AdventureRollPrompt", () => {
  it("renders nothing without a pending roll", () => {
    render(AdventureRollPrompt, {
      props: { manager: manager({ session: { pendingRoll: null } }) },
    });
    expect(screen.queryByText("A roll matters")).toBeNull();
  });

  it("reports a narrative outcome", async () => {
    const m = manager();
    render(AdventureRollPrompt, { props: { manager: m } });

    await fireEvent.input(screen.getByLabelText("Your outcome"), {
      target: { value: "A clean success" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Report outcome" }),
    );

    expect(m.recordRollOutcome).toHaveBeenCalledWith({
      kind: "narrative",
      value: "A clean success",
    });
  });

  it("keeps a just-clicked outcome button in the DOM once the outcome is recorded", async () => {
    const m = manager();
    const { rerender } = render(AdventureRollPrompt, {
      props: { manager: m },
    });

    const button = screen.getByRole("button", { name: "Report outcome" });
    button.focus();
    expect(document.activeElement).toBe(button);

    // Simulate the outcome landing right after the click, as the real
    // manager does inside recordRollOutcome.
    await rerender({
      manager: manager({
        session: {
          pendingRoll: {
            uncertainty: "Can the bridge hold?",
            stakes: "A fall means the crossing is lost.",
            suppliedOutcome: { kind: "narrative", value: "A clean success" },
          },
        },
      }),
    });

    // The button must still exist in the DOM (merely hidden/disabled
    // elsewhere), not be torn out — removing a focused element from the DOM
    // mid-click silently exits native fullscreen in Chrome.
    expect(document.body.contains(button)).toBe(true);
    expect(
      screen.getByText("Result recorded. Oracle is resolving it."),
    ).toBeTruthy();
  });

  it("offers a retry when resolution fails after the outcome is recorded", () => {
    render(AdventureRollPrompt, {
      props: {
        manager: manager({
          session: {
            pendingRoll: {
              uncertainty: "Can the bridge hold?",
              stakes: "A fall means the crossing is lost.",
              suppliedOutcome: { kind: "narrative", value: "A clean success" },
            },
          },
          errorMessage: "Generation failed. Please try again.",
        }),
      },
    });

    expect(
      screen.getByRole("button", { name: "Retry resolution" }),
    ).toBeTruthy();
  });
});
