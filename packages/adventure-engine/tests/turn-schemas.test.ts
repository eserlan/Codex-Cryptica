import { describe, expect, it } from "vitest";
import {
  parseTurnProposal,
  persistedTurnSchema,
  turnProposalSchema,
} from "../src/turn-schemas";
import { now, proposal } from "./reducer-fixtures";

describe("turn schemas", () => {
  it("accepts both proposal kinds and keeps secret IDs opaque", () => {
    const complete = { ...proposal(), revealSecretIds: [" secret "] };
    expect(parseTurnProposal(complete)).toEqual(complete);
    expect(
      turnProposalSchema.parse({
        kind: "roll-required",
        uncertainty: "Cross?",
        stakes: "Fall",
        sourceRecordIds: [],
      }).kind,
    ).toBe("roll-required");
    expect(() =>
      parseTurnProposal({ ...complete, suggestedActions: ["Wait"] }),
    ).toThrow();
    expect(() => parseTurnProposal({ ...complete, kind: "unknown" })).toThrow();
  });

  it("allows opening history and bounds committed time without accepting developments", () => {
    const complete = proposal();
    const turn = {
      id: "turn-1",
      sequence: 0,
      inputId: "input-1",
      playerAction: "",
      narration: complete.narration,
      visiblePatch: complete.visiblePatch,
      hiddenPatch: complete.hiddenPatch,
      revealedSecretIds: [],
      sourceRecordIds: [],
      provisionalFactIds: [],
      committedAt: now,
      timeAdvance: { minutes: 1, cause: "Wait" },
    };
    expect(persistedTurnSchema.parse(turn)).toEqual(turn);
    expect(
      persistedTurnSchema.safeParse({
        ...turn,
        timeAdvance: { ...turn.timeAdvance, developments: [] },
      }).success,
    ).toBe(false);
    expect(
      persistedTurnSchema.safeParse({ ...turn, sequence: -1 }).success,
    ).toBe(false);
  });
});
