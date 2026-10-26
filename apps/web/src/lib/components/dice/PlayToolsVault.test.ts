/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { RandomSource } from "random-source-engine";
import PlayToolsVault from "./PlayToolsVault.svelte";

const { openLightbox } = vi.hoisted(() => ({ openLightbox: vi.fn() }));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    resolveImageUrl: vi.fn(async (path: string) => `blob:${path}`),
    releaseImageUrl: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { openLightbox },
}));

if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () =>
    ({ finished: Promise.resolve(), cancel: () => {} }) as unknown as Animation;
}

function createSampleDeck(id: string, name: string): RandomSource {
  return {
    id,
    name,
    kind: "deck",
    labels: ["encounter"],
    cards: [
      { id: "c1", title: "Ambush", body: "Bandits emerge from the shadows" },
      { id: "c2", title: "Treasure", body: "A hidden chest is uncovered" },
    ],
    spreads: [],
    deckOptions: { drawMode: "without-replacement", allowReversals: false },
  };
}

function createSampleTable(id: string, name: string): RandomSource {
  return {
    id,
    name,
    kind: "table",
    labels: ["weather"],
    selection: { mode: "weighted" },
    entries: [
      { id: "e1", text: "Clear skies", weight: 1 },
      { id: "e2", text: "Heavy rain", weight: 2 },
    ],
  };
}

describe("PlayToolsVault", () => {
  it("renders the Dice tab by default with formula input and quick dice", () => {
    render(PlayToolsVault, {
      props: {
        sources: { decks: [], tables: [] } as any,
      },
    });

    expect(screen.getByTestId("play-tools-tab-dice")).toBeDefined();
    expect(screen.getByTestId("play-tools-tab-decks")).toBeDefined();
    expect(screen.getByTestId("play-tools-tab-tables")).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter formula/i)).toBeDefined();
  });

  it("switches to Decks tab and displays empty state when no decks exist", async () => {
    render(PlayToolsVault, {
      props: {
        sources: { decks: [], tables: [] } as any,
      },
    });

    const decksTab = screen.getByTestId("play-tools-tab-decks");
    await fireEvent.click(decksTab);

    expect(screen.getByTestId("no-decks-state")).toBeDefined();
    expect(screen.getByText("No Decks Available")).toBeDefined();
  });

  it("switches to Tables tab and displays empty state when no tables exist", async () => {
    render(PlayToolsVault, {
      props: {
        sources: { decks: [], tables: [] } as any,
      },
    });

    const tablesTab = screen.getByTestId("play-tools-tab-tables");
    await fireEvent.click(tablesTab);

    expect(screen.getByTestId("no-tables-state")).toBeDefined();
    expect(screen.getByText("No Tables Available")).toBeDefined();
  });

  it("displays available decks, allows selection, and draws cards", async () => {
    const deck1 = createSampleDeck("deck-1", "Encounter Deck");
    const deck2 = createSampleDeck("deck-2", "Loot Deck");
    const drawMock = vi.fn(async () => ({
      cards: [
        {
          card: deck1.cards![0],
          reversed: false,
          resolved: {
            finalText: "Bandits emerge from the shadows",
            chain: [],
            notices: [],
          },
        },
      ],
      exhausted: false,
      empty: false,
    }));

    const mockService = {
      draw: drawMock,
      drawSpread: vi.fn(),
      reset: vi.fn(),
      remaining: vi.fn(async () => deck1.cards ?? []),
    };

    render(PlayToolsVault, {
      props: {
        activeTab: "decks",
        sources: {
          decks: [deck1, deck2],
          tables: [],
          resolutionContext: () => ({ lookup: () => undefined }),
        } as any,
        service: mockService as any,
        history: { addResult: vi.fn() } as any,
      },
    });

    // Check deck selector
    const select = screen.getByTestId("deck-select") as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.options.length).toBe(2);

    // Click draw cards
    const drawButton = screen.getByTestId("draw-cards");
    await fireEvent.click(drawButton);

    await waitFor(() => {
      expect(drawMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("drawn-card")).toBeDefined();
      expect(screen.getByText("Ambush")).toBeDefined();
    });
  });

  it("displays available tables, allows selection, and rolls on table", async () => {
    const table1 = createSampleTable("tbl-1", "Weather Hazards");
    const table2 = createSampleTable("tbl-2", "Dungeon Encounters");

    const rollMock = vi.fn(() => ({
      finalText: "Heavy rain",
      chain: [
        {
          sourceName: table1.name,
          sourceKind: "table",
          dieValue: 2,
          text: "Heavy rain",
          children: [],
          status: "ok" as const,
        },
      ],
      notices: [],
    }));

    const mockSources = {
      decks: [],
      tables: [table1, table2],
      roll: rollMock,
      resolutionContext: () => ({ lookup: () => undefined }),
    };

    render(PlayToolsVault, {
      props: {
        activeTab: "tables",
        sources: mockSources as any,
        history: { addResult: vi.fn() } as any,
      },
    });

    // Check table selector
    const select = screen.getByTestId("table-select") as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.options.length).toBe(2);

    // Roll table
    const rollButton = screen.getByTestId("roll-table");
    await fireEvent.click(rollButton);

    await waitFor(() => {
      expect(rollMock).toHaveBeenCalledTimes(1);
      const rollResult = screen.getByTestId("roll-result");
      expect(rollResult).toBeDefined();
      expect(rollResult.textContent).toContain("Heavy rain");
    });
  });
});
