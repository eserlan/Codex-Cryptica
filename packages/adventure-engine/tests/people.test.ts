import { describe, expect, it } from "vitest";
import {
  addPersonAlias,
  linkPersonToCanonical,
  MAX_ADVENTURE_PEOPLE,
  registerOrResolvePerson,
  removePersonFactLink,
} from "../src/people";
import type { AdventurePerson } from "../src/people-types";

describe("adventure people identities", () => {
  it("keeps a person after removal from activeCharacters and resolves by established alias", () => {
    const first = registerOrResolvePerson([], {
      id: "person-1",
      name: "Morgan",
      kind: "person",
      visibility: "player-visible",
      factId: "fact-morgan-1",
    });
    expect(first.person?.id).toBe("person-1");

    const aliased = addPersonAlias(
      first.people,
      "person-1",
      "The Harbourmaster",
    );
    const withoutActiveFact = removePersonFactLink(aliased, "fact-morgan-1");
    expect(withoutActiveFact).toHaveLength(1);

    const byAlias = registerOrResolvePerson(withoutActiveFact, {
      alias: "The Harbourmaster",
      kind: "person",
      visibility: "player-visible",
    });
    expect(byAlias.person?.id).toBe("person-1");
  });

  it("never merges same-name people by bare name alone", () => {
    const step1 = registerOrResolvePerson([], {
      id: "person-a",
      name: "Morgan",
      kind: "person",
      visibility: "player-visible",
    });
    const step2 = registerOrResolvePerson(step1.people, {
      id: "person-b",
      name: "Morgan",
      kind: "person",
      visibility: "player-visible",
    });
    expect(step2.people).toHaveLength(2);

    const ambiguous = registerOrResolvePerson(step2.people, {
      name: "Morgan",
      kind: "person",
      visibility: "player-visible",
    });
    expect(ambiguous.person).toBeNull();
    expect(ambiguous.reason).toBe("ambiguous");
  });

  it("excludes hidden GM-only facts and unknown IDs without failing", () => {
    const hidden = registerOrResolvePerson([], {
      id: "person-hidden",
      name: "Secret",
      kind: "person",
      visibility: "gm-only",
    });
    expect(hidden.people).toHaveLength(0);
    expect(hidden.person).toBeNull();

    const unknown = registerOrResolvePerson([], {
      id: "missing-id",
      kind: "person",
      visibility: "player-visible",
    });
    expect(unknown.person).toBeNull();
  });

  it("enforces 200 people capacity without truncating existing identities", () => {
    const full: AdventurePerson[] = Array.from(
      { length: MAX_ADVENTURE_PEOPLE },
      (_, i) => ({
        id: `p-${i}`,
        name: `Person ${i}`,
        aliases: [],
        linkedFactIds: [],
      }),
    );
    const over = registerOrResolvePerson(full, {
      id: "p-overflow",
      name: "Overflow",
      kind: "person",
      visibility: "player-visible",
    });
    expect(over.people).toHaveLength(MAX_ADVENTURE_PEOPLE);
    expect(over.person).toBeNull();
    expect(over.reason).toBe("capacity");
  });

  it("links a person to an exact canonical sourceRecordId", () => {
    const step1 = registerOrResolvePerson([], {
      id: "person-1",
      name: "Morgan",
      kind: "person",
      visibility: "player-visible",
    });
    const linked = linkPersonToCanonical(
      step1.people,
      "person-1",
      "entity-morgan",
    );
    expect(linked[0].sourceRecordId).toBe("entity-morgan");
  });

  it("resolves partial, title-omitted, and reordered names without auto-merging ambiguous matches", async () => {
    const {
      derivePersonAliases,
      resolvePersonByReference,
      syncPersonFromFact,
      mergeDuplicatePeople,
    } = await import("../src/people");

    expect(derivePersonAliases("Envoy Ilona Marshall")).toEqual([
      "Ilona Marshall",
      "Ilona",
      "Marshall",
    ]);

    let nextId = 0;
    const synced = syncPersonFromFact(
      [],
      {
        name: "Envoy Ilona Marshall",
        factId: "fact-1",
        visibility: "player-visible",
      },
      () => `person-${++nextId}`,
    );
    expect(synced.people).toHaveLength(1);
    expect(resolvePersonByReference(synced.people, "Ilona").person?.id).toBe(
      "person-1",
    );
    expect(
      resolvePersonByReference(synced.people, "Envoy Marshall Ilona").person
        ?.id,
    ).toBe("person-1");

    // Re-syncing partial name attaches to the same person rather than creating a second NPC
    const resynced = syncPersonFromFact(
      synced.people,
      {
        name: "Ilona",
        factId: "fact-2",
        visibility: "player-visible",
      },
      () => `person-${++nextId}`,
    );
    expect(resynced.people).toHaveLength(1);
    expect(resynced.people[0]?.linkedFactIds).toEqual(["fact-1", "fact-2"]);

    // Adding a second distinct NPC who happens to share the first name makes "Ilona" ambiguous
    const withSecond = registerOrResolvePerson(resynced.people, {
      id: "person-2",
      name: "Ilona Vance",
      kind: "person",
      visibility: "player-visible",
    }).people;
    const ambiguous = resolvePersonByReference(withSecond, "Ilona");
    expect(ambiguous.person).toBeNull();
    expect(ambiguous.reason).toBe("ambiguous");

    // Refuses to merge two people with distinct canonical sourceRecordIds
    const canonA = linkPersonToCanonical(withSecond, "person-1", "rec-a");
    const canonB = linkPersonToCanonical(canonA, "person-2", "rec-b");
    expect(mergeDuplicatePeople(canonB, "person-1", "person-2").merged).toBe(
      false,
    );
  });
});
