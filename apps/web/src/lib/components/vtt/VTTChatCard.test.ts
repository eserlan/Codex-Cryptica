/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/components/random/CardImage.svelte", () => ({
  default: function CardImageMock() {
    return {};
  },
}));

import VTTChatCard from "./VTTChatCard.svelte";

describe("VTTChatCard", () => {
  it("renders a single card with title, body, and deck placeholder", () => {
    render(VTTChatCard, {
      cards: [
        {
          deckName: "Tarot Deck",
          title: "The Fool",
          body: "New beginnings, innocence, spontaneity",
        },
      ],
    });

    expect(screen.getByTestId("vtt-chat-card-title").textContent).toBe(
      "The Fool",
    );
    expect(screen.getByTestId("vtt-chat-card-body").textContent).toBe(
      "New beginnings, innocence, spontaneity",
    );
    expect(screen.getByTestId("vtt-chat-card-placeholder")).not.toBeNull();
    expect(screen.queryByTestId("vtt-chat-card-reversed")).toBeNull();
  });

  it("renders reversed card badge when reversed is true", () => {
    render(VTTChatCard, {
      cards: [
        {
          deckName: "Tarot Deck",
          title: "The Magician",
          reversed: true,
          body: "Illusion, out of touch",
        },
      ],
    });

    expect(screen.getByTestId("vtt-chat-card-reversed").textContent).toBe(
      "Reversed",
    );
  });

  it("renders spread position when specified", () => {
    render(VTTChatCard, {
      cards: [
        {
          deckName: "Tarot Deck",
          position: "Present",
          title: "The High Priestess",
          body: "Intuition, sacred knowledge",
        },
      ],
    });

    expect(screen.getByTestId("vtt-chat-card-position").textContent).toBe(
      "Present",
    );
  });

  it("renders multiple cards for multi-draw / spread", () => {
    render(VTTChatCard, {
      cards: [
        {
          deckName: "Tarot Deck",
          position: "Past",
          title: "The Fool",
        },
        {
          deckName: "Tarot Deck",
          position: "Present",
          title: "The Magician",
        },
      ],
    });

    const cards = screen.getAllByTestId("vtt-chat-card");
    expect(cards).toHaveLength(2);
  });
});
