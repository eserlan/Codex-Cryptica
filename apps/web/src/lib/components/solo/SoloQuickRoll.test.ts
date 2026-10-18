/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  store: {
    session: { lastRoll: null as string | null },
    recordRoll: vi.fn(),
  },
  history: { addResult: vi.fn(async (..._args: unknown[]) => {}) },
}));

vi.mock("$lib/stores/solo-session-instance", () => ({
  soloSessionStore: env.store,
}));
vi.mock("$lib/stores/dice-history.svelte", () => ({
  diceHistory: env.history,
}));

import SoloQuickRoll from "./SoloQuickRoll.svelte";

beforeEach(() => {
  env.store.session = { lastRoll: null };
  env.store.recordRoll.mockClear();
  env.history.addResult.mockClear();
});

async function type(value: string) {
  const input = screen.getByTestId("solo-quick-roll-input") as HTMLInputElement;
  await fireEvent.input(input, { target: { value } });
  await fireEvent.keyDown(input, { key: "Enter" });
  return input;
}

describe("SoloQuickRoll", () => {
  it("rolls a typed expression, shows the total inline and records it in roll history", async () => {
    render(SoloQuickRoll);
    await type("d20");
    await waitFor(() =>
      expect(screen.getByTestId("solo-quick-roll-result").textContent).toMatch(
        /\b([1-9]|1\d|20)\b/,
      ),
    );
    expect(env.history.addResult).toHaveBeenCalledWith(
      expect.objectContaining({ total: expect.any(Number) }),
      "modal",
      { label: "Quick roll" },
    );
    expect(env.store.recordRoll).toHaveBeenCalledWith("d20");
  });

  it("repeats the last expression on an empty roll", async () => {
    env.store.session = { lastRoll: "2d6+1" };
    render(SoloQuickRoll);
    await type("");
    await waitFor(() =>
      expect(env.store.recordRoll).toHaveBeenCalledWith("2d6+1"),
    );
  });

  it("does nothing on an empty roll with no last expression", async () => {
    render(SoloQuickRoll);
    await type("   ");
    expect(env.history.addResult).not.toHaveBeenCalled();
    expect(env.store.recordRoll).not.toHaveBeenCalled();
  });

  it("shows an inline message for an expression it cannot read, and records nothing", async () => {
    render(SoloQuickRoll);
    await type("xyz");
    await waitFor(() =>
      expect(screen.getByTestId("solo-quick-roll-error")).toBeTruthy(),
    );
    expect(env.history.addResult).not.toHaveBeenCalled();
    expect(env.store.recordRoll).not.toHaveBeenCalled();
  });

  it("opens no dialog or window, and keeps focus in the input", async () => {
    const open = vi.spyOn(window, "open");
    render(SoloQuickRoll);
    const field = screen.getByTestId("solo-quick-roll-input");
    field.focus();
    const input = await type("d20");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(open).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    open.mockRestore();
  });

  it("has an accessible name for its input", () => {
    render(SoloQuickRoll);
    const input = screen.getByTestId("solo-quick-roll-input");
    expect(input.getAttribute("aria-label")).toBe(
      "Quick roll: dice expression",
    );
  });
});
