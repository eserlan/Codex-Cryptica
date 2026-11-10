import { describe, expect, it } from "vitest";
import {
  addScenario,
  appendScenarioEvent,
  applyCompletedTurn,
  buildAdventurePrompt,
  createPlayerTranscript,
  createScenarioState,
  parseAdventureSession,
  playerScenarioCollectionProjection,
  propagateKnownConsequence,
  setScenarioStatus,
  type AdventureTurnProposal,
  type ScenarioItem,
} from "../src";

const now = "2026-11-02T10:00:00.000Z";

function rawSession() {
  return {
    schemaVersion: 2,
    id: "adventure-1",
    vaultId: "vault-1",
    title: "Lira in Northbrook",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 0,
    playerCharacter: {
      kind: "canonical",
      recordId: "pc-1",
      name: "Lira",
    },
    premise: "Start in Northbrook and let the player explore freely.",
    sourceRecords: [],
    worldEntry: {
      version: 1,
      location: {
        kind: "canonical",
        recordId: "place-1",
        name: "Northbrook",
      },
      at: { year: 618, precision: "year", calendarRevision: 1 },
      intent: "explore",
    },
    visibleState: {
      location: {
        id: "location-state-1",
        text: "Northbrook",
        source: "canonical",
        sourceRecordId: "place-1",
      },
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: { secrets: [], gmThreads: [] },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
  };
}

describe("world entry session and GM contract", () => {
  it("parses the optional world-entry context and keeps chosen date precision", () => {
    const session = parseAdventureSession(rawSession());
    expect(session.worldEntry?.location).toEqual({
      kind: "canonical",
      recordId: "place-1",
      name: "Northbrook",
    });
    expect(session.worldEntry?.at).toEqual({
      year: 618,
      precision: "year",
      calendarRevision: 1,
    });
    expect(session.visibleState.location?.sourceRecordId).toBe("place-1");
  });

  it("leaves ordinary and older sessions compatible without a world entry", () => {
    const { worldEntry: _worldEntry, ...oldSession } = rawSession();
    expect(parseAdventureSession(oldSession).worldEntry).toBeUndefined();
  });

  it("rejects invalid or unbounded world-entry dates", () => {
    expect(() =>
      parseAdventureSession({
        ...rawSession(),
        worldEntry: {
          ...rawSession().worldEntry,
          at: { year: Number.NaN },
        },
      }),
    ).toThrow();
  });

  it("instructs Oracle to allow quiet exploration and respect chronological context", () => {
    const session = parseAdventureSession(rawSession());
    const prompt = buildAdventurePrompt({
      session,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    expect(prompt.behavior).toContain("not a pre-written quest");
    expect(prompt.behavior).toContain("undated/uncertain sources");
    expect(prompt.behavior).toContain("Begin with open exploration");
    expect(prompt.behavior).toContain(
      "The opening may weave in one small background sign",
    );
    expect(JSON.parse(prompt.state).worldEntry.at.year).toBe(618);
  });

  it("accepts custom-calendar dates beyond Gregorian month and day bounds", () => {
    const raw = rawSession();
    raw.worldEntry.at = {
      year: 618,
      // @ts-expect-error -- widening the fixture's literal date shape
      month: 13,
      day: 400,
      precision: "day",
    };
    const session = parseAdventureSession(raw);
    expect(session.worldEntry?.at).toMatchObject({ month: 13, day: 400 });
  });

  it("still rejects non-positive and fractional date parts", () => {
    for (const at of [
      { year: 618, month: 0 },
      { year: 618, day: -1 },
      { year: 618, day: 1.5 },
    ]) {
      const raw = rawSession();
      // @ts-expect-error -- deliberately malformed date
      raw.worldEntry.at = at;
      expect(() => parseAdventureSession(raw)).toThrow();
    }
  });

  // fallow-ignore-next-line complexity
  it("completes full free-exploration loop: mundane chat, rumour discovery, resolution, travel and revisit with memory", () => {
    let session = parseAdventureSession(rawSession());
    const grainTruth = "The storehouse roof leaked and ruined the flour.";

    // Seed an unheard location rumour in Northbrook
    const backgroundSeed: ScenarioItem = {
      ...createScenarioState({
        id: "rumour-grain",
        origin: {
          kind: "rumour",
          batchTitle: "Rumours in Northbrook",
          batchId: "batch-nb",
          index: 1,
          sourceRecordId: "place-1",
        },
        playerVisible: {
          rumour: "Grain sacks have gone missing from the storehouse.",
          lead: "Old Storehouse",
          source: "Market vendor",
        },
        gmOnly: {
          truth: grainTruth,
          ifInvestigated: "Damp sacks hidden in the cellar.",
        },
      }),
      knowledge: "unheard",
      stage: "hearsay",
      anchorRefs: ["place-1"],
      revealedSecretIds: [],
      secretBindings: {
        truth: "secret-grain-truth",
        ifInvestigated: "secret-grain-inv",
        eventIds: {},
      },
    };

    const added = addScenario(session, backgroundSeed, session.revision, now);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    session = added.session;

    const emptyVisible = {
      objectives: { add: [], update: [], removeIds: [] },
      activeCharacters: { add: [], update: [], removeIds: [] },
      knownFacts: { add: [], update: [], removeIds: [] },
      relationships: { add: [], update: [], removeIds: [] },
    };
    const emptyHidden = {
      secrets: { add: [], update: [], removeIds: [] },
      gmThreads: { add: [], update: [], removeIds: [] },
    };

    // --- Turn 1: Mundane conversation (no scenario triggered or forced) ---
    const turn1Proposal: AdventureTurnProposal = {
      kind: "complete",
      narration:
        "The village blacksmith nods as you inquire about travel gear.",
      visiblePatch: emptyVisible,
      hiddenPatch: emptyHidden,
      revealSecretIds: [],
      provisionalFacts: [],
      sourceRecordIds: [],
      suggestedActions: [
        "Ask about the mountain pass",
        "Inspect the smithy wares",
        "Walk towards the village square",
      ],
    };
    const t1 = applyCompletedTurn(session, turn1Proposal, {
      turnId: "turn-1",
      inputId: "input-1",
      playerAction: "Talk to the blacksmith about gear.",
      now,
    });
    expect(t1.ok).toBe(true);
    if (!t1.ok) return;
    session = t1.value;

    expect(session.turns).toHaveLength(1);
    expect(session.scenarioCollection?.items[0]?.knowledge).toBe("unheard");
    expect(session.scenarioCollection?.focusedScenarioId).toBeNull();

    // --- Turn 2: Player asks about local news, surfacing the rumour lead ---
    const turn2Proposal: AdventureTurnProposal = {
      kind: "complete",
      narration:
        "The vendor leans in and whispers that grain sacks have gone missing from the storehouse.",
      visiblePatch: emptyVisible,
      hiddenPatch: emptyHidden,
      revealScenarioIds: ["rumour-grain"],
      revealSecretIds: [],
      provisionalFacts: [],
      sourceRecordIds: [],
      suggestedActions: [
        "Ask who had the keys",
        "Head over to the old storehouse",
        "Ignore the talk and buy provisions",
      ],
    };
    const t2 = applyCompletedTurn(session, turn2Proposal, {
      turnId: "turn-2",
      inputId: "input-2",
      playerAction: "Ask around for local news.",
      now,
    });
    expect(t2.ok).toBe(true);
    if (!t2.ok) return;
    session = t2.value;

    expect(session.scenarioCollection?.items[0]?.knowledge).toBe("heard");
    expect(session.scenarioCollection?.items[0]?.events).toHaveLength(1);
    expect(session.scenarioCollection?.items[0]?.events[0]?.kind).toBe(
      "discovery",
    );

    // --- Turn 3: Investigate the lead & elaborate ---
    const turn3Proposal: AdventureTurnProposal = {
      kind: "complete",
      narration:
        "Inside the cellar, you find damp, water-damaged flour sacks pushed into the shadows.",
      visiblePatch: emptyVisible,
      hiddenPatch: emptyHidden,
      elaborateScenarios: [
        {
          scenarioId: "rumour-grain",
          stage: "actionable-clue",
          discovery: "Water damage on hidden sacks",
        },
      ],
      provisionalFacts: [
        {
          name: "Ruined Storehouse Grain",
          kind: "clue",
          summary: "Damp sacks hidden in the cellar",
          visibility: "player-visible",
          scenarioId: "rumour-grain",
        },
      ],
      revealSecretIds: [],
      sourceRecordIds: [],
      suggestedActions: [
        "Examine the ceiling leak",
        "Notify the village elder",
        "Leave the cellar quietly",
      ],
    };
    const t3 = applyCompletedTurn(session, turn3Proposal, {
      turnId: "turn-3",
      inputId: "input-3",
      playerAction: "Inspect the storehouse cellar.",
      now,
    });
    expect(t3.ok).toBe(true);
    if (!t3.ok) return;
    session = t3.value;

    expect(session.scenarioCollection?.items[0]?.stage).toBe("actionable-clue");
    expect(session.provisionalFacts).toHaveLength(1);
    expect(session.provisionalFacts[0]?.name).toBe("Ruined Storehouse Grain");

    // --- Turn 4: Conclude/Resolve the scenario and record consequence ---
    const resolved = setScenarioStatus(
      session,
      "rumour-grain",
      "resolved",
      session.revision,
      {
        id: "event-resolved",
        kind: "status-change",
        visibility: "player",
        text: "The village elder acknowledged the water leak.",
        at: now,
      },
      now,
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    session = resolved.session;

    const consequence = appendScenarioEvent(
      session,
      "rumour-grain",
      {
        id: "event-consequence-grain",
        kind: "consequence",
        visibility: "player",
        text: "Northbrook sent emergency riders to Southwatch for replacement flour.",
        at: now,
      },
      session.revision,
      now,
    );
    expect(consequence.ok).toBe(true);
    if (!consequence.ok) return;
    session = consequence.session;

    expect(session.scenarioCollection?.items[0]?.status).toBe("resolved");
    expect(session.scenarioCollection?.focusedScenarioId).toBeNull();

    // --- Turn 5: Everyday continuation after resolution ---
    const turn5Proposal: AdventureTurnProposal = {
      kind: "complete",
      narration:
        "The sun warms the courtyard as villagers return to their daily routines.",
      visiblePatch: emptyVisible,
      hiddenPatch: emptyHidden,
      revealSecretIds: [],
      provisionalFacts: [],
      sourceRecordIds: [],
      suggestedActions: [
        "Rest at the village inn",
        "Walk down to the river trail",
        "Prepare travel rations for Southwatch",
      ],
    };
    const t5 = applyCompletedTurn(session, turn5Proposal, {
      turnId: "turn-5",
      inputId: "input-5",
      playerAction: "Enjoy a peaceful afternoon in the square.",
      now,
    });
    expect(t5.ok).toBe(true);
    if (!t5.ok) return;
    session = t5.value;

    expect(session.status).toBe("active");
    expect(session.turns).toHaveLength(4);

    // Verify post-resolution prompt rules kick in
    const promptAfterResolve = buildAdventurePrompt({
      session,
      phase: "action",
      playerAction: "Look around",
      anchors: [],
      relevant: [],
    });
    expect(promptAfterResolve.behavior).toContain(
      "When all scenarios are resolved or abandoned, or when the player pursues everyday life, portray ongoing unscripted world activity",
    );

    // --- Turn 6: Travel to Southwatch ---
    const turn6Proposal: AdventureTurnProposal = {
      kind: "complete",
      narration:
        "Following the southern trade highway past amber wheat fields, you reach the gates of Southwatch.",
      visiblePatch: {
        ...emptyVisible,
        location: {
          text: "Southwatch",
          source: "canonical",
          sourceRecordId: "place-2",
        },
      },
      hiddenPatch: emptyHidden,
      timeAdvance: {
        minutes: 180,
        cause: "Three-hour trek on foot",
        developments: [],
      },
      revealSecretIds: [],
      provisionalFacts: [],
      sourceRecordIds: [],
      suggestedActions: [
        "Enter the Southwatch grain exchange",
        "Find lodging for the night",
        "Ask the guards about merchant arrivals",
      ],
    };
    const t6 = applyCompletedTurn(session, turn6Proposal, {
      turnId: "turn-6",
      inputId: "input-6",
      playerAction: "Walk south along the highway to Southwatch.",
      now,
    });
    expect(t6.ok).toBe(true);
    if (!t6.ok) return;
    session = t6.value;

    expect(session.visibleState.location?.text).toBe("Southwatch");
    expect(session.worldTime?.elapsedMinutes).toBe(180);

    // Seed and propagate consequence to Southwatch scenario
    const southwatchScenario: ScenarioItem = {
      ...createScenarioState({
        id: "rumour-southwatch-mill",
        origin: {
          kind: "rumour",
          batchTitle: "Rumours in Southwatch",
          batchId: "batch-sw",
          index: 1,
          sourceRecordId: "place-2",
        },
        playerVisible: {
          rumour: "Grain traders are working overtime.",
          lead: "Southwatch Mill",
        },
        gmOnly: { truth: "Southwatch grain reserves are stretched thin." },
      }),
      knowledge: "heard",
      stage: "hearsay",
      anchorRefs: ["place-1", "place-2"],
      revealedSecretIds: [],
      secretBindings: {
        truth: "secret-sw-truth",
        eventIds: {},
      },
    };
    const addedSw = addScenario(
      session,
      southwatchScenario,
      session.revision,
      now,
    );
    expect(addedSw.ok).toBe(true);
    if (!addedSw.ok) return;
    session = addedSw.session;

    const propagated = propagateKnownConsequence(
      session,
      {
        sourceScenarioId: "rumour-grain",
        sourceEventId: "event-consequence-grain",
        targetScenarioId: "rumour-southwatch-mill",
        anchorRef: "place-1",
        eventId: "event-propagated-grain",
        text: "Grain wagons are being prepared for Northbrook.",
        at: now,
      },
      session.revision,
    );
    expect(propagated.ok).toBe(true);
    if (!propagated.ok) return;
    session = propagated.session;

    // --- Turn 7: Return to Northbrook ---
    const turn7Proposal: AdventureTurnProposal = {
      kind: "complete",
      narration: "You journey back north, arriving at Northbrook by dusk.",
      visiblePatch: {
        ...emptyVisible,
        location: {
          text: "Northbrook",
          source: "canonical",
          sourceRecordId: "place-1",
        },
      },
      hiddenPatch: emptyHidden,
      timeAdvance: {
        minutes: 180,
        cause: "Return trek on foot",
        developments: [],
      },
      revealSecretIds: [],
      provisionalFacts: [],
      sourceRecordIds: [],
      suggestedActions: [
        "Check on the village storehouse",
        "Retire to the inn for supper",
        "Speak with the local steward",
      ],
    };
    const t7 = applyCompletedTurn(session, turn7Proposal, {
      turnId: "turn-7",
      inputId: "input-7",
      playerAction: "Return to Northbrook.",
      now,
    });
    expect(t7.ok).toBe(true);
    if (!t7.ok) return;
    session = t7.value;

    expect(session.visibleState.location?.text).toBe("Northbrook");
    expect(session.worldTime?.elapsedMinutes).toBe(360);
    expect(session.provisionalFacts).toHaveLength(1);
    expect(session.provisionalFacts[0]?.name).toBe("Ruined Storehouse Grain");

    // Verify player projection retains causedBy
    const projection = playerScenarioCollectionProjection(session);
    const swItem = projection.items.find(
      (item) => item?.id === "rumour-southwatch-mill",
    );
    expect(
      swItem?.events.some((e) => e.causedBy?.scenarioId === "rumour-grain"),
    ).toBe(true);

    // Verify zero secret leakage
    const transcript = JSON.stringify(createPlayerTranscript(session));
    expect(transcript).not.toContain(grainTruth);
    expect(transcript).not.toContain("stretched thin");

    // Verify prompt on revisit contains location revisit memory
    const promptOnRevisit = buildAdventurePrompt({
      session,
      phase: "action",
      playerAction: "Look around Northbrook",
      anchors: [],
      relevant: [],
    });
    expect(promptOnRevisit.behavior).toContain(
      "When the player returns to a previously visited location, reflect established facts, prior conversations, and committed scenario consequences",
    );
  });
});
