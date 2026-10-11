import { describe, expect, it } from "bun:test";
import type { CaptureKind } from "../src/types";
import {
  CAPTURE_KINDS,
  captureKindOf,
  isCaptured,
  withCaptureChoice,
} from "../src/capture-kinds";

describe("captureKindOf", () => {
  it("maps every existing and new automatic entry type to a kind", () => {
    expect(captureKindOf("dice-roll")).toBe("dice");
    expect(captureKindOf("table-result")).toBe("tables");
    expect(captureKindOf("card-draw")).toBe("decks");
    expect(captureKindOf("map-move")).toBe("map-moves");
    expect(captureKindOf("scene")).toBe("scenes");
    expect(captureKindOf("oracle-answer")).toBe("oracle");
    expect(captureKindOf("random-event")).toBe("oracle");
    expect(captureKindOf("tension-change")).toBe("tension");
    expect(captureKindOf("thread-change")).toBe("threads");
    expect(captureKindOf("party-change")).toBe("party");
    expect(captureKindOf("generated-result")).toBe("generated");
    expect(captureKindOf("generated-saved")).toBe("generated");
  });

  it("returns null for manual notes and unknown types", () => {
    expect(captureKindOf("manual-note")).toBeNull();
    expect(captureKindOf("something-new")).toBeNull();
  });
});

describe("isCaptured", () => {
  it("captures everything when no choice is stored", () => {
    expect(isCaptured({}, "dice-roll")).toBe(true);
    expect(isCaptured({}, "map-move")).toBe(true);
  });

  it("blocks a kind that is switched off, and only that kind", () => {
    const journal = { captureOff: ["dice" as const] };
    expect(isCaptured(journal, "dice-roll")).toBe(false);
    expect(isCaptured(journal, "table-result")).toBe(true);
    expect(isCaptured(journal, "oracle-answer")).toBe(true);
  });

  it("keeps the old map-move flag meaning map moves are off", () => {
    expect(isCaptured({ captureMapMoves: false }, "map-move")).toBe(false);
    expect(isCaptured({ captureMapMoves: false }, "dice-roll")).toBe(true);
  });

  it("always records manual notes, whatever is switched off", () => {
    const journal = { captureOff: [...CAPTURE_KINDS], captureMapMoves: false };
    expect(isCaptured(journal, "manual-note")).toBe(true);
  });
});

describe("withCaptureChoice", () => {
  it("switches a kind off, then on again, without duplicates", () => {
    let journal: { captureOff?: CaptureKind[] } = {};
    journal = withCaptureChoice(journal, "dice", false);
    journal = withCaptureChoice(journal, "dice", false);
    expect(journal.captureOff).toEqual(["dice"]);
    journal = withCaptureChoice(journal, "dice", true);
    expect(journal.captureOff).toBeUndefined();
  });

  it("keeps the stored kinds in canonical order", () => {
    let journal: { captureOff?: CaptureKind[] } = {};
    journal = withCaptureChoice(journal, "party", false);
    journal = withCaptureChoice(journal, "dice", false);
    expect(journal.captureOff).toEqual(["dice", "party"]);
  });
});
