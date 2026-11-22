import { describe, expect, it } from "vitest";
import {
  hiddenPatchSchema,
  persistedHiddenPatchSchema,
  persistedVisiblePatchSchema,
  visiblePatchSchema,
  visibleStateSchema,
} from "../src/state-schemas";
import { emptyHiddenPatch, emptyVisiblePatch } from "./reducer-fixtures";

describe("state schemas", () => {
  it("accepts model additions without IDs and durable additions with IDs", () => {
    const patch = {
      ...emptyVisiblePatch(),
      knownFacts: {
        add: [{ text: "A clue", source: "provisional" }],
        update: [],
        removeIds: [],
      },
    };
    expect(visiblePatchSchema.parse(patch)).toEqual(patch);
    const persisted = {
      ...patch,
      knownFacts: {
        ...patch.knownFacts,
        add: [{ id: "fact-1", text: "A clue", source: "provisional" }],
      },
    };
    expect(persistedVisiblePatchSchema.parse(persisted)).toEqual(persisted);
    expect(visiblePatchSchema.safeParse(persisted).success).toBe(false);
    expect(persistedVisiblePatchSchema.safeParse(patch).success).toBe(false);
  });

  it("keeps secret reveal metadata on durable patches and rejects it on proposals", () => {
    const patch = {
      ...emptyHiddenPatch(),
      secrets: {
        add: [{ text: "A secret", status: "hidden" }],
        update: [],
        removeIds: [],
      },
    };
    expect(hiddenPatchSchema.parse(patch)).toEqual(patch);
    const persisted = {
      ...patch,
      secrets: {
        ...patch.secrets,
        add: [
          {
            id: "secret-1",
            text: "A secret",
            status: "revealed",
            revealedOnTurnId: "turn-1",
          },
        ],
      },
    };
    expect(persistedHiddenPatchSchema.parse(persisted)).toEqual(persisted);
    expect(hiddenPatchSchema.safeParse(persisted).success).toBe(false);
  });

  it("bounds known facts in saved state", () => {
    const state = {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    };
    expect(visibleStateSchema.parse(state)).toEqual(state);
    expect(
      visibleStateSchema.safeParse({
        ...state,
        knownFacts: Array.from({ length: 61 }, (_, index) => ({
          id: `fact-${index}`,
          text: "A clue",
          source: "canonical",
        })),
      }).success,
    ).toBe(false);
  });
});
