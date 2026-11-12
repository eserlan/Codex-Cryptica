import { describe, expect, it } from "vitest";
import * as reducer from "../src/reducer";
import * as engine from "../src";
import { meta, proposal, session } from "./reducer-fixtures";

describe("adventure reducer compatibility facade", () => {
  it("preserves all seven exports through both original entry points", () => {
    expect(Object.keys(reducer).sort()).toEqual([
      "applyCompletedTurn",
      "applyRollRequest",
      "applyVisiblePatch",
      "createPlayerTranscript",
      "dismissPendingRoll",
      "recordPendingRollOutcome",
      "resolveRecordedRoll",
    ]);
    for (const key of Object.keys(reducer) as Array<keyof typeof reducer>) {
      expect(reducer[key]).toBe(engine[key]);
    }
  });

  it("rejects duplicate inputs atomically through the original module", () => {
    const first = reducer.applyCompletedTurn(session(), proposal(), meta);
    if (!first.ok) throw new Error("Expected first turn");
    const before = structuredClone(first.value);
    const duplicate = reducer.applyCompletedTurn(first.value, proposal(), meta);
    expect(duplicate).toEqual({
      ok: false,
      errors: [
        {
          code: "duplicate-input",
          message: "This action was already processed.",
        },
      ],
    });
    expect(first.value).toEqual(before);
  });
});
