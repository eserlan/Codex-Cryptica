/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

const { addResult, sendResolvedRollMessage } = vi.hoisted(() => ({
  addResult: vi.fn().mockResolvedValue(undefined),
  sendResolvedRollMessage: vi.fn(),
}));

vi.mock("$lib/stores/dice-history.svelte", () => ({
  diceHistory: {
    modalHistory: [],
    addResult,
    clearHistory: vi.fn(),
  },
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: {
    vttEnabled: true,
    sendResolvedRollMessage,
  },
}));

vi.mock("dice-engine", () => ({
  diceParser: {
    parse: vi.fn((formula: string) => formula),
  },
  diceEngine: {
    execute: vi.fn(() => ({
      total: 17,
      parts: [{ type: "dice", sides: 20, rolls: [17], value: 17 }],
    })),
  },
}));

vi.mock("./RollLog.svelte", () => ({
  default: function RollLogMock() {
    return {
      scrollToTop: vi.fn(),
    };
  },
}));

import DiceVault from "./DiceVault.svelte";

describe("DiceVault", () => {
  it("forwards modal rolls to the VTT session when VTT mode is active", async () => {
    render(DiceVault);

    await fireEvent.input(
      screen.getByPlaceholderText("Enter formula (e.g. 2d20kh1 + 5)"),
      {
        target: { value: "1d20" },
      },
    );
    await fireEvent.click(screen.getByRole("button", { name: "ROLL" }));

    expect(addResult).toHaveBeenCalled();
    expect(sendResolvedRollMessage).toHaveBeenCalledWith(
      "1d20",
      expect.objectContaining({
        total: 17,
      }),
    );
  });
});
