import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  worldEntryPacing,
  worldEntryDiscoveryMetrics,
  WORLD_ENTRY_QUIET_TURN_LIMIT,
  type AdventureSession,
  type CommittedAdventureTurn,
  type ScenarioItem,
} from "../src";
import { applyScenarioElaborations } from "../src/scenario-turns";

const emptyPatch = () => ({ add: [], update: [], removeIds: [] });

function turn(
  sequence: number,
  options: {
    activity?: "none" | "thread-update" | "thread-revealed" | "secret-reveal";
    turnId?: string;
  } = {},
): CommittedAdventureTurn {
  const id = options.turnId ?? `turn-${sequence}`;
  const activity = options.activity ?? "none";
  return {
    id,
    sequence,
    inputId: `input-${sequence}`,
    playerAction: "Look around",
    narration: "The market hums.",
    visiblePatch: {
      objectives: emptyPatch(),
      activeCharacters: emptyPatch(),
      knownFacts: emptyPatch(),
      relationships: emptyPatch(),
    },
    hiddenPatch: {
      secrets: emptyPatch(),
      gmThreads:
        activity === "thread-update"
          ? {
              add: [],
              update: [
                {
                  id: "thread-1",
                  text: "Seed 1. Stage: signs shown.",
                  status: "hidden",
                },
              ],
              removeIds: [],
            }
          : activity === "thread-revealed"
            ? {
                add: [],
                update: [
                  {
                    id: "thread-1",
                    text: "Seed 1. Stage: signs shown.",
                    status: "revealed",
                  },
                ],
                removeIds: [],
              }
            : emptyPatch(),
    },
    revealedSecretIds: activity === "secret-reveal" ? ["secret-1"] : [],
    sourceRecordIds: [],
    provisionalFactIds: [],
    committedAt: "2026-11-03T10:00:00.000Z",
  };
}

function scenarioItem(
  id: string,
  knowledge: "unheard" | "heard" = "unheard",
  locationName = "Northbrook",
  stage: "hearsay" | "actionable-clue" | "revelation-crisis" = "hearsay",
): ScenarioItem {
  return {
    version: 1,
    id,
    origin: {
      kind: "rumour",
      batchTitle: `Rumours in ${locationName}`,
      index: 1,
    },
    playerVisible: {
      rumour: `Rumour in ${locationName}`,
      lead: `Lead for ${id}`,
      source: `Source in ${locationName}`,
    },
    gmOnly: {
      truth: `Truth for ${id}`,
      ifInvestigated: `Investigation for ${id}`,
    },
    knowledge,
    stage,
    status: "open",
    events: [],
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: {
      truth: `truth-${id}`,
      eventIds: {},
    },
  };
}

function session(
  turns: CommittedAdventureTurn[],
  overrides: Partial<AdventureSession> = {},
): AdventureSession {
  return {
    id: "adventure-1",
    vaultId: "vault-1",
    title: "Lira in Northbrook",
    premise: "Explore Northbrook",
    sourceRecords: [],
    playerCharacter: { kind: "provisional", name: "Lira" },
    worldEntry: {
      version: 1,
      location: { kind: "provisional", name: "Northbrook" },
      intent: "explore",
    },
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [{ id: "secret-1", text: "Truth", status: "hidden" }],
      gmThreads: [
        {
          id: "thread-1",
          text: "World-entry seed 1. Stage: unnoticed.",
          status: "hidden",
        },
      ],
    },
    provisionalFacts: [],
    turns,
    pendingRoll: null,
    ...overrides,
  } as unknown as AdventureSession;
}

const quietTurns = (count: number, from = 1) =>
  Array.from({ length: count }, (_, i) => turn(from + i));

function promptFor(s: AdventureSession) {
  return buildAdventurePrompt({
    session: s,
    phase: "action",
    playerAction: "Buy bread",
    anchors: [],
    relevant: [],
  });
}

describe("world entry pacing", () => {
  it("asks for one background sign within 1-2 turns when an unheard seed exists", () => {
    const s = session(quietTurns(WORLD_ENTRY_QUIET_TURN_LIMIT), {
      scenarioCollection: {
        version: 1,
        items: [scenarioItem("rumour-1", "unheard", "Northbrook")],
        focusedScenarioId: null,
      },
    });
    const pacing = worldEntryPacing(s);
    expect(pacing).toEqual({
      quietTurns: WORLD_ENTRY_QUIET_TURN_LIMIT,
      signDue: true,
      eligibleScenarioIds: ["rumour-1"],
      activeLeadIds: [],
    });
    expect(promptFor(s).behavior).toContain("PACING:");
    expect(promptFor(s).behavior).toContain("rumour-1");
  });

  it("caps the quiet-turn count at the sign threshold", () => {
    const s = session(quietTurns(WORLD_ENTRY_QUIET_TURN_LIMIT + 50));
    expect(worldEntryPacing(s)).toEqual({
      quietTurns: WORLD_ENTRY_QUIET_TURN_LIMIT,
      signDue: true,
      eligibleScenarioIds: [],
      activeLeadIds: [],
    });
  });

  it("does not ask for a sign on turn 0 before the world has been still", () => {
    const s = session([]);
    expect(worldEntryPacing(s)?.signDue).toBe(false);
    expect(promptFor(s).behavior).not.toContain("PACING:");
  });

  it("does NOT restart the quiet count on GM-only hidden thread updates or GM events", () => {
    const s = session(
      [
        turn(1),
        turn(2, { activity: "thread-update" }), // GM-only hidden update
      ],
      {
        scenarioCollection: {
          version: 1,
          items: [
            {
              ...scenarioItem("rumour-1", "unheard", "Northbrook"),
              events: [
                {
                  id: "event-gm-1",
                  kind: "consequence",
                  visibility: "gm",
                  text: "Faction advance off-screen",
                  at: "2026-11-03T10:00:00.000Z",
                  turnId: "turn-2",
                },
              ],
            },
          ],
          focusedScenarioId: null,
        },
      },
    );
    const pacing = worldEntryPacing(s);
    expect(pacing?.signDue).toBe(true);
    expect(pacing?.quietTurns).toBe(WORLD_ENTRY_QUIET_TURN_LIMIT);
  });

  it("restarts the quiet count when a player-visible scenario event occurs", () => {
    const itemWithPlayerEvent = scenarioItem("rumour-1", "heard", "Northbrook");
    itemWithPlayerEvent.events.push({
      id: "event-disc",
      kind: "discovery",
      visibility: "player",
      text: "The lead was seen",
      at: "2026-11-03T10:00:00.000Z",
      turnId: "turn-2",
    });

    const s = session([turn(1), turn(2)], {
      scenarioCollection: {
        version: 1,
        items: [
          itemWithPlayerEvent,
          scenarioItem("rumour-2", "unheard", "Northbrook"),
        ],
        focusedScenarioId: null,
      },
    });
    // Turn 2 had a player-visible scenario discovery event -> quietTurns should be 0, signDue: false
    const pacing = worldEntryPacing(s);
    expect(pacing).toEqual({
      quietTurns: 0,
      signDue: false,
      eligibleScenarioIds: ["rumour-2"],
      activeLeadIds: ["rumour-1"],
    });
  });

  it("includes only heard leads relevant to the current location", () => {
    const generalLead = scenarioItem("general-lead", "heard");
    generalLead.origin = { kind: "manual" };
    const s = session(quietTurns(1), {
      scenarioCollection: {
        version: 1,
        items: [
          scenarioItem("local-lead", "heard", "Northbrook"),
          scenarioItem("faraway-lead", "heard", "Southwatch"),
          generalLead,
        ],
        focusedScenarioId: null,
      },
    });

    expect(worldEntryPacing(s)?.activeLeadIds).toEqual([
      "local-lead",
      "general-lead",
    ]);
  });

  it("restarts the quiet count when a player-visible provisional fact with scenarioId is introduced", () => {
    const s = session([turn(1), turn(2)], {
      provisionalFacts: [
        {
          id: "fact-1",
          name: "Weird symbol",
          kind: "clue",
          summary: "Carved into mill door",
          introducedOnTurnId: "turn-2",
          visibility: "player-visible",
          scenarioId: "rumour-1",
        },
      ],
      scenarioCollection: {
        version: 1,
        items: [scenarioItem("rumour-2", "unheard", "Northbrook")],
        focusedScenarioId: null,
      },
    });
    const pacing = worldEntryPacing(s);
    expect(pacing?.quietTurns).toBe(0);
    expect(pacing?.signDue).toBe(false);
  });

  it("restarts the quiet count on revealed secrets or legacy revealed threads", () => {
    // Secret reveal
    const sSecret = session([turn(1, { activity: "secret-reveal" })]);
    expect(worldEntryPacing(sSecret)?.quietTurns).toBe(0);

    // Legacy thread revealed
    const sLegacyRevealed = session([turn(1, { activity: "thread-revealed" })]);
    expect(worldEntryPacing(sLegacyRevealed)?.quietTurns).toBe(0);
  });

  it("returns undefined for a quiet settlement with no matching local unheard seed", () => {
    // Session in Northbrook, but the only unheard rumour is in Southwatch
    const s = session(quietTurns(3), {
      hiddenState: { secrets: [], gmThreads: [] },
      scenarioCollection: {
        version: 1,
        items: [scenarioItem("rumour-sw", "unheard", "Southwatch")],
        focusedScenarioId: null,
      },
    });
    expect(worldEntryPacing(s)).toBeUndefined();
    expect(promptFor(s).behavior).not.toContain("PACING:");

    // Travelling to Southwatch makes the unheard seed eligible
    const sInSouthwatch = {
      ...s,
      visibleState: {
        ...s.visibleState,
        location: {
          id: "loc-sw",
          text: "Southwatch",
          source: "provisional" as const,
        },
      },
    };
    const pacingSw = worldEntryPacing(sInSouthwatch);
    expect(pacingSw).toEqual({
      quietTurns: WORLD_ENTRY_QUIET_TURN_LIMIT,
      signDue: true,
      eligibleScenarioIds: ["rumour-sw"],
      activeLeadIds: [],
    });
  });

  it("stays out of ordinary adventures and sessions without hidden threads or seeds", () => {
    const turns = quietTurns(6);
    expect(
      worldEntryPacing(session(turns, { worldEntry: undefined })),
    ).toBeUndefined();
    const revealedOnly = session(turns, {
      hiddenState: {
        secrets: [],
        gmThreads: [{ id: "thread-1", text: "Seed", status: "revealed" }],
      },
      scenarioCollection: undefined,
    });
    expect(worldEntryPacing(revealedOnly)).toBeUndefined();
    expect(promptFor(revealedOnly).behavior).not.toContain("PACING:");
  });

  it("computes discovery metrics accurately across turns", () => {
    const rumour1 = scenarioItem("rumour-1", "heard", "Northbrook");
    rumour1.events.push({
      id: "ev-disc-1",
      kind: "discovery",
      visibility: "player",
      text: "Miller is missing",
      at: "2026-11-03T10:00:00.000Z",
      turnId: "turn-2",
    });
    rumour1.events.push({
      id: "ev-elab-1",
      kind: "discovery",
      visibility: "player",
      text: "Actionable clue: blood on the mill wheel",
      at: "2026-11-03T10:05:00.000Z",
      turnId: "turn-3",
    });
    rumour1.stage = "actionable-clue";

    const s = session([turn(1), turn(2), turn(3), turn(4)], {
      scenarioCollection: {
        version: 1,
        items: [rumour1],
        focusedScenarioId: null,
      },
    });

    const metrics = worldEntryDiscoveryMetrics(s);
    expect(metrics).toEqual({
      timeToFirstSign: 2,
      timeToFirstActionableLead: 3,
    });

    // An untouched peaceful session has null metrics
    const peaceful = session([turn(1), turn(2)]);
    expect(worldEntryDiscoveryMetrics(peaceful)).toEqual({
      timeToFirstSign: null,
      timeToFirstActionableLead: null,
    });
  });

  it("does not count unrelated secret reveals or non-World Entry sessions", () => {
    const rumour = scenarioItem("rumour-1");
    const unrelatedReveal = turn(1, { activity: "secret-reveal" });
    const s = session([unrelatedReveal], {
      scenarioCollection: {
        version: 1,
        items: [rumour],
        focusedScenarioId: null,
      },
    });

    expect(worldEntryDiscoveryMetrics(s)).toEqual({
      timeToFirstSign: null,
      timeToFirstActionableLead: null,
    });
    expect(
      worldEntryDiscoveryMetrics({
        ...s,
        turns: [
          {
            ...unrelatedReveal,
            revealedSecretIds: [rumour.secretBindings.truth],
          },
        ],
      }).timeToFirstSign,
    ).toBe(1);
    expect(worldEntryDiscoveryMetrics({ ...s, worldEntry: undefined })).toEqual(
      {
        timeToFirstSign: null,
        timeToFirstActionableLead: null,
      },
    );
  });

  it("counts an actionable stage reached without discovery text", () => {
    const rumour = scenarioItem("rumour-1", "heard");
    const s = session([turn(1), turn(2)], {
      scenarioCollection: {
        version: 1,
        items: [rumour],
        focusedScenarioId: null,
      },
    });

    expect(
      applyScenarioElaborations(
        s,
        [{ scenarioId: rumour.id, stage: "actionable-clue" }],
        [],
        s.turns[1]!,
        () => "stage-change-1",
      ),
    ).toBeNull();
    expect(rumour.events).toContainEqual({
      id: "stage-change-1",
      kind: "stage-change",
      visibility: "gm",
      text: "Scenario advanced to actionable-clue",
      at: s.turns[1]!.committedAt,
      turnId: s.turns[1]!.id,
    });
    expect(worldEntryDiscoveryMetrics(s).timeToFirstActionableLead).toBe(2);
  });

  it.each(["status-change", "consequence"] as const)(
    "does not treat a later %s event as an actionable lead",
    (kind) => {
      const rumour = scenarioItem("rumour-1", "heard");
      rumour.events.push(
        {
          id: "ev-disc-1",
          kind: "discovery",
          visibility: "player",
          text: "A rumour surfaced",
          at: "2026-11-03T10:00:00.000Z",
          turnId: "turn-2",
        },
        {
          id: "ev-follow-up",
          kind,
          visibility: "player",
          text: "A non-actionable scenario update",
          at: "2026-11-03T10:05:00.000Z",
          turnId: "turn-3",
        },
      );

      const s = session([turn(1), turn(2), turn(3)], {
        scenarioCollection: {
          version: 1,
          items: [rumour],
          focusedScenarioId: null,
        },
      });

      expect(worldEntryDiscoveryMetrics(s)).toEqual({
        timeToFirstSign: 2,
        timeToFirstActionableLead: null,
      });
    },
  );
});
