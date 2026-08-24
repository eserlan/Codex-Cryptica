import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { ContextualRollResult } from "$lib/stores/dice-history.svelte";
import {
  clearOracleChatDraft,
  getOracleChatDraft,
} from "$lib/components/oracle/oracle-chat-input";
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

  it("sends standard dice rolls to VTT chat and Oracle input when Add to chat is clicked", async () => {
    clearOracleChatDraft();
    const sendResolvedRollMessage = vi.fn();
    const sendChatMessage = vi.fn();
    const session = {
      vttEnabled: false,
      sendResolvedRollMessage,
      sendChatMessage,
    };

    const targetRoll = roll({ formula: "2d6+3", total: 11 });
    render(RollLog, {
      rolls: [targetRoll],
      session: session as never,
    });

    const addBtn = screen.getByTestId("roll-log-add-to-chat");
    await fireEvent.click(addBtn);

    expect(sendResolvedRollMessage).toHaveBeenCalledWith("2d6+3", targetRoll);
    expect(getOracleChatDraft()).toBe("2d6+3 ➔ 11");
  });

  it("sends source results (deck/table) to VTT chat and Oracle input when Add to chat is clicked", async () => {
    clearOracleChatDraft();
    const sendChatMessage = vi.fn();
    const session = {
      vttEnabled: true,
      sendResolvedRollMessage: vi.fn(),
      sendChatMessage,
    };

    const sourceRoll = roll({
      formula: "1 card",
      total: 1,
      source: {
        sourceId: "deck-1",
        sourceName: "Fate Deck",
        kind: "deck",
        finalText: "The High Priestess: Wisdom revealed",
      },
    });

    render(RollLog, {
      rolls: [sourceRoll],
      session: session as never,
    });

    const addBtn = screen.getByTestId("roll-log-add-to-chat");
    await fireEvent.click(addBtn);

    expect(sendChatMessage).toHaveBeenCalledWith(
      "Fate Deck: The High Priestess: Wisdom revealed",
    );
    expect(getOracleChatDraft()).toBe(
      "Fate Deck: The High Priestess: Wisdom revealed",
    );
  });
});
