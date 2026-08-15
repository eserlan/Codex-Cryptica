/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { RandomSource } from "random-source-engine";

import DeckView from "./DeckView.svelte";

if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () =>
    ({ finished: Promise.resolve(), cancel: () => {} }) as Animation;
}

function deckOf(cardCount: number): RandomSource {
  return {
    id: "deck-1",
    name: "Complications",
    kind: "deck",
    labels: [],
    cards: Array.from({ length: cardCount }, (_, i) => ({
      id: `c${i}`,
      title: `Card ${i}`,
      body: `Body ${i}`,
    })),
    spreads: [],
    deckOptions: { drawMode: "without-replacement", allowReversals: false },
  };
}

/**
 * A service whose `reset` is held open, so a second click lands while the
 * first is still in flight — the state a reentrancy guard exists for.
 */
function heldService() {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  const reset = vi.fn(() => held);
  return {
    release,
    reset,
    service: {
      reset,
      draw: vi.fn(),
      drawSpread: vi.fn(),
      remaining: vi.fn(async () => []),
    },
  };
}

const stores = () => ({
  sources: {
    save: vi.fn(),
    resolutionContext: () => ({ lookup: () => undefined }),
  },
  history: { addResult: vi.fn() },
  idGenerator: { uuid: () => "generated" },
});

describe("DeckView reshuffle", () => {
  it("starts only one reset when the confirm button is clicked twice quickly", async () => {
    // Unguarded, the second click starts a second reset and whichever finishes
    // first clears `busy` while the other is still running, re-enabling Draw
    // mid-operation.
    const { service, reset, release } = heldService();
    render(DeckView, {
      props: { deck: deckOf(2), service, ...stores() } as never,
    });

    const button = await screen.findByTestId("reshuffle-deck");
    button.click();
    button.click();

    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
    release();
  });

  it("disables the reshuffle button while a reset is running", async () => {
    const { service, release } = heldService();
    render(DeckView, {
      props: { deck: deckOf(2), service, ...stores() } as never,
    });

    const button = await screen.findByTestId("reshuffle-deck");
    button.click();

    await waitFor(() =>
      expect((button as HTMLButtonElement).disabled).toBe(true),
    );
    release();
  });
});

describe("DeckView result actions", () => {
  it("sends and copies every card detail from a draw", async () => {
    const addToChat = vi.fn(async () => {});
    const copyText = vi.fn(async () => {});
    const service = {
      draw: vi.fn(async () => ({
        cards: [
          {
            card: deckOf(1).cards![0],
            reversed: true,
            resolved: {
              finalText: "A sudden reversal",
              chain: [],
              notices: [],
            },
          },
        ],
        positions: ["Past"],
        exhausted: false,
        empty: false,
      })),
      drawSpread: vi.fn(),
      reset: vi.fn(),
      remaining: vi.fn(async () => []),
    };
    render(DeckView, {
      props: {
        deck: deckOf(1),
        service,
        ...stores(),
        addToChat,
        copyText,
      } as never,
    });

    await fireEvent.click(screen.getByTestId("draw-cards"));
    await screen.findByTestId("add-draw-result-to-chat");
    await fireEvent.click(screen.getByTestId("add-draw-result-to-chat"));
    await fireEvent.click(screen.getByTestId("copy-draw-result"));

    const text = "Past: Card 0 (reversed): A sudden reversal";
    await waitFor(() => expect(addToChat).toHaveBeenCalledWith(text));
    expect(copyText).toHaveBeenCalledWith(text);
    await waitFor(() =>
      expect(screen.getByTestId("copy-draw-result").textContent).toContain(
        "Copied",
      ),
    );
  });
});
