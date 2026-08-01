/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { ContextualRollResult } from "$lib/stores/dice-history.svelte";
import RollLog from "./RollLog.svelte";

const roll = (
  overrides: Partial<ContextualRollResult> = {},
): ContextualRollResult =>
  ({
    id: "roll-1",
    context: "modal",
    formula: "1d20+5",
    total: 17,
    timestamp: 1_725_000_000_000,
    parts: [],
    ...overrides,
  }) as ContextualRollResult;

describe("RollLog", () => {
  it("shows the originating stat label for contextual rolls", () => {
    render(RollLog, { rolls: [roll({ label: "Attack" })] });

    expect(screen.getByTestId("roll-label").textContent).toBe("Attack");
    expect(screen.getByTestId("roll-formula").textContent).toBe("1d20+5");
  });

  it("does not render a context label for regular dice rolls", () => {
    render(RollLog, { rolls: [roll()] });

    expect(screen.queryByTestId("roll-label")).toBeNull();
  });
});
