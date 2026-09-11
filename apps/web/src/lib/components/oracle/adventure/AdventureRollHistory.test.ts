/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureRollHistory from "./AdventureRollHistory.svelte";

function manager(overrides: Record<string, unknown> = {}) {
  return {
    session: { dicePresets: [], resourceCounters: [] },
    readOnly: false,
    rollHistory: [],
    addDicePreset: vi.fn(async () => undefined),
    removeDicePreset: vi.fn(async () => undefined),
    ...overrides,
  } as any;
}

describe("AdventureRollHistory", () => {
  it("rejects adding a preset without both fields", async () => {
    const m = manager();
    render(AdventureRollHistory, { manager: m });

    await fireEvent.click(screen.getByText("Save preset"));

    expect(m.addDicePreset).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("required");
  });

  it("adds a preset with a label and expression", async () => {
    const m = manager();
    render(AdventureRollHistory, { manager: m });

    await fireEvent.input(screen.getByLabelText("New preset label"), {
      target: { value: "Advantage" },
    });
    await fireEvent.input(screen.getByLabelText("New preset dice expression"), {
      target: { value: "2d20kh1" },
    });
    await fireEvent.click(screen.getByText("Save preset"));

    await waitFor(() =>
      expect(m.addDicePreset).toHaveBeenCalledWith("Advantage", "2d20kh1"),
    );
  });

  it("lists existing presets and removes one", async () => {
    const m = manager({
      session: {
        dicePresets: [
          { id: "preset-1", label: "Advantage", expression: "2d20kh1" },
        ],
        resourceCounters: [],
      },
    });
    render(AdventureRollHistory, { manager: m });

    expect(screen.getByText(/Advantage/)).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Remove preset Advantage" }),
    );

    expect(m.removeDicePreset).toHaveBeenCalledWith("preset-1");
  });

  it("renders resolved rolls in commit order", () => {
    render(AdventureRollHistory, {
      manager: manager({
        rollHistory: [
          {
            turn: { id: "turn-1" },
            resolvedRoll: {
              expression: "d20",
              outcome: { kind: "numeric", value: 15 },
            },
          },
        ],
      }),
    });

    expect(screen.getByText("Roll history")).toBeTruthy();
    expect(screen.getByText(/d20/)).toBeTruthy();
  });
});
