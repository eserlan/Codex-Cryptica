import { describe, expect, it } from "vitest";
import { parseAdventureSession } from "@codex/adventure-engine";
import { hasCommittedOpening, initialSession } from "../adventure-session";
import { now, startInput } from "./adventure-fixtures";

// Shared setup stays in the fixture module; these assertions exercise the factory.
describe("adventure session setup", () => {
  it("creates a schema-readable session without a committed opening", () => {
    const session = initialSession({
      ...startInput,
      now,
      idGenerator: () => "id",
    });
    expect(parseAdventureSession(session)).toEqual(session);
    expect(hasCommittedOpening(session)).toBe(false);
    expect(hasCommittedOpening(null)).toBe(false);
    expect(hasCommittedOpening(undefined)).toBe(false);
  });

  it("copies seeded state and anchors a canonical starting location", () => {
    const worldEntry = {
      version: 1 as const,
      location: {
        kind: "canonical" as const,
        name: "Northbrook",
        recordId: "town",
      },
      intent: "explore" as const,
    };
    const session = initialSession({
      ...startInput,
      now,
      idGenerator: () => "id",
      worldEntry,
    });
    expect(session.visibleState.location).toMatchObject({
      source: "canonical",
      sourceRecordId: "town",
    });
    worldEntry.location.name = "Changed";
    expect(session.worldEntry?.location.name).toBe("Northbrook");
    expect(
      hasCommittedOpening({
        ...session,
        pendingRoll: {} as NonNullable<typeof session.pendingRoll>,
      }),
    ).toBe(true);
    expect(
      hasCommittedOpening({
        ...session,
        turns: [{} as (typeof session.turns)[number]],
      }),
    ).toBe(true);
  });
});
