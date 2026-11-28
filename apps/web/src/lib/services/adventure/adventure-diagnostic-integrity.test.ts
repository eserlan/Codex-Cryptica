import { describe, expect, it } from "vitest";
import { integrityChecks } from "./adventure-diagnostic-integrity";
import { exampleSession, quietSession } from "./test-fixtures/adventure-review";

describe("Adventure diagnostic integrity", () => {
  it("leaves valid references free of findings", () => {
    expect(Object.values(integrityChecks(exampleSession())).flat()).toEqual([]);
    expect(Object.values(integrityChecks(quietSession(0))).flat()).toEqual([]);
  });

  it("identifies missing references without discarding the offending IDs", () => {
    const session = quietSession(2);
    session.provisionalFacts = exampleSession().provisionalFacts;
    session.provisionalFacts[0].introducedOnTurnId = "missing-turn";
    session.turns[0].provisionalFactIds = ["missing-fact"];
    session.turns[1].sequence = 9;
    session.turns[1].revealedSecretIds = ["unknown-secret"];
    session.hiddenState.secrets[0].status = "revealed";
    session.hiddenState.secrets[0].revealedOnTurnId = "missing-turn";
    session.people = [
      {
        id: "person-1",
        name: "Mara",
        aliases: [],
        linkedFactIds: ["missing-fact"],
      },
    ];

    expect(integrityChecks(session)).toEqual({
      nonContiguousTurnSequences: ["turn-1"],
      factsIntroducedOnMissingTurn: ["fact-1"],
      turnsReferencingMissingFacts: ["turn-0"],
      turnsRevealingUnknownSecrets: ["turn-1"],
      secretsMarkedRevealedWithoutTurn: ["secret-1"],
      orphanedPersonFactLinks: [
        { personId: "person-1", factId: "missing-fact" },
      ],
      duplicateActiveCharacterPresence: [],
    });
  });
});
