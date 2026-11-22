import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  MAX_BEHAVIOR_PROMPT_CHARS,
  MAX_DIRECTOR_BRIEF_CHARS,
  MAX_GENERATION_INPUT_CHARS,
  MAX_SERIALIZED_STATE_CHARS,
  SCENE_STALL_TURN_LIMIT,
  buildAdventurePrompt,
  buildGMDirectorBrief,
  createScenarioState,
  parseAdventureSession,
  playerScenarioCollectionProjection,
  projectVisibleState,
  retrieveAdventureJsonContext,
  type AdventureJsonV1,
  type AdventureSession,
  type CommittedAdventureTurn,
  type ScenarioItem,
} from "../src";
import { createLivingSettlementWorldEntrySession } from "./living-settlement-fixture";
import { session as baseSession } from "./reducer-fixtures";

const now = "2026-11-10T12:00:00.000Z";

function emptyPatch() {
  return { add: [], update: [], removeIds: [] };
}

function makeTurn(
  sequence: number,
  playerAction: string,
  narration: string,
): CommittedAdventureTurn {
  return {
    id: `turn-${sequence}`,
    sequence,
    inputId: `input-${sequence}`,
    playerAction,
    narration,
    visiblePatch: {
      objectives: emptyPatch(),
      activeCharacters: emptyPatch(),
      knownFacts: emptyPatch(),
      relationships: emptyPatch(),
    },
    hiddenPatch: { secrets: emptyPatch(), gmThreads: emptyPatch() },
    revealedSecretIds: [],
    sourceRecordIds: [],
    provisionalFactIds: [],
    committedAt: now,
  };
}

function makeScenario(
  id: string,
  overrides: Partial<ScenarioItem> = {},
): ScenarioItem {
  const base = createScenarioState({
    id,
    origin: { kind: "manual", manualId: `manual-${id}` },
    playerVisible: {
      rumour: `Rumour about ${id}`,
      lead: `Lead for ${id}`,
      source: `Source ${id}`,
    },
    gmOnly: {
      truth: `GM-TRUTH-${id}: hidden truth`,
      ifInvestigated: `GM-INVESTIGATED-${id}: hidden clue`,
    },
  });
  return {
    ...base,
    knowledge: "heard",
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: {
      truth: `truth-${id}`,
      ifInvestigated: `inv-${id}`,
      eventIds: {},
    },
    ...overrides,
  };
}

function addSessionRecordIds(
  ids: Set<string>,
  session: AdventureSession,
): void {
  for (const place of session.places ?? []) {
    ids.add(place.id);
    if (place.sourceRecordId) ids.add(place.sourceRecordId);
  }
  for (const record of session.sourceRecords) ids.add(record.recordId);
}

function addScenarioAllowedIds(
  ids: Set<string>,
  session: AdventureSession,
): void {
  for (const item of session.scenarioCollection?.items ?? []) {
    ids.add(item.id);
    ids.add(item.secretBindings.truth);
    if (item.secretBindings.ifInvestigated) {
      ids.add(item.secretBindings.ifInvestigated);
    }
    for (const secretId of Object.values(item.secretBindings.eventIds)) {
      ids.add(secretId);
    }
    for (const event of item.events) ids.add(event.id);
  }
}

function addProgressAllowedIds(
  ids: Set<string>,
  progress: AdventureSession["packageProgress"],
): void {
  if (!progress) return;
  for (const record of progress.records ?? []) ids.add(record.id);
  for (const actor of progress.actors ?? []) ids.add(actor.actorId);
  for (const event of progress.events ?? []) {
    ids.add(event.id);
    ids.add(event.recordId);
  }
}

function addPackageEntityIds(ids: Set<string>, pkg?: AdventureJsonV1): void {
  if (!pkg) return;
  for (const entry of [
    ...pkg.scenes,
    ...pkg.encounters,
    ...pkg.clues,
    ...pkg.secrets,
    ...pkg.actors,
    ...pkg.locations,
    ...pkg.items,
    ...pkg.rumours,
  ]) {
    ids.add(entry.id);
  }
}

function collectAllowedIds(
  session: AdventureSession,
  pkg?: AdventureJsonV1,
): Set<string> {
  const ids = new Set<string>();
  addSessionRecordIds(ids, session);
  addScenarioAllowedIds(ids, session);
  addProgressAllowedIds(ids, session.packageProgress);
  addPackageEntityIds(ids, pkg);
  return ids;
}

describe("GMDirectorBrief (#5109)", () => {
  it("prioritizes bell-ringer pursuit in living-settlement without leaking cooper truth or touching situation", () => {
    const s = createLivingSettlementWorldEntrySession();
    const bell = s.scenarioCollection!.items.find(
      (item) => item.id === "scen-bell-ghost",
    )!;
    bell.knowledge = "heard";

    const brief = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Ask about the bell-ringer at Old Bell Tower",
    });

    expect(brief).toBeDefined();
    expect(brief!.advisory).toBe(true);
    expect(brief!.mode).toBe("active-pursuit");
    expect(brief!.pursuedScenarios).toHaveLength(1);
    expect(brief!.pursuedScenarios[0]!.scenarioId).toBe("scen-bell-ghost");
    expect(brief!.pursuedScenarios[0]!.provenance).toBe("player-action");
    expect(brief!.pursuedScenarios[0]!.confidence).toBe("high");
    expect(brief!.pursuedScenarios[0]!.gmTruthRef.secretId).toBe("truth-bell");
    expect(brief!.pursuedScenarios[0]!.gmTruthRef.truthRevealed).toBe(false);
    expect(brief!.otherOpenHeardScenarioIds).toEqual(["scen-missing-cooper"]);

    const serialized = JSON.stringify(brief);
    expect(serialized).not.toContain("CANARY-COOPER-LEDGER");
    expect(serialized).not.toContain("CANARY-SALT-SMUGGLERS");
    expect(serialized).not.toContain("scen-grain-shortage");
    expect(s.visibleState.situation).toBeUndefined();

    const prompt = buildAdventurePrompt({
      session: s,
      phase: "action",
      playerAction: "Ask about the bell-ringer at Old Bell Tower",
      anchors: [],
      relevant: [],
    });
    const state = JSON.parse(prompt.state);
    expect(state["GM-ONLY director brief"].pursuedScenarios[0].scenarioId).toBe(
      "scen-bell-ghost",
    );
    expect(JSON.stringify(playerScenarioCollectionProjection(s))).not.toContain(
      "director brief",
    );
    expect(JSON.stringify(projectVisibleState(s))).not.toContain(
      "CANARY-JACKDAW-NEST",
    );
  });

  it("handles subject and location switches cleanly without leaking unrelated or unheard GM truths", () => {
    const s = createLivingSettlementWorldEntrySession();
    const bell = s.scenarioCollection!.items.find(
      (item) => item.id === "scen-bell-ghost",
    )!;
    bell.knowledge = "heard";
    s.scenarioCollection!.focusedScenarioId = "scen-bell-ghost";

    // Subject switch to Cooper Tams immediately shifts primary focus away from bell-ghost.
    const cooperBrief = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Ask the ferryman about Cooper Tams",
    })!;
    expect(cooperBrief.mode).toBe("active-pursuit");
    expect(cooperBrief.pursuedScenarios.map((p) => p.scenarioId)).toEqual([
      "scen-missing-cooper",
    ]);
    expect(cooperBrief.otherOpenHeardScenarioIds).toEqual(["scen-bell-ghost"]);
    expect(JSON.stringify(cooperBrief)).not.toContain("CANARY-JACKDAW-NEST");
    expect(JSON.stringify(cooperBrief)).not.toContain("CANARY-SALT-SMUGGLERS");

    // Stale location-bound focus (bell-ghost is bound to Old Bell Tower while player is at Brackwater Quay)
    // is not forced on opening when player hasn't asked about it; and unheard grain-shortage never leaks.
    const openingAtQuay = buildGMDirectorBrief({
      session: s,
      phase: "opening",
    })!;
    expect(
      openingAtQuay.pursuedScenarios.some(
        (p) => p.scenarioId === "scen-bell-ghost",
      ),
    ).toBe(false);
    expect(JSON.stringify(openingAtQuay)).not.toContain("CANARY-JACKDAW-NEST");
    expect(JSON.stringify(openingAtQuay)).not.toContain(
      "CANARY-SALT-SMUGGLERS",
    );

    // Explicit disengagement or ordinary topic falls back to open-world with zero pursued scenarios.
    const ordinaryBrief = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction:
        "I decline to investigate further and buy a warm loaf of bread.",
    })!;
    expect(ordinaryBrief.mode).toBe("open-world");
    expect(ordinaryBrief.scenePosture).toBe("calm-conversation");
    expect(ordinaryBrief.pursuedScenarios).toEqual([]);
    expect(JSON.stringify(ordinaryBrief)).not.toContain("CANARY-JACKDAW-NEST");
    expect(JSON.stringify(ordinaryBrief)).not.toContain("CANARY-COOPER-LEDGER");
    expect(JSON.stringify(ordinaryBrief)).not.toContain(
      "CANARY-SALT-SMUGGLERS",
    );
  });

  it("distinguishes valid ordinary calm conversation from stalled investigation and dialogue loops", () => {
    const s = createLivingSettlementWorldEntrySession();

    const calmBrief = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction:
        "Ask Harbourmaster Venn what kind of tea his mother prefers.",
    })!;
    expect(calmBrief.mode).toBe("open-world");
    expect(calmBrief.scenePosture).toBe("calm-conversation");
    expect(calmBrief.pursuedScenarios).toEqual([]);

    // Repeated unanswered inquiry triggers dialogue-loop posture.
    const looped = baseSession();
    looped.turns = [
      makeTurn(
        1,
        "Who owns the debt in the harbour ledger?",
        "I don't know who owns that debt.",
      ),
      makeTurn(
        2,
        "So who do they owe the ledger debt to?",
        "I cannot say who lent the coin.",
      ),
      makeTurn(
        3,
        "Why does the ledger record debt without creditors?",
        "It doesn't name the creditors.",
      ),
    ];
    const loopBrief = buildGMDirectorBrief({
      session: looped,
      phase: "action",
      playerAction: "Who holds the creditor records for these debts?",
    })!;
    expect(loopBrief.scenePosture).toBe("dialogue-loop");
    expect(loopBrief.suggestedActionKinds).toEqual([
      "investigate",
      "travel",
      "walk-away",
    ]);

    // Stalled active investigation (SCENE_STALL_TURN_LIMIT quiet turns with active pursuit)
    // triggers stalled-investigation rather than calm-conversation.
    const stalledSession = createLivingSettlementWorldEntrySession();
    stalledSession.scenarioCollection!.focusedScenarioId =
      "scen-missing-cooper";
    stalledSession.turns = Array.from(
      { length: SCENE_STALL_TURN_LIMIT },
      (_, idx) =>
        makeTurn(
          idx + 1,
          `Check around the yard (${idx + 1})`,
          `The wind whistles past the planks (${idx + 1}).`,
        ),
    );
    const stalledBrief = buildGMDirectorBrief({
      session: stalledSession,
      phase: "action",
      playerAction: "Inspect the cooper's yard gate again",
    })!;
    expect(stalledBrief.scenePosture).toBe("stalled-investigation");
  });

  it("breaks deterministic ties with null focus and reuses existing IDs only", () => {
    const s = baseSession();
    const sA = makeScenario("scen-b", {
      stage: "hearsay",
      playerVisible: {
        rumour: "Bells ring in the mist.",
        lead: "North Gate",
      },
      events: [
        {
          id: "evt-b1",
          kind: "discovery",
          visibility: "player",
          text: "Heard at dusk",
          at: "2026-11-10T10:00:00.000Z",
          turnId: "turn-1",
        },
      ],
    });
    const sB = makeScenario("scen-a", {
      stage: "actionable-clue",
      playerVisible: {
        rumour: "Lanterns flicker on the moor.",
        lead: "Old Causeway",
      },
      events: [
        {
          id: "evt-a1",
          kind: "discovery",
          visibility: "player",
          text: "Found oil tracks",
          at: "2026-11-10T11:00:00.000Z",
          turnId: "turn-2",
        },
      ],
    });
    const sC = makeScenario("scen-c", {
      stage: "actionable-clue",
      playerVisible: {
        rumour: "Another clue on the causeway.",
        lead: "South Watch",
      },
      events: [
        {
          id: "evt-c1",
          kind: "discovery",
          visibility: "player",
          text: "Found muddy bootprints",
          at: "2026-11-10T11:00:00.000Z",
          turnId: "turn-2",
        },
      ],
    });
    s.turns = [
      makeTurn(1, "Explore north", "Mist gathers."),
      makeTurn(2, "Explore moor", "Tracks gleam."),
    ];
    s.scenarioCollection = {
      version: 1,
      items: [sA, sC, sB],
      focusedScenarioId: null,
    };

    const first = buildGMDirectorBrief({ session: s, phase: "opening" })!;
    const second = buildGMDirectorBrief({ session: s, phase: "opening" })!;
    expect(first).toEqual(second);
    // scen-a and scen-c are both actionable-clue + turn-2; lexical id breaks tie to scen-a first, scen-c second.
    expect(first.pursuedScenarios.map((p) => p.scenarioId)).toEqual([
      "scen-a",
      "scen-c",
    ]);
    expect(first.otherOpenHeardScenarioIds).toEqual(["scen-b"]);

    const allowedIds = collectAllowedIds(s);
    for (const p of first.pursuedScenarios) {
      expect(allowedIds.has(p.scenarioId)).toBe(true);
      expect(allowedIds.has(p.gmTruthRef.secretId)).toBe(true);
      for (const evt of p.established.latestConsequentialEvents) {
        expect(allowedIds.has(evt.id)).toBe(true);
      }
    }
  });

  it("caps 8 heard scenarios and fits within prompt budgets on worldEntry + scenarios and tight headroom", () => {
    const s = createLivingSettlementWorldEntrySession();
    const extraScenarios = Array.from({ length: 7 }, (_, i) =>
      makeScenario(`scen-extra-${i + 1}`, {
        anchorRefs: ["canon-place-brackwater"],
        playerVisible: {
          rumour: `Extra harbour rumour ${i + 1} `.repeat(6).trim(),
          lead: `Quay berth ${i + 1}`,
          source: `Sailor ${i + 1}`,
        },
        gmOnly: {
          truth: `Hidden truth ${i + 1}: `.repeat(8).trim(),
          ifInvestigated: `Hidden clue ${i + 1}: `.repeat(6).trim(),
        },
        events: Array.from({ length: 4 }, (_, eIdx) => ({
          id: `evt-${i + 1}-${eIdx + 1}`,
          kind: "discovery" as const,
          visibility: "player" as const,
          text: `Event ${eIdx + 1} text `.repeat(5).trim(),
          at: now,
        })),
      }),
    );
    s.scenarioCollection = {
      version: 1,
      items: [s.scenarioCollection!.items[0]!, ...extraScenarios],
      focusedScenarioId: "scen-extra-1",
    };

    const brief = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Ask about Quay berth 1",
    })!;
    expect(brief.pursuedScenarios.length).toBeLessThanOrEqual(2);
    expect(brief.otherOpenHeardScenarioIds.length).toBeLessThanOrEqual(6);
    expect(JSON.stringify(brief).length).toBeLessThanOrEqual(
      MAX_DIRECTOR_BRIEF_CHARS,
    );

    const prompt = buildAdventurePrompt({
      session: s,
      phase: "action",
      playerAction: "Ask about Quay berth 1",
      anchors: [],
      relevant: [],
    });
    expect(prompt.state.length).toBeLessThanOrEqual(MAX_SERIALIZED_STATE_CHARS);
    expect(prompt.serialized.length).toBeLessThanOrEqual(
      MAX_GENERATION_INPUT_CHARS,
    );
    expect(prompt.behavior.length).toBeLessThan(MAX_BEHAVIOR_PROMPT_CHARS);
    expect(
      prompt.behavior.endsWith("Return only the requested structured schema."),
    ).toBe(true);

    // Exhausted headroom cleanly omits the brief instead of throwing or overflowing.
    expect(
      buildGMDirectorBrief({
        session: s,
        phase: "action",
        playerAction: "Ask about Quay berth 1",
        maxChars: 0,
      }),
    ).toBeUndefined();
    expect(
      buildGMDirectorBrief({
        session: s,
        phase: "action",
        playerAction: "Ask about Quay berth 1",
        maxChars: 15,
      }),
    ).toBeUndefined();
    const tight = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Ask about Quay berth 1",
      maxChars: 350,
    });
    expect(tight).toBeUndefined();

    // When a minimal active-pursuit brief fits, primary scenario and 3 action kinds stay intact.
    const mediumTight = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Ask about Quay berth 1",
      maxChars: 800,
    })!;
    expect(mediumTight).toBeDefined();
    expect(JSON.stringify(mediumTight).length).toBeLessThanOrEqual(800);
    expect(mediumTight.mode).toBe("active-pursuit");
    expect(mediumTight.pursuedScenarios).toHaveLength(1);
    expect(mediumTight.suggestedActionKinds).toHaveLength(3);
  });

  it("keeps active pursuit when player is at Old Bell Tower and avoids incidental or substring false positives", () => {
    const s = createLivingSettlementWorldEntrySession();
    const bell = s.scenarioCollection!.items.find(
      (item) => item.id === "scen-bell-ghost",
    )!;
    const grain = s.scenarioCollection!.items.find(
      (item) => item.id === "scen-grain-shortage",
    )!;
    bell.knowledge = "heard";
    grain.knowledge = "heard";
    s.scenarioCollection!.focusedScenarioId = "scen-bell-ghost";
    s.places = [
      ...s.places!,
      {
        id: "place-old-bell",
        name: "Old Bell Tower",
        sourceRecordId: "canon-place-old-bell",
      },
    ];
    s.currentPlaceId = "place-old-bell";
    s.visibleState.location = {
      id: "loc-old-bell",
      text: "Old Bell Tower",
      source: "canonical",
      sourceRecordId: "canon-place-old-bell",
    };

    for (const action of [
      "Ask about the bell-ringer at Old Bell Tower",
      "Climb the Old Bell Tower",
    ]) {
      const brief = buildGMDirectorBrief({
        session: s,
        phase: "action",
        playerAction: action,
      })!;
      expect(brief.mode).toBe("active-pursuit");
      expect(brief.pursuedScenarios.map((p) => p.scenarioId)).toEqual([
        "scen-bell-ghost",
      ]);
      expect(brief.pursuedScenarios[0]!.provenance).toBe("player-action");
    }

    // Incidental 1-token overlap ("week") with scen-grain-shortage must not pull it into pursuedScenarios[1].
    const noIncidental = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction:
        "Ask the sexton about the cracked bell at Old Bell Tower this week",
    })!;
    expect(noIncidental.pursuedScenarios.map((p) => p.scenarioId)).toEqual([
      "scen-bell-ghost",
    ]);
    expect(noIncidental.otherOpenHeardScenarioIds).toContain(
      "scen-grain-shortage",
    );
    expect(JSON.stringify(noIncidental)).not.toContain("CANARY-SALT-SMUGGLERS");

    // Word-boundary check: short leads ("Well", "Inn", "Bar") must not match inside "farewell", "dinner", "barley".
    const shortLeadSession = baseSession();
    shortLeadSession.scenarioCollection = {
      version: 1,
      focusedScenarioId: null,
      items: [
        makeScenario("scen-well", {
          playerVisible: { rumour: "Water turned bitter.", lead: "Well" },
        }),
        makeScenario("scen-inn", {
          playerVisible: { rumour: "Cellar door is barred.", lead: "Inn" },
        }),
        makeScenario("scen-bar", {
          playerVisible: { rumour: "Trouble on the sandbar.", lead: "Bar" },
        }),
      ],
    };
    const mundaneBrief = buildGMDirectorBrief({
      session: shortLeadSession,
      phase: "action",
      playerAction: "Bid farewell and order dinner with barley",
    })!;
    expect(mundaneBrief.mode).toBe("open-world");
    expect(mundaneBrief.scenePosture).toBe("calm-conversation");
    expect(mundaneBrief.pursuedScenarios).toEqual([]);
  });

  it("drops to calm-conversation when disengaging or switching topic after a stalled dialogue loop", () => {
    const s = baseSession();
    s.turns = [
      makeTurn(
        1,
        "Who owns the debt in the harbour ledger?",
        "I don't know who owns that debt.",
      ),
      makeTurn(
        2,
        "So who do they owe the ledger debt to?",
        "I cannot say who lent the coin.",
      ),
      makeTurn(
        3,
        "Why does the ledger record debt without creditors?",
        "It doesn't name the creditors.",
      ),
      makeTurn(
        4,
        "Who lent the coin in the harbour ledger?",
        "I have no idea who holds the debt.",
      ),
    ];

    const disengaged = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Never mind, I walk down to the dock to watch the tide",
    })!;
    expect(disengaged.mode).toBe("open-world");
    expect(disengaged.scenePosture).toBe("calm-conversation");
  });

  it("produces mode package-scene with existing package IDs and distinguishes claimed vs confirmed", () => {
    const refPkg = AdventureJsonV1Schema.parse(
      JSON.parse(
        readFileSync(
          resolve(
            import.meta.dir,
            "../../../fixtures/adventures/reference-one-shot/adventure.v1.json",
          ),
          "utf8",
        ),
      ),
    );
    const s = baseSession();
    s.sourcePackage = {
      packageId: refPkg.id,
      version: refPkg.version,
      formatVersion: refPkg.formatVersion,
      hash: "a".repeat(64),
    };
    s.packageProgress = {
      version: 1,
      sceneId: "ros-scene-1-landing",
      records: [
        { id: "ros-scene-1-landing", kind: "scene", status: "active" },
        { id: "ros-scene-2-yard", kind: "scene", status: "available" },
      ],
      events: [
        {
          id: "turn-1:pkg:1",
          turnId: "turn-1",
          recordId: "ros-scene-1-landing",
          kind: "scene",
          from: "unvisited",
          to: "active",
          certainty: "confirmed",
          note: "Party landed at the jetty.",
        },
        {
          id: "turn-2:pkg:1",
          turnId: "turn-2",
          recordId: "ros-scene-2-yard",
          kind: "scene",
          from: "available",
          to: "active",
          certainty: "claimed",
          note: "Maren claims the yard gate is locked.",
        },
      ],
      actors: [
        {
          actorId: "actor-maren-holt",
          status: "present",
          disposition: "wary",
          facts: ["Asked the party to restart the mill."],
        },
      ],
      actorEvents: [],
    };
    const adventurePackage = retrieveAdventureJsonContext(refPkg, {
      sceneId: "ros-scene-1-landing",
    });

    const brief = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Talk to Maren on the jetty",
      adventurePackage,
    })!;

    expect(brief.mode).toBe("package-scene");
    expect(brief.packageContext).toBeDefined();
    expect(brief.packageContext!.sceneId).toBe("ros-scene-1-landing");
    expect(brief.packageContext!.latestEvents).toEqual([
      expect.objectContaining({
        id: "turn-1:pkg:1",
        certainty: "confirmed",
      }),
      expect.objectContaining({
        id: "turn-2:pkg:1",
        certainty: "claimed",
      }),
    ]);
    expect(
      brief.packageContext!.openUncertainties.some((u) =>
        u.includes("Claimed"),
      ),
    ).toBe(true);
    expect(brief.packageContext!.establishedActors[0]?.actorId).toBe(
      "actor-maren-holt",
    );

    const allowedIds = collectAllowedIds(s, refPkg);
    for (const id of brief.packageContext!.activeRecordIds) {
      expect(allowedIds.has(id)).toBe(true);
    }
    for (const actor of brief.packageContext!.establishedActors) {
      expect(allowedIds.has(actor.actorId)).toBe(true);
    }

    // Tight budget preserves mode package-scene + packageContext or returns undefined cleanly.
    expect(
      buildGMDirectorBrief({
        session: s,
        phase: "action",
        playerAction: "Talk to Maren on the jetty",
        adventurePackage,
        maxChars: 150,
      }),
    ).toBeUndefined();
    const tightPkg = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Talk to Maren on the jetty",
      adventurePackage,
      maxChars: 320,
    });
    if (tightPkg) {
      expect(tightPkg.mode).toBe("package-scene");
      expect(tightPkg.packageContext).toBeDefined();
      expect(tightPkg.suggestedActionKinds).toHaveLength(3);
    }
  });

  it("excludes resolved/skipped package records, respects turn-revealed secrets, and surfaces ambiguous/unresolved status", () => {
    const refPkg = AdventureJsonV1Schema.parse(
      JSON.parse(
        readFileSync(
          resolve(
            import.meta.dir,
            "../../../fixtures/adventures/reference-one-shot/adventure.v1.json",
          ),
          "utf8",
        ),
      ),
    );
    const s = baseSession();
    s.sourcePackage = {
      packageId: refPkg.id,
      version: refPkg.version,
      formatVersion: refPkg.formatVersion,
      hash: "a".repeat(64),
    };
    const revealedTurn = makeTurn(
      1,
      "Inspect the shrine",
      "You uncover the shrine truth.",
    );
    revealedTurn.revealedSecretIds = ["secret-shrine-bread"];
    s.turns = [revealedTurn];
    s.packageProgress = {
      version: 1,
      sceneId: "ros-scene-1-landing",
      records: [
        { id: "ros-scene-1-landing", kind: "scene", status: "active" },
        { id: "clue-resolved-manifest", kind: "clue", status: "resolved" },
        { id: "secret-after-dark", kind: "secret", status: "skipped" },
        { id: "secret-miller-hid", kind: "secret", status: "resolved" },
      ],
      events: [],
      actors: [],
      actorEvents: [],
    };
    const validated = parseAdventureSession(s);
    const basePkg = retrieveAdventureJsonContext(refPkg, {
      sceneId: "ros-scene-1-landing",
    });
    const customPkg = {
      ...basePkg,
      playerSafe: [
        ...basePkg.playerSafe,
        {
          id: "clue-resolved-manifest",
          kind: "clue" as const,
          visibility: "player-visible" as const,
          epistemicStatus: "explicit" as const,
          text: "Checked cargo manifest.",
        },
        {
          id: "clue-ambiguous-note",
          kind: "clue" as const,
          visibility: "player-visible" as const,
          epistemicStatus: "ambiguous" as const,
          text: "Unsigned note.",
        },
      ],
      gmOnly: [
        ...basePkg.gmOnly,
        {
          id: "encounter-unresolved-watch",
          kind: "encounter" as const,
          visibility: "gm-only" as const,
          epistemicStatus: "unresolved" as const,
          text: "Watch patrol timing.",
        },
      ],
    };

    const brief = buildGMDirectorBrief({
      session: validated,
      phase: "action",
      playerAction: "Review the harbour leads",
      adventurePackage: customPkg,
    })!;

    expect(brief.mode).toBe("package-scene");
    expect(brief.packageContext!.activeRecordIds).not.toContain(
      "clue-resolved-manifest",
    );
    expect(brief.packageContext!.activeRecordIds).not.toContain(
      "secret-after-dark",
    );
    expect(brief.packageContext!.activeRecordIds).not.toContain(
      "secret-miller-hid",
    );
    expect(brief.packageContext!.activeRecordIds).toContain(
      "ros-scene-1-landing",
    );
    expect(
      brief.packageContext!.openUncertainties.some((u) =>
        u.includes("secret-shrine-bread"),
      ),
    ).toBe(false);
    expect(
      brief.packageContext!.openUncertainties.some((u) =>
        u.includes("secret-miller-hid"),
      ),
    ).toBe(false);
    expect(
      brief.packageContext!.openUncertainties.some((u) =>
        u.includes("ambiguous clue (clue-ambiguous-note)"),
      ),
    ).toBe(true);
    expect(
      brief.packageContext!.openUncertainties.some((u) =>
        u.includes("unresolved encounter (encounter-unresolved-watch)"),
      ),
    ).toBe(true);
  });

  it("produces a valid open-world brief across opening, action, and roll-resolution for empty/resolved collections", () => {
    const emptySession = baseSession();
    expect(emptySession.scenarioCollection).toBeUndefined();

    const opening = buildGMDirectorBrief({
      session: emptySession,
      phase: "opening",
    })!;
    expect(opening.mode).toBe("open-world");
    expect(opening.scenePosture).toBe("opening");
    expect(opening.pursuedScenarios).toEqual([]);
    expect(opening.suggestedActionKinds.length).toBe(3);

    const resolvedSession = parseAdventureSession({
      ...baseSession(),
      scenarioCollection: {
        version: 1,
        items: [makeScenario("scen-done", { status: "resolved" })],
        focusedScenarioId: null,
      },
      pendingRoll: {
        id: "roll-1",
        inputId: "input-roll-1",
        playerAction: "Ask about the resolved case",
        uncertainty: "Can you read the faded tally?",
        stakes: "You might misread a number.",
        resolutionStatus: "ready-to-resolve",
        suppliedOutcome: { kind: "numeric", value: 10 },
        createdAt: now,
      },
    });

    const actionBrief = buildGMDirectorBrief({
      session: resolvedSession,
      phase: "action",
      playerAction: "Stroll through the market",
    })!;
    expect(actionBrief.mode).toBe("open-world");
    expect(actionBrief.scenePosture).toBe("calm-conversation");
    expect(actionBrief.pursuedScenarios).toEqual([]);

    // Roll-resolution picks up pendingRoll.playerAction when playerAction is omitted.
    const withOpen = parseAdventureSession({
      ...resolvedSession,
      scenarioCollection: {
        version: 1,
        items: [
          makeScenario("scen-tally", {
            playerVisible: {
              rumour: "The tally board was altered.",
              lead: "Tally House",
            },
          }),
        ],
        focusedScenarioId: null,
      },
      pendingRoll: {
        ...resolvedSession.pendingRoll!,
        playerAction: "Inspect the Tally House board",
      },
    });

    const rollPrompt = buildAdventurePrompt({
      session: withOpen,
      phase: "roll-resolution",
      anchors: [],
      relevant: [],
    });
    const rollBrief = JSON.parse(rollPrompt.state)["GM-ONLY director brief"];
    expect(rollBrief.mode).toBe("active-pursuit");
    expect(rollBrief.pursuedScenarios[0].scenarioId).toBe("scen-tally");
    expect(rollBrief.pursuedScenarios[0].provenance).toBe("player-action");
  });

  it("ignores ambient current-location tokens so mundane quay actions stay open-world and bell queries beat grain shortage", () => {
    const s = createLivingSettlementWorldEntrySession();
    for (const item of s.scenarioCollection!.items) {
      if (item.id === "scen-grain-shortage" || item.id === "scen-bell-ghost") {
        item.knowledge = "heard";
      }
    }
    const mundane = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "I sit on Brackwater Quay and watch the gulls.",
    })!;
    expect(mundane.mode).toBe("open-world");
    expect(mundane.pursuedScenarios).toEqual([]);

    const bellQuery = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Ask at Brackwater Quay about the phantom bell this week",
    })!;
    expect(bellQuery.mode).toBe("active-pursuit");
    expect(bellQuery.pursuedScenarios[0]!.scenarioId).toBe("scen-bell-ghost");
  });

  it("does not resurrect a stale location-bound scenario via recent-event after moving away", () => {
    const s = createLivingSettlementWorldEntrySession();
    const recentTurn = makeTurn(
      1,
      "Ask about the grain shortage",
      "The dockmaster grumbles.",
    );
    const items = s.scenarioCollection!.items.map((item) =>
      item.id === "scen-grain-shortage"
        ? {
            ...item,
            knowledge: "heard" as const,
            events: [
              {
                id: "ev-grain-recent",
                kind: "discovery" as const,
                turnId: recentTurn.id,
                at: now,
                visibility: "player" as const,
                text: "Dockmaster admitted the granary doors were locked.",
              },
            ],
          }
        : item,
    );
    const moved = parseAdventureSession({
      ...s,
      turns: [recentTurn],
      currentPlaceId: "place-distant-moor",
      places: [
        ...(s.places ?? []),
        { id: "place-distant-moor", name: "Distant Moor" },
      ],
      visibleState: {
        ...s.visibleState,
        location: {
          id: "loc-distant-moor",
          text: "Distant Moor",
          source: "provisional",
        },
      },
      scenarioCollection: {
        ...s.scenarioCollection!,
        focusedScenarioId: "scen-grain-shortage",
        items,
      },
    });

    const brief = buildGMDirectorBrief({
      session: moved,
      phase: "action",
      playerAction: "Investigate the area for clues",
    })!;
    expect(brief.pursuedScenarios.map((p) => p.scenarioId)).not.toContain(
      "scen-grain-shortage",
    );
    expect(brief.mode).toBe("open-world");
  });

  it("does not pull a strictly lower-ranked uncoupled scenario into pursuedScenarios and preserves shed #2 ID when otherIds is full", () => {
    const t1 = makeTurn(1, "Ask around", "You hear whispers.");
    const t2 = makeTurn(2, "Check again", "More whispers.");
    const older = makeScenario("scen-older", {
      stage: "hearsay",
      events: [
        {
          id: "ev-old",
          kind: "discovery",
          turnId: t1.id,
          at: "2026-11-10T11:00:00.000Z",
          visibility: "player",
          text: "First clue.",
        },
      ],
    });
    const newer = makeScenario("scen-newer", {
      stage: "actionable-clue",
      events: [
        {
          id: "ev-new",
          kind: "consequence",
          turnId: t2.id,
          at: "2026-11-10T12:00:00.000Z",
          visibility: "player",
          text: "Recent development.",
        },
      ],
    });
    const s = parseAdventureSession({
      ...baseSession(),
      turns: [t1, t2],
      scenarioCollection: {
        version: 1,
        focusedScenarioId: null,
        items: [older, newer],
      },
    });

    const single = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Investigate the area for clues",
    })!;
    expect(single.pursuedScenarios.map((p) => p.scenarioId)).toEqual([
      "scen-newer",
    ]);
    expect(single.otherOpenHeardScenarioIds).toContain("scen-older");

    // Genuine tie with 8 other scenarios: when tight budget sheds #2, #2 is kept at front of otherOpenHeardScenarioIds.
    const tiedA = makeScenario("scen-tie-a", {
      playerVisible: {
        rumour: "Lantern smoke over the cistern.",
        lead: "Cistern Gate",
      },
    });
    const tiedB = makeScenario("scen-tie-b", {
      playerVisible: {
        rumour: "Lantern wax near the cistern.",
        lead: "Cistern Wall",
      },
    });
    const extras = Array.from({ length: 6 }, (_, idx) =>
      makeScenario(`scen-extra-${idx}`),
    );
    const crowded = parseAdventureSession({
      ...baseSession(),
      scenarioCollection: {
        version: 1,
        focusedScenarioId: null,
        items: [tiedA, tiedB, ...extras],
      },
    });
    const fullBrief = buildGMDirectorBrief({
      session: crowded,
      phase: "action",
      playerAction: "Inspect the lantern by the cistern",
    })!;
    expect(fullBrief.pursuedScenarios.map((p) => p.scenarioId)).toEqual([
      "scen-tie-a",
      "scen-tie-b",
    ]);

    const shedBudget = JSON.stringify(fullBrief).length - 60;
    const shedBrief = buildGMDirectorBrief({
      session: crowded,
      phase: "action",
      playerAction: "Inspect the lantern by the cistern",
      maxChars: shedBudget,
    })!;
    expect(shedBrief.pursuedScenarios.map((p) => p.scenarioId)).toEqual([
      "scen-tie-a",
    ]);
    expect(shedBrief.otherOpenHeardScenarioIds[0]).toBe("scen-tie-b");
    expect(shedBrief.otherOpenHeardScenarioIds.length).toBeLessThanOrEqual(6);
  });

  it("yields calm-conversation on explicit disengagement even when stalled with visibleState.situation set", () => {
    const quietTurns = Array.from({ length: SCENE_STALL_TURN_LIMIT }, (_, i) =>
      makeTurn(i + 1, "Chat idly", "Nothing changes."),
    );
    const s = parseAdventureSession({
      ...baseSession(),
      turns: quietTurns,
      visibleState: {
        ...baseSession().visibleState,
        situation: {
          id: "sit-ledger",
          text: "Investigating the missing ledger",
          source: "provisional",
        },
      },
    });

    const brief = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Walk away and grab a drink instead",
    })!;
    expect(brief.mode).toBe("open-world");
    expect(brief.scenePosture).toBe("calm-conversation");
  });

  it("never matches playerAction tokens that appear only in gmOnly truth, ifInvestigated, or unrevealed GM events", () => {
    const secretOnly = makeScenario("scen-secret-only", {
      playerVisible: {
        rumour: "The mill wheel creaks at dawn.",
        lead: "Old Mill",
      },
      gmOnly: {
        truth: "Baron Vaelor smuggles obsidian relics beneath the weir.",
        ifInvestigated: "A wax seal stamped with a crimson wyvern lies inside.",
      },
      events: [
        {
          id: "ev-gm-hidden",
          kind: "consequence",
          at: now,
          visibility: "gm",
          text: "Smuggler courier Kestrel delivered contraband phosphor.",
        },
      ],
      secretBindings: {
        truth: "truth-scen-secret-only",
        ifInvestigated: "inv-scen-secret-only",
        eventIds: { "ev-gm-hidden": "sec-ev-gm-hidden" },
      },
    });
    const s = parseAdventureSession({
      ...baseSession(),
      scenarioCollection: {
        version: 1,
        focusedScenarioId: null,
        items: [secretOnly],
      },
    });

    for (const action of [
      "Ask about Baron Vaelor and obsidian relics",
      "Search for a crimson wyvern wax seal",
      "Track courier Kestrel and the phosphor",
    ]) {
      const brief = buildGMDirectorBrief({
        session: s,
        phase: "action",
        playerAction: action,
      })!;
      expect(brief.mode).toBe("open-world");
      expect(brief.pursuedScenarios).toEqual([]);
    }
  });

  it("omits GM-ONLY director brief cleanly when baseState approaches MAX_SERIALIZED_STATE_CHARS without throwing", () => {
    const filler = "X".repeat(558);
    const largeFacts = Array.from({ length: 50 }, (_, idx) => ({
      id: `fact-${idx}`,
      text: `Known fact ${idx}: ${filler}`,
      source: "canonical" as const,
    }));
    const s = parseAdventureSession({
      ...baseSession(),
      visibleState: {
        ...baseSession().visibleState,
        knownFacts: largeFacts,
      },
      scenarioCollection: {
        version: 1,
        focusedScenarioId: null,
        items: [makeScenario("scen-tight")],
      },
    });

    const prompt = buildAdventurePrompt({
      session: s,
      phase: "action",
      playerAction: "Ask about scen-tight",
      anchors: [],
      relevant: [],
    });
    expect(prompt.state.length).toBeLessThanOrEqual(MAX_SERIALIZED_STATE_CHARS);
    expect(prompt.state.length).toBeGreaterThan(
      MAX_SERIALIZED_STATE_CHARS - 600,
    );
    const parsedState = JSON.parse(prompt.state) as Record<string, unknown>;
    expect(parsedState["GM-ONLY director brief"]).toBeUndefined();
  });
});
