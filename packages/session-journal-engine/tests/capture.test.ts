import { describe, it, expect } from "vitest";
import {
  buildCaptureFromRoll,
  captureToEntryInput,
  JOURNAL_CAPTURE_LIMITS,
  type CapturableRoll,
} from "../src/capture";

const diceRoll = (over: Partial<CapturableRoll> = {}): CapturableRoll => ({
  total: 11,
  formula: "2d6+3",
  context: "modal",
  parts: [
    { type: "dice", sides: 6, rolls: [3, 5], value: 8 },
    { type: "modifier", value: 3 },
  ],
  ...over,
});

describe("buildCaptureFromRoll", () => {
  it("turns a dice result into a dice-roll payload with formula and total", () => {
    const payload = buildCaptureFromRoll(diceRoll())!;
    expect(payload.entryType).toBe("dice-roll");
    expect(payload.content).toContain("2d6+3");
    expect(payload.content).toContain("11");
    expect(payload.sourceRef).toMatchObject({ formula: "2d6+3", total: 11 });
    expect((payload.sourceRef as any).parts).toHaveLength(2);
  });

  it("includes a label such as a stat sheet field name", () => {
    const payload = buildCaptureFromRoll(diceRoll({ label: "Strength" }))!;
    expect(payload.content).toContain("Strength");
  });

  it("turns a table result into a table-result payload", () => {
    const payload = buildCaptureFromRoll({
      total: 4,
      parts: [],
      formula: "table roll",
      context: "table",
      source: {
        sourceId: "t1",
        sourceName: "Encounters",
        kind: "table",
        finalText: "2 goblins arguing over a map",
      },
    })!;
    expect(payload.entryType).toBe("table-result");
    expect(payload.content).toContain("Encounters");
    expect(payload.content).toContain("2 goblins arguing over a map");
    expect(payload.sourceRef).toMatchObject({
      sourceId: "t1",
      sourceName: "Encounters",
      kind: "table",
    });
  });

  it("turns a deck draw into a card-draw payload naming each card", () => {
    const payload = buildCaptureFromRoll({
      total: 2,
      parts: [],
      formula: "draw",
      context: "table",
      source: {
        sourceId: "d1",
        sourceName: "Tarot",
        kind: "deck",
        finalText: "",
        drawnCards: [
          { cardId: "c1", title: "The Tower", reversed: true },
          { cardId: "c2", title: "The Sun", reversed: false },
        ],
      },
    })!;
    expect(payload.entryType).toBe("card-draw");
    expect(payload.content).toContain("The Tower (reversed)");
    expect(payload.content).toContain("The Sun");
    expect(payload.content).not.toContain("The Sun (reversed)");
    expect((payload.sourceRef as any).cards).toEqual([
      { cardId: "c1", title: "The Tower", reversed: true },
      { cardId: "c2", title: "The Sun", reversed: false },
    ]);
  });

  it("returns undefined for a table result with no text (negative)", () => {
    expect(
      buildCaptureFromRoll({
        total: 1,
        parts: [],
        context: "table",
        source: {
          sourceId: "t1",
          sourceName: "Empty",
          kind: "table",
          finalText: "   ",
        },
      }),
    ).toBeUndefined();
  });

  it("never lets a table's resolution chain into the reference (negative)", () => {
    const roll = {
      total: 1,
      parts: [],
      context: "table",
      source: {
        sourceId: "t1",
        sourceName: "Deep",
        kind: "table",
        finalText: "result",
        chain: [{ big: "x".repeat(10_000) }],
      },
    } as unknown as CapturableRoll;
    const payload = buildCaptureFromRoll(roll)!;
    expect(JSON.stringify(payload.sourceRef)).not.toContain("xxxx");
    expect(payload.sourceRef).not.toHaveProperty("chain");
  });

  it("limits a draw to the maximum number of cards", () => {
    const cards = Array.from({ length: 50 }, (_, i) => ({
      cardId: `c${i}`,
      title: `Card ${i}`,
      reversed: false,
    }));
    const payload = buildCaptureFromRoll({
      total: 50,
      parts: [],
      context: "table",
      source: {
        sourceId: "d1",
        sourceName: "Big deck",
        kind: "deck",
        finalText: "",
        drawnCards: cards,
      },
    })!;
    expect((payload.sourceRef as any).cards).toHaveLength(
      JOURNAL_CAPTURE_LIMITS.maxCards,
    );
  });
});

describe("captureToEntryInput", () => {
  it("passes a valid payload through with the given section", () => {
    const result = captureToEntryInput(
      {
        entryType: "dice-roll",
        content: "Rolled 1d20: 14",
        sourceRef: { total: 14 },
      },
      "s1",
    );
    expect(result).toEqual({
      ok: true,
      input: {
        type: "dice-roll",
        content: "Rolled 1d20: 14",
        sourceRef: { total: 14 },
        sectionId: "s1",
      },
    });
  });

  it("omits sectionId when none is given", () => {
    const result = captureToEntryInput({ entryType: "x", content: "y" });
    expect(result.ok && "sectionId" in result.input).toBe(false);
  });

  it("accepts an entry type it has never seen (extensible)", () => {
    const result = captureToEntryInput({
      entryType: "generator-output",
      content: "A brand new source",
    });
    expect(result.ok && result.input.type).toBe("generator-output");
  });

  it("rejects a blank summary or a blank type (negative)", () => {
    expect(captureToEntryInput({ entryType: "x", content: "   " }).ok).toBe(
      false,
    );
    expect(captureToEntryInput({ entryType: " ", content: "y" }).ok).toBe(
      false,
    );
    expect(captureToEntryInput({ entryType: 5, content: "y" } as any).ok).toBe(
      false,
    );
    expect(captureToEntryInput(undefined as any).ok).toBe(false);
  });

  it("cuts a long summary to the cap, ending in an ellipsis (boundary)", () => {
    const cap = JOURNAL_CAPTURE_LIMITS.summary;
    const exact = captureToEntryInput({
      entryType: "x",
      content: "a".repeat(cap),
    });
    expect(exact.ok && exact.input.content).toBe("a".repeat(cap));

    const over = captureToEntryInput({
      entryType: "x",
      content: "a".repeat(cap + 1),
    });
    expect(over.ok && over.input.content.length).toBe(cap);
    expect(over.ok && over.input.content.endsWith("…")).toBe(true);
  });

  it("caps result text inside the reference", () => {
    const result = captureToEntryInput({
      entryType: "table-result",
      content: "x",
      sourceRef: { finalText: "t".repeat(5_000) },
    });
    expect(result.ok && (result.input.sourceRef as any).finalText.length).toBe(
      JOURNAL_CAPTURE_LIMITS.resultText,
    );
  });

  it("keeps the reference within the byte budget, dropping the largest part first", () => {
    const result = captureToEntryInput({
      entryType: "x",
      content: "x",
      sourceRef: { small: "keep me", huge: "h".repeat(20_000) },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const bytes = new TextEncoder().encode(
        JSON.stringify(result.input.sourceRef),
      ).length;
      expect(bytes).toBeLessThanOrEqual(JOURNAL_CAPTURE_LIMITS.sourceRefBytes);
      expect(result.input.sourceRef).toHaveProperty("small", "keep me");
      expect(result.input.sourceRef).not.toHaveProperty("huge");
    }
  });

  it("reduces a reference with functions and cycles to plain data without throwing (negative)", () => {
    const cyclic: any = { name: "loop" };
    cyclic.self = cyclic;
    const result = captureToEntryInput({
      entryType: "x",
      content: "x",
      sourceRef: { fn: () => 1, ok: 1, cyclic, undef: undefined },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ref = result.input.sourceRef as any;
      expect(ref.ok).toBe(1);
      expect(ref).not.toHaveProperty("fn");
      expect(ref).not.toHaveProperty("undef");
      expect(() => JSON.stringify(ref)).not.toThrow();
    }
  });

  it("drops a chain key wherever it appears", () => {
    const result = captureToEntryInput({
      entryType: "x",
      content: "x",
      sourceRef: { kind: "table", chain: [1, 2, 3], nested: { chain: ["a"] } },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.stringify(result.input.sourceRef)).not.toContain("chain");
    }
  });

  it("keeps booleans and null, and turns non-finite numbers into null", () => {
    const result = captureToEntryInput({
      entryType: "x",
      content: "x",
      sourceRef: {
        yes: true,
        no: false,
        nothing: null,
        nan: NaN,
        inf: Infinity,
      },
    });
    expect(result.ok && result.input.sourceRef).toEqual({
      yes: true,
      no: false,
      nothing: null,
      nan: null,
      inf: null,
    });
  });

  it("ignores a reference that is not a plain object (negative)", () => {
    for (const bad of ["text", 5, [1, 2], null]) {
      const result = captureToEntryInput({
        entryType: "x",
        content: "x",
        sourceRef: bad as any,
      });
      expect(result.ok && "sourceRef" in result.input).toBe(false);
    }
  });

  it("caps a nested card list under a 'cards' key", () => {
    const cards = Array.from({ length: 40 }, (_, i) => ({ id: i }));
    const result = captureToEntryInput({
      entryType: "x",
      content: "x",
      sourceRef: { cards },
    });
    expect(result.ok && (result.input.sourceRef as any).cards.length).toBe(
      JOURNAL_CAPTURE_LIMITS.maxCards,
    );
  });
});
