import { describe, expect, it } from "bun:test";
import { deriveHexState } from "../src/state";
import type { HexRecord } from "../src/model";

const plain: HexRecord = { updatedAt: 1, notes: "x" };

describe("deriveHexState (T006, FR-013/014)", () => {
  it("is explored whenever the record is explored, even if fogged again", () => {
    expect(deriveHexState({ updatedAt: 1, explored: true }, false)).toBe(
      "explored",
    );
    expect(deriveHexState({ updatedAt: 1, explored: true }, true)).toBe(
      "explored",
    );
  });

  it("is seen when revealed and not explored", () => {
    expect(deriveHexState(plain, true)).toBe("seen");
  });

  it("is unknown when fogged and not explored", () => {
    expect(deriveHexState(plain, false)).toBe("unknown");
  });

  it("treats a hex with no record as unknown or seen by reveal alone", () => {
    expect(deriveHexState(undefined, false)).toBe("unknown");
    expect(deriveHexState(undefined, true)).toBe("seen");
  });
});
