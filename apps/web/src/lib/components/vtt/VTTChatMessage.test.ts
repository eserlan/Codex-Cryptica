/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("./VTTChatCard.svelte", () => ({
  default: function VTTChatCardMock() {
    return {};
  },
}));

vi.mock("$lib/components/dice/DiceRollResult.svelte", () => ({
  default: function DiceRollResultMock() {
    return {};
  },
}));

import VTTChatMessage from "./VTTChatMessage.svelte";

describe("VTTChatMessage", () => {
  it("renders text content for normal messages", () => {
    render(VTTChatMessage, {
      message: {
        type: "CHAT_MESSAGE",
        sender: "GM",
        senderId: "host",
        content: "Welcome to the game!",
        timestamp: Date.now(),
      },
    });

    expect(screen.getByText("Welcome to the game!")).not.toBeNull();
    expect(screen.getByText("GM")).not.toBeNull();
  });

  it("renders card drawer component when cards are provided", () => {
    render(VTTChatMessage, {
      message: {
        type: "CHAT_MESSAGE",
        sender: "Player 1",
        senderId: "peer-1",
        content: "Tarot Deck:\nThe Fool",
        timestamp: Date.now(),
        cards: [
          {
            deckName: "Tarot Deck",
            title: "The Fool",
            body: "Beginnings",
          },
        ],
      },
    });

    expect(screen.getByText("Player 1")).not.toBeNull();
    expect(screen.queryByText("Tarot Deck:\nThe Fool")).toBeNull();
  });
});
