import { describe, expect, it } from "vitest";
import {
  materializeProvisionalFacts,
  mergeProvisionalFacts,
} from "../src/provisional-facts";
import { session } from "./reducer-fixtures";
import type { NewProvisionalFact } from "../src/types";
const person: NewProvisionalFact = {
  kind: "person",
  name: "Mara",
  summary: "A guide",
  visibility: "player-visible",
};

describe("provisional fact materialisation", () => {
  it("skips canonical names, deduplicates proposals by kind and retains private visibility", () => {
    const current = session();
    current.sourceRecords = [
      {
        recordId: "canonical",
        recordType: "person",
        displayName: " Canonical ",
        role: "anchor",
        availability: "available",
      },
    ];
    let id = 0;
    const result = materializeProvisionalFacts(
      current,
      [
        { ...person, name: "CANONICAL" },
        person,
        {
          ...person,
          name: " mara ",
          summary: "Private",
          visibility: "gm-only",
          scenarioId: "scenario-1",
        },
        { ...person, summary: "Latest" },
        { ...person, kind: "place" },
      ],
      "turn-1",
      new Set(),
      () => `fact-${++id}`,
    );
    expect(result).toEqual({
      provisionalFacts: [
        {
          ...person,
          id: "fact-1",
          introducedOnTurnId: "turn-1",
          summary: "Latest",
          visibility: "gm-only",
          scenarioId: "scenario-1",
        },
        {
          ...person,
          kind: "place",
          id: "fact-2",
          introducedOnTurnId: "turn-1",
        },
      ],
      updatedProvisionalFacts: [],
    });
    expect(current.provisionalFacts).toEqual([]);
  });

  it("updates an existing fact once without modifying its original identity or input", () => {
    const current = session();
    const existing = {
      ...person,
      id: "old",
      introducedOnTurnId: "old-turn",
      visibility: "gm-only" as const,
      scenarioId: "old-scenario",
    };
    current.provisionalFacts = [existing];
    const result = materializeProvisionalFacts(
      current,
      [
        { ...person, summary: "First" },
        { ...person, summary: "Last", scenarioId: "new-scenario" },
      ],
      "turn-1",
      new Set(),
      () => {
        throw new Error("No allocation expected");
      },
    );
    expect(result).toEqual({
      provisionalFacts: [],
      updatedProvisionalFacts: [
        { ...existing, summary: "Last", scenarioId: "new-scenario" },
      ],
    });
    expect(current.provisionalFacts).toEqual([existing]);
    expect(existing.summary).toBe("A guide");
  });

  it("rejects unallocatable facts without exposing a partial result", () => {
    expect(
      materializeProvisionalFacts(
        session(),
        [person],
        "turn-1",
        new Set(),
        () => "",
      ),
    ).toEqual({
      error: {
        ok: false,
        errors: [
          {
            code: "id-allocation-failed",
            message: "Could not allocate unique IDs for the generated state.",
          },
        ],
      },
    });
  });
});

it("merges fact updates and additions while retaining untouched facts in order", () => {
  const first = { ...person, id: "first", introducedOnTurnId: "old" };
  const second = { ...person, id: "second", introducedOnTurnId: "old" };
  const updated = { ...second, summary: "Updated" };
  const added = { ...person, id: "new", introducedOnTurnId: "new-turn" };
  expect(
    mergeProvisionalFacts([first, second], {
      updatedProvisionalFacts: [updated],
      provisionalFacts: [added],
    }),
  ).toEqual([first, updated, added]);
  expect(second.summary).toBe("A guide");
});
