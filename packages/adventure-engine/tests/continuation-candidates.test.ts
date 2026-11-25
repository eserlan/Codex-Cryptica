import { describe, expect, it } from "vitest";
import {
  buildContinuationScenarioSeed,
  launchContinuationCandidate,
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
      linkedFactIds: ["kf-person"],
    },
  ];
  s.places = [{ id: "pl-bay", name: "Docking Bay 4" }];
  s.visibleState.knownFacts = [
    {
      id: "kf-person",
      text: "Chief Engineer Vance logged an unauthorized valve bypass.",
      source: "provisional",
    },
    {
      id: "kf-place",
      text: "Coolant pressure fell in Docking Bay 4.",
      source: "provisional",
      placeId: "pl-bay",
    },
    {
      id: "kf-event",
      text: "The missing thruster telemetry chip has not been recovered.",
      source: "provisional",
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
        supportingFactIds: ["kf-event"],
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
    const evidenceIds = set.candidates.flatMap(
      (candidate) => candidate.sourceRecordIds,
    );
    expect(new Set(evidenceIds).size).toBe(evidenceIds.length);
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

  it("uses heard player-visible scenario events as event evidence", () => {
    const s = session();
    const heardScenario = {
      ...scenario(),
      id: "heard-scenario",
      knowledge: "heard" as const,
      events: [
        {
          id: "visible-event",
          kind: "discovery" as const,
          visibility: "player" as const,
          text: "The relay's emergency beacon began transmitting again.",
          at: "2026-11-25T00:00:00.000Z",
        },
        {
          id: "hidden-event",
          kind: "discovery" as const,
          visibility: "gm" as const,
          text: "A saboteur reactivated the beacon.",
          at: "2026-11-25T00:00:00.000Z",
        },
      ],
    };
    s.scenarioCollection = {
      version: 1,
      items: [heardScenario],
      focusedScenarioId: null,
    };

    const candidates = selectAdventureContinuationCandidates(s).candidates;
    const eventCandidate = candidates.find(
      (candidate) => candidate.anchorType === "event",
    );
    expect(eventCandidate?.sourceRecordIds).toContain("visible-event");
    expect(JSON.stringify(eventCandidate)).toContain(
      "began transmitting again",
    );
    expect(JSON.stringify(candidates)).not.toContain("saboteur");
  });

  it("does not create multiple pitches from the same known fact", () => {
    const s = session();
    s.people = [
      {
        id: "p-1",
        name: "Engineer Vance",
        aliases: [],
        linkedFactIds: ["kf-1"],
      },
    ];
    s.places = [{ id: "pl-1", name: "Relay Bay" }];
    s.visibleState.knownFacts = [
      {
        id: "kf-1",
        text: "Engineer Vance reported a failure in Relay Bay.",
        source: "provisional",
        placeId: "pl-1",
      },
    ];

    const candidates = selectAdventureContinuationCandidates(s).candidates;
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.anchorType).toBe("character");
  });

  it("does not duplicate an unresolved consequence with empty supportingFactIds across character and event pitches", () => {
    const s = session();
    s.people = [
      {
        id: "p-1",
        name: "Engineer Vance",
        aliases: [],
        linkedFactIds: [],
      },
    ];
    s.emergentThreads = [
      {
        id: "em-1",
        title: "Stabilize the relay",
        goal: "Stabilize the relay",
        status: "resolved",
        outcome: {
          result: "achieved",
          reason: "Power was restored.",
          sourceTurnId: "t-1",
          supportingFactIds: [],
          supportingCommitmentIds: [],
          recordedAt: "2026-11-25T00:00:00.000Z",
          sequence: 1,
          unresolvedConsequences: [
            "Engineer Vance still refuses to explain the missing logbook",
          ],
        },
        provenance: "play",
        topicTokens: ["relay"],
        linkedPersonIds: ["p-1"],
        linkedPlaceIds: [],
        linkedFactIds: [],
        linkedCommitmentIds: [],
        openQuestions: [],
        knownConsequences: [],
        gmOnlyDevelopments: [],
        createdAtTurnId: "t-1",
        updatedAtTurnId: "t-1",
        turnCount: 1,
      },
    ];

    const candidates = selectAdventureContinuationCandidates(s).candidates;
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.anchorType).toBe("character");
  });

  it("4. launches one chosen candidate idempotently without mutating prior outcome or sourcePackage (#5194)", () => {
    const s = sciFiSession();
    s.sourcePackage = {
      packageId: "pkg-station",
      version: "1.0.0",
      formatVersion: "adventure-json/v1",
      hash: "a".repeat(64),
    };
    const set = selectAdventureContinuationCandidates(s, {
      sourceOutcomeId: "emergent:em-coolant:t-5",
    });
    const chosen = set.candidates[0]!;
    const seed = buildContinuationScenarioSeed(chosen);
    expect(seed.origin).toEqual({ kind: "manual", manualId: chosen.id });

    const launched = launchContinuationCandidate(
      s,
      chosen,
      s.revision,
      "2026-11-25T01:00:00.000Z",
    );
    expect(launched.ok).toBe(true);
    if (!launched.ok) return;
    expect(launched.changed).toBe(true);
    expect(launched.session.scenarioCollection?.items).toHaveLength(2);
    expect(launched.session.scenarioCollection?.focusedScenarioId).toBe(
      seed.id,
    );
    expect(launched.session.emergentThreads![0]!.status).toBe("resolved");
    expect(launched.session.emergentThreads![0]!.outcome?.result).toBe(
      "achieved",
    );
    expect(launched.session.sourcePackage?.packageId).toBe("pkg-station");

    // Idempotent retry / double-click does not add a duplicate scenario
    const retry = launchContinuationCandidate(
      launched.session,
      chosen,
      launched.session.revision,
      "2026-11-25T01:00:01.000Z",
    );
    expect(retry.ok).toBe(true);
    if (retry.ok) {
      expect(retry.changed).toBe(false);
      expect(retry.session.scenarioCollection?.items).toHaveLength(2);
    }

    // Stale revision is rejected cleanly
    const stale = launchContinuationCandidate(
      launched.session,
      set.candidates[1]!,
      launched.session.revision - 1,
      "2026-11-25T01:00:02.000Z",
    );
    expect(stale).toEqual({ ok: false, reason: "stale-revision" });
  });
});
