/** @vitest-environment jsdom */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { RandomSource } from "random-source-engine";

const { openLightbox } = vi.hoisted(() => ({ openLightbox: vi.fn() }));

// CardImage (rendered for every drawn card) resolves art through the vault
// and opens pictures through the app's shared lightbox store; both are
// reached for by module path rather than passed as props, so they need
// mocking here the way every other test touching them does.
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    resolveImageUrl: vi.fn(async (path: string) => `blob:${path}`),
    releaseImageUrl: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { openLightbox },
}));

import DeckView from "./DeckView.svelte";
import {
  clearOracleChatDraft,
  getOracleChatDraft,
} from "$lib/components/oracle/oracle-chat-input";

if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () =>
    ({ finished: Promise.resolve(), cancel: () => {} }) as unknown as Animation;
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

  it("dispatches to both VTT chat and Oracle chat by default on add to chat", async () => {
    clearOracleChatDraft();
    const sendCardDrawMessage = vi.fn();
    const session = {
      vttEnabled: false,
      sendCardDrawMessage,
      sendChatMessage: vi.fn(),
    };
    const service = {
      draw: vi.fn(async () => ({
        cards: [
          {
            card: deckOf(1).cards![0],
            reversed: false,
            resolved: {
              finalText: "The journey begins",
              chain: [],
              notices: [],
            },
          },
        ],
        positions: ["Present"],
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
        session,
        ...stores(),
      } as never,
    });

    await fireEvent.click(screen.getByTestId("draw-cards"));
    await screen.findByTestId("add-draw-result-to-chat");
    await fireEvent.click(screen.getByTestId("add-draw-result-to-chat"));

    await waitFor(() =>
      expect(sendCardDrawMessage).toHaveBeenCalledWith("Complications", [
        {
          deckName: "Complications",
          title: "Card 0",
          body: "The journey begins",
          imagePath: undefined,
          reversed: undefined,
          position: "Present",
        },
      ]),
    );
    expect(getOracleChatDraft()).toBe(
      "Complications:\nPresent: Card 0: The journey begins",
    );
  });
});

describe("DeckView card art", () => {
  function serviceDrawing(cardCount: number, imagePath?: string) {
    const deck = deckOf(cardCount);
    if (imagePath) deck.cards![0]!.imagePath = imagePath;
    return {
      deck,
      service: {
        draw: vi.fn(async () => ({
          cards: deck.cards!.map((card) => ({
            card,
            reversed: false,
            resolved: { finalText: card.body ?? "", chain: [], notices: [] },
          })),
          positions: undefined,
          exhausted: false,
          empty: false,
        })),
        drawSpread: vi.fn(),
        reset: vi.fn(),
        remaining: vi.fn(async () => []),
      },
    };
  }

  it("opens the lightbox when a drawn card's art is clicked", async () => {
    openLightbox.mockClear();
    const { deck, service } = serviceDrawing(2, "images/card-0.webp");
    render(DeckView, { props: { deck, service, ...stores() } as never });

    await fireEvent.click(screen.getByTestId("draw-cards"));
    const results = await screen.findByTestId("draw-results");
    const zoom = await within(results).findByTestId("card-image-zoom");
    await fireEvent.click(zoom);

    expect(openLightbox).toHaveBeenCalledWith(
      "blob:images/card-0.webp",
      "Card 0",
      expect.anything(),
      "images/card-0.webp",
    );
  });

  it("auto-opens the lightbox as the reveal for a single-card draw", async () => {
    openLightbox.mockClear();
    const { deck, service } = serviceDrawing(1, "images/card-0.webp");
    render(DeckView, { props: { deck, service, ...stores() } as never });

    await fireEvent.click(screen.getByTestId("draw-cards"));

    await waitFor(() =>
      expect(openLightbox).toHaveBeenCalledWith(
        "blob:images/card-0.webp",
        "Card 0",
        null,
        "images/card-0.webp",
      ),
    );
  });

  it("does not auto-open the lightbox when the reveal is switched off", async () => {
    openLightbox.mockClear();
    const { deck, service } = serviceDrawing(1, "images/card-0.webp");
    render(DeckView, {
      props: { deck, service, revealArt: false, ...stores() } as never,
    });

    await fireEvent.click(screen.getByTestId("draw-cards"));
    await screen.findAllByTestId("drawn-card");

    expect(openLightbox).not.toHaveBeenCalled();
  });

  it("does not auto-open the lightbox for a multi-card draw", async () => {
    openLightbox.mockClear();
    const { deck, service } = serviceDrawing(2, "images/card-0.webp");
    render(DeckView, { props: { deck, service, ...stores() } as never });

    await fireEvent.click(screen.getByTestId("draw-cards"));
    await screen.findAllByTestId("drawn-card");

    expect(openLightbox).not.toHaveBeenCalled();
  });

  it("sends structured card draw payload to VTT chat when Add to chat is clicked", async () => {
    clearOracleChatDraft();
    const sendCardDrawMessage = vi.fn();
    const session = {
      sendCardDrawMessage,
      sendChatMessage: vi.fn(),
    };
    const { deck, service } = serviceDrawing(1, "images/card-0.webp");
    render(DeckView, {
      props: { deck, service, session, ...stores() } as never,
    });

    await fireEvent.click(screen.getByTestId("draw-cards"));
    await screen.findAllByTestId("drawn-card");

    const addBtn = screen.getByTestId("add-draw-result-to-chat");
    await fireEvent.click(addBtn);

    expect(sendCardDrawMessage).toHaveBeenCalledWith("Complications", [
      {
        deckName: "Complications",
        title: "Card 0",
        body: "Body 0",
        imagePath: "images/card-0.webp",
        reversed: undefined,
        position: undefined,
      },
    ]);
    expect(getOracleChatDraft()).toContain("Complications:\nCard 0: Body 0");
  });
});
