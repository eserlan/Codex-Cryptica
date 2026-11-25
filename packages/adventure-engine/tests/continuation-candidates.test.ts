import { describe, expect, it } from "vitest";
import {
  selectAdventureContinuationCandidates,
  type AdventureSession,
} from "../src";
import { scenario, session } from "./reducer-fixtures";

function sciFiSession(): AdventureSession {
  const s = session();
  s.title = "Station Relay Nine";
  s.premise = "Orbital relay technicians ration coolant after a thruster leak.";
  s.people = [
    {
      id: "p-tech",
      name: "Chief Engineer Vance",
      aliases: ["Vance"],
      linkedFactIds: ["kf-valve"],
    },
  ];
  s.places = [{ id: "pl-bay", name: "Docking Bay 4" }];
  s.visibleState.knownFacts = [
    {
      id: "kf-valve",
      text: "Chief Engineer Vance logged an unauthorized valve bypass in Docking Bay 4.",
      source: "provisional",
      placeId: "pl-bay",
    },
  ];
  s.emergentThreads = [
    {
      id: "em-coolant",
      title: "Restore coolant pressure to Sector B",
      goal: "Restore coolant pressure to Sector B",
      status: "resolved",
      outcome: {
        result: "achieved",
        reason: "Auxiliary coolant lines were rerouted and stabilized.",
        sourceTurnId: "t-5",
        supportingFactIds: ["kf-valve"],
        supportingCommitmentIds: [],
        recordedAt: "2026-11-25T00:00:00.000Z",
        sequence: 4,
        unresolvedConsequences: [
          "The missing thruster telemetry chip has not been recovered",
        ],
      },
      provenance: "play",
      topicTokens: ["coolant", "valve"],
      linkedPersonIds: ["p-tech"],
      linkedPlaceIds: ["pl-bay"],
      linkedFactIds: ["kf-valve"],
      linkedCommitmentIds: [],
      openQuestions: [],
      knownConsequences: ["Auxiliary coolant lines stabilized."],
      gmOnlyDevelopments: ["Syndicate saboteur waits in Cargo Hold 7"],
      createdAtTurnId: "t-1",
      updatedAtTurnId: "t-5",
      turnCount: 5,
    },
  ];
  s.hiddenState.secrets.push({
    id: "sec-saboteur",
    text: "Syndicate saboteur waits in Cargo Hold 7",
    status: "hidden",
  });
  s.scenarioCollection = {
    version: 1,
    items: [
      {
        ...scenario(),
        id: "sc-unheard",
        knowledge: "unheard",
        playerVisible: {
          rumour: "Reactor core fracture",
          lead: "Unheard reactor core crisis",
        },
        gmOnly: { truth: "Reactor core will melt down in 2 hours" },
      },
    ],
    focusedScenarioId: null,
  };
  return s;
}

describe("selectAdventureContinuationCandidates (#5193)", () => {
  it("1 & 5. selects distinct character, place, and event pitches for a non-fantasy sci-fi session without mutating state", () => {
    const s = sciFiSession();
    const snapshot = JSON.stringify(s);

    const set = selectAdventureContinuationCandidates(s, {
      sourceOutcomeId: "emergent:em-coolant:t-5",
      genreHint: "hard-sci-fi",
    });

    expect(JSON.stringify(s)).toBe(snapshot);
    expect(set.sourceRevision).toBe(s.revision);
    expect(set.sourceOutcomeId).toBe("emergent:em-coolant:t-5");
    expect(set.freshOption.title).toBe("Start something unrelated");

    const types = set.candidates.map((c) => c.anchorType);
    expect(types).toEqual(["character", "place", "event"]);
    expect(set.candidates[0]!.playerSafeTitle).toContain(
      "Chief Engineer Vance",
    );
    expect(set.candidates[1]!.playerSafeTitle).toContain("Docking Bay 4");
    expect(set.candidates[2]!.playerSafePremise).toContain(
      "missing thruster telemetry chip",
    );
    for (const c of set.candidates) {
      expect(c.sourceRecordIds.length).toBeGreaterThan(0);
      expect(c.uncertainty.length).toBeGreaterThan(0);
      expect(c.genreHint).toBe("hard-sci-fi");
    }
  });

  it("2. never leaks GM-only secrets, gmOnlyDevelopments, or unheard scenario truth", () => {
    const s = sciFiSession();
    s.emergentThreads![0]!.outcome!.unresolvedConsequences!.push(
      "Syndicate saboteur waits in Cargo Hold 7",
    );

    const set = selectAdventureContinuationCandidates(s);
    const serialized = JSON.stringify(set);
    expect(serialized).not.toContain("Cargo Hold 7");
    expect(serialized).not.toContain("Reactor core");
    expect(serialized).not.toContain("melt down");
  });

  it("3. handles scarcity cleanly (one NPC, no places/events) and respects dismissedCandidateIds", () => {
    const s = session();
    s.people = [
      {
        id: "p-lone",
        name: "Archivist Mara",
        aliases: [],
        linkedFactIds: ["kf-1"],
      },
    ];
    s.visibleState.knownFacts = [
      {
        id: "kf-1",
        text: "Archivist Mara keeps the harbour tax ledgers.",
        source: "provisional",
      },
    ];

    const first = selectAdventureContinuationCandidates(s);
    expect(first.candidates).toHaveLength(1);
    expect(first.candidates[0]!.anchorType).toBe("character");
    expect(first.freshOption).toBeTruthy();

    const afterDismiss = selectAdventureContinuationCandidates(s, {
      dismissedCandidateIds: [first.candidates[0]!.id],
    });
    expect(afterDismiss.candidates).toHaveLength(0);
    expect(afterDismiss.freshOption).toBeTruthy();
  });
});
