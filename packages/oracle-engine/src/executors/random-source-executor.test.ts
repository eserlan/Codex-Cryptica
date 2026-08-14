import { describe, it, expect, beforeEach, vi } from "vitest";
import { RandomSourceExecutor } from "./random-source-executor";
import { OracleCommandParser } from "../oracle-parser";
import type { OracleExecutionContext } from "../types";

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    modelName: "test",
    vault: {},
    uiStore: {},
    chatHistory: { addMessage: vi.fn() },
    ...overrides,
  } as unknown as OracleExecutionContext;
}

const table = { id: "t1", name: "Forest Encounters", kind: "table" };
const deck = { id: "d1", name: "Complications", kind: "deck" };

describe("OracleCommandParser — /table and /deck (#2247)", () => {
  it("parses /table into a roll-table intent", () => {
    expect(
      OracleCommandParser.parse("/table Forest Encounters", false),
    ).toEqual({ type: "roll-table", sourceName: "Forest Encounters" });
  });

  it("parses /deck into a draw-deck intent", () => {
    expect(OracleCommandParser.parse("/deck Complications", false)).toEqual({
      type: "draw-deck",
      sourceName: "Complications",
    });
  });

  it("errors when /table is given no name", () => {
    expect(OracleCommandParser.parse("/table", false).type).toBe("error");
  });

  it("errors when /deck is given no name", () => {
    expect(OracleCommandParser.parse("/deck", false).type).toBe("error");
  });

  it("leaves /draw routed to the visualization intent (research R5)", () => {
    // Regression guard: taking /draw for cards would break image generation.
    const intent = OracleCommandParser.parse("/draw a castle", false);
    expect(intent.type).not.toBe("draw-deck");
  });

  it("does not match a command that merely starts with /table", () => {
    expect(OracleCommandParser.parse("/tables", false).type).not.toBe(
      "roll-table",
    );
  });

  it("does not match a command that merely starts with /deck", () => {
    expect(OracleCommandParser.parse("/decking", false).type).not.toBe(
      "draw-deck",
    );
  });

  it("reports both readings of a trailing number so the executor can choose", () => {
    const intent = OracleCommandParser.parse("/deck Tarot 3", false);
    expect(intent.sourceName).toBe("Tarot 3");
    expect(intent.countedName).toBe("Tarot");
    expect(intent.drawCount).toBe(3);
  });

  it("still parses /roll as a dice roll", () => {
    expect(OracleCommandParser.parse("/roll 1d20", false).type).toBe("roll");
  });
});

describe("RandomSourceExecutor", () => {
  let executor: RandomSourceExecutor;

  beforeEach(() => {
    executor = new RandomSourceExecutor();
  });

  it("posts the rolled result to the transcript", async () => {
    const ctx = makeContext({
      randomSources: {
        findByName: () => table,
        roll: async () => ({ text: "A troll", record: { total: 3 } }),
      },
    });
    await executor.execute(
      { type: "roll-table", sourceName: "Forest Encounters" },
      ctx,
    );
    expect(ctx.chatHistory.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: "A troll", type: "roll" }),
    );
  });

  it("posts the drawn card to the transcript", async () => {
    const ctx = makeContext({
      randomSources: {
        findByName: () => deck,
        draw: async () => ({ text: "The Tower", record: {} }),
      },
    });
    await executor.execute(
      { type: "draw-deck", sourceName: "Complications" },
      ctx,
    );
    expect(ctx.chatHistory.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: "The Tower" }),
    );
  });

  it("passes the requested card count through", async () => {
    const draw = vi.fn(async () => ({ text: "x", record: {} }));
    const ctx = makeContext({
      randomSources: {
        findByName: (n: string) => (n === "Complications" ? deck : undefined),
        draw,
      },
    });
    await executor.execute(
      {
        type: "draw-deck",
        sourceName: "Complications 3",
        countedName: "Complications",
        drawCount: 3,
      },
      ctx,
    );
    expect(draw).toHaveBeenCalledWith(deck, 3);
  });

  it("prefers a deck whose name genuinely ends in a number", async () => {
    // "/deck Deck 52" must draw one card from "Deck 52", not 52 cards from
    // a deck called "Deck".
    const numbered = { id: "d2", name: "Deck 52", kind: "deck" };
    const draw = vi.fn(async () => ({ text: "x", record: {} }));
    const ctx = makeContext({
      randomSources: {
        findByName: (n: string) => (n === "Deck 52" ? numbered : undefined),
        draw,
      },
    });
    await executor.execute(
      {
        type: "draw-deck",
        sourceName: "Deck 52",
        countedName: "Deck",
        drawCount: 52,
      },
      ctx,
    );
    expect(draw).toHaveBeenCalledWith(numbered, 1);
  });

  it("names close matches when nothing matches (FR-040)", async () => {
    const ctx = makeContext({
      randomSources: {
        findByName: () => undefined,
        suggestNames: () => ["Forest Encounters", "Forest Loot"],
      },
    });
    await executor.execute({ type: "roll-table", sourceName: "forst" }, ctx);
    const message = (ctx.chatHistory.addMessage as any).mock.calls[0][0]
      .content;
    expect(message).toContain("Forest Encounters");
    expect(message).toContain("Did you mean");
  });

  it("fails clearly when there are no close matches", async () => {
    const ctx = makeContext({
      randomSources: { findByName: () => undefined, suggestNames: () => [] },
    });
    await executor.execute({ type: "roll-table", sourceName: "zzz" }, ctx);
    const message = (ctx.chatHistory.addMessage as any).mock.calls[0][0]
      .content;
    expect(message).toContain("No table");
    expect(message).not.toContain("Did you mean");
  });

  it("redirects when a deck is invoked as a table", async () => {
    const ctx = makeContext({
      randomSources: { findByName: () => deck, suggestNames: () => [] },
    });
    await executor.execute(
      { type: "roll-table", sourceName: "Complications" },
      ctx,
    );
    const message = (ctx.chatHistory.addMessage as any).mock.calls[0][0]
      .content;
    expect(message).toContain("/deck Complications");
  });

  it("redirects when a table is invoked as a deck", async () => {
    const ctx = makeContext({
      randomSources: { findByName: () => table, suggestNames: () => [] },
    });
    await executor.execute(
      { type: "draw-deck", sourceName: "Forest Encounters" },
      ctx,
    );
    const message = (ctx.chatHistory.addMessage as any).mock.calls[0][0]
      .content;
    expect(message).toContain("/table Forest Encounters");
  });

  it("reports a failure rather than throwing", async () => {
    const ctx = makeContext({
      randomSources: {
        findByName: () => table,
        roll: async () => {
          throw new Error("boom");
        },
      },
    });
    // Resolving, not rejecting, is the assertion: a failed roll reports itself
    // in the transcript and the command completes.
    await executor.execute(
      { type: "roll-table", sourceName: "Forest Encounters" },
      ctx,
    );
    const message = (ctx.chatHistory.addMessage as any).mock.calls[0][0]
      .content;
    expect(message).toContain("Could not roll");
  });

  it("reports cleanly when tables are unavailable", async () => {
    const ctx = makeContext();
    await executor.execute({ type: "roll-table", sourceName: "x" }, ctx);
    expect(ctx.chatHistory.addMessage).toHaveBeenCalled();
  });
});
