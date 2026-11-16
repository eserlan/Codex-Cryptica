import {
  addScenario,
  appendScenarioEvent,
  applyCompletedTurn,
  applyRollRequest,
  applyScenarioTimePressures,
  attachStorySummary,
  buildStorySummaryRequest,
  createScenarioState,
  linkAdventurePlaceRecord,
  parseAdventureSession,
  propagateKnownConsequence,
  recordPendingRollOutcome,
  resolveRecordedRoll,
  setScenarioFocus,
  setScenarioStatus,
  type AdventureSession,
  type AdventureTurnProposal,
  type EvaluationTurn,
  type ScenarioItem,
} from "../src";

export const LIVING_SETTLEMENT_NOW = "2026-11-10T09:00:00.000Z";

export const LIVING_SETTLEMENT_CANARIES = [
  "CANARY-COOPER-LEDGER",
  "CANARY-SALT-SMUGGLERS",
  "CANARY-JACKDAW-NEST",
  "CANARY-SUNKEN-VAULT",
];

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

export function completeLivingProposal(
  overrides: Partial<Extract<AdventureTurnProposal, { kind: "complete" }>> = {},
): Extract<AdventureTurnProposal, { kind: "complete" }> {
  return {
    kind: "complete",
    narration: "Gulls wheel above Brackwater Quay as carts rattle past.",
    visiblePatch: emptyVisible,
    hiddenPatch: emptyHidden,
    revealSecretIds: [],
    provisionalFacts: [],
    sourceRecordIds: [],
    ...overrides,
  };
}

export function livingSettlementScenarios(): ScenarioItem[] {
  const cooper = {
    ...createScenarioState({
      id: "scen-missing-cooper",
      origin: { kind: "manual", manualId: "living-cooper" },
      playerVisible: {
        rumour: "Cooper Tams has not opened his workshop for two mornings.",
        lead: "Cooper's Yard by Brackwater Quay",
        source: "Ferryman",
      },
      gmOnly: {
        truth:
          "CANARY-COOPER-LEDGER: Tams hid in his brother's boathouse after spotting forged harbour tallies; either Venn threatened him or a creditor locked him out.",
        ifInvestigated:
          "Fresh shavings and a chalk mark point toward the slipway.",
      },
      pressure: {
        actor: "Harbourmaster Venn",
        goal: "Seal the cooper's yard before the tally audit.",
        currentStance: "Cautious",
        trigger: "Four hours pass without anyone checking the yard.",
        progression: "Venn padlocks the yard gate and posts a notice.",
        expectedConsequence:
          "CANARY-COOPER-LEDGER-PRESSURE: Venn quietly padlocks Cooper's Yard.",
        triggerAfterMinutes: 240,
      },
    }),
    knowledge: "heard" as const,
    anchorRefs: ["canon-actor-harbourmaster", "canon-place-brackwater"],
    revealedSecretIds: [],
    secretBindings: {
      truth: "truth-cooper",
      ifInvestigated: "inv-cooper",
      eventIds: {},
    },
  };

  const grain = {
    ...createScenarioState({
      id: "scen-grain-shortage",
      origin: { kind: "manual", manualId: "living-grain" },
      playerVisible: {
        rumour: "Flour sacks at the quay bakery are half-weight this week.",
        lead: "Harbourmaster Venn's Weighhouse",
        source: "Baker",
      },
      gmOnly: {
        truth:
          "CANARY-SALT-SMUGGLERS: Venn diverted barley barrels to conceal missing customs weight.",
      },
    }),
    knowledge: "unheard" as const,
    anchorRefs: ["canon-actor-harbourmaster", "canon-place-brackwater"],
    revealedSecretIds: [],
    secretBindings: { truth: "truth-grain", eventIds: {} },
  };

  const bell = {
    ...createScenarioState({
      id: "scen-bell-ghost",
      origin: { kind: "manual", manualId: "living-bell" },
      playerVisible: {
        rumour:
          "A phantom tolls the cracked bell in the Old Bell Tower at noon.",
        lead: "Old Bell Tower",
        source: "Sexton",
      },
      gmOnly: {
        truth:
          "CANARY-JACKDAW-NEST: No ghost exists; nesting jackdaws tug the frayed bell cord when the sea wind rises.",
      },
    }),
    knowledge: "unheard" as const,
    anchorRefs: ["canon-place-old-bell"],
    revealedSecretIds: [],
    secretBindings: { truth: "truth-bell", eventIds: {} },
  };

  return [cooper, grain, bell];
}

function baseSession(
  overrides: Partial<AdventureSession> = {},
): AdventureSession {
  const session = parseAdventureSession({
    schemaVersion: 3,
    id: "living-settlement-1",
    vaultId: "vault-living",
    title: "Brackwater Quay",
    status: "active",
    createdAt: LIVING_SETTLEMENT_NOW,
    updatedAt: LIVING_SETTLEMENT_NOW,
    lastPlayedAt: LIVING_SETTLEMENT_NOW,
    revision: 0,
    playerCharacter: {
      kind: "canonical",
      recordId: "canon-pc-mara",
      name: "Mara",
    },
    premise: "Morning tide at Brackwater Quay.",
    sourceRecords: [
      {
        recordId: "canon-pc-mara",
        recordType: "character",
        displayName: "Mara",
        role: "player-character",
        availability: "available",
      },
      {
        recordId: "canon-place-brackwater",
        recordType: "location",
        displayName: "Brackwater Quay",
        role: "anchor",
        availability: "available",
      },
      {
        recordId: "canon-actor-harbourmaster",
        recordType: "character",
        displayName: "Harbourmaster Venn",
        role: "anchor",
        availability: "available",
      },
      {
        recordId: "canon-place-old-bell",
        recordType: "location",
        displayName: "Old Bell Tower",
        role: "anchor",
        availability: "available",
      },
      {
        recordId: "canon-hidden-vault-lore",
        recordType: "note",
        displayName: "Sunken Customs Vault",
        role: "turn-source",
        availability: "available",
      },
    ],
    places: [
      {
        id: "place-quay",
        name: "Brackwater Quay",
        sourceRecordId: "canon-place-brackwater",
      },
    ],
    currentPlaceId: "place-quay",
    people: [
      {
        id: "person-venn",
        name: "Harbourmaster Venn",
        aliases: ["Venn"],
        sourceRecordId: "canon-actor-harbourmaster",
        firstSeenTurnId: "turn-0",
      },
    ],
    worldTime: { version: 1, elapsedMinutes: 0, events: [] },
    visibleState: {
      location: {
        id: "loc-quay",
        text: "Brackwater Quay",
        source: "canonical",
        sourceRecordId: "canon-place-brackwater",
      },
      objectives: [],
      activeCharacters: [
        {
          id: "char-venn",
          text: "Harbourmaster Venn",
          source: "canonical",
          sourceRecordId: "canon-actor-harbourmaster",
        },
      ],
      knownFacts: [
        {
          id: "fact-quay",
          text: "Fishing smacks unload at Brackwater Quay before noon.",
          source: "canonical",
          sourceRecordId: "canon-place-brackwater",
        },
      ],
      relationships: [
        {
          id: "rel-venn",
          text: "Harbourmaster Venn watches newcomers coolly.",
          source: "canonical",
          sourceRecordId: "canon-actor-harbourmaster",
          subjectId: "canon-actor-harbourmaster",
          disposition: "guarded",
        },
      ],
    },
    hiddenState: {
      secrets: [
        {
          id: "sec-sunken-vault",
          text: "CANARY-SUNKEN-VAULT: Old customs chests sit behind the sea-gate.",
          status: "hidden",
        },
      ],
      gmThreads: [
        {
          id: "thread-quay-tide",
          text: "Afternoon tide changes mooring access.",
          status: "hidden",
        },
      ],
    },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
    ...overrides,
  });

  let current = session;
  for (const item of livingSettlementScenarios()) {
    const added = addScenario(
      current,
      item,
      current.revision,
      LIVING_SETTLEMENT_NOW,
    );
    if (!added.ok)
      throw new Error(`Failed to seed scenario ${item.id}: ${added.reason}`);
    current = added.session;
  }
  return current;
}

export function createLivingSettlementReadyMadeSession(): AdventureSession {
  return baseSession({ id: "living-ready-made" });
}

export function createLivingSettlementWorldEntrySession(): AdventureSession {
  return baseSession({
    id: "living-world-entry",
    worldEntry: {
      version: 1,
      location: {
        kind: "canonical",
        recordId: "canon-place-brackwater",
        name: "Brackwater Quay",
      },
      at: {
        year: 412,
        month: 11,
        day: 10,
        precision: "day",
        label: "10 Frostfall",
      },
      intent: "explore",
    },
  });
}

export interface LongRunOutcome {
  session: AdventureSession;
  evaluationTurns: EvaluationTurn[];
  summariesAttached: number;
  pressureTriggerCount: number;
}

function stepIso(step: number): string {
  const base = Date.parse(LIVING_SETTLEMENT_NOW);
  return new Date(base + step * 60_000).toISOString();
}

export function runLivingSettlementLongRun(
  initialSession: AdventureSession,
  totalTurns = 56,
): LongRunOutcome {
  let session = initialSession;
  const evaluationTurns: EvaluationTurn[] = [];
  let summariesAttached = 0;
  let pressureTriggerCount = 0;

  for (let i = 1; i <= totalTurns; i += 1) {
    const at = stepIso(i);
    const prev = session;

    // Exercise roll request + outcome + resolution on turn 12
    if (i === 12) {
      const rollReq = {
        kind: "roll-required" as const,
        setupNarration:
          "You check the loose planks along the slipway where the tide laps.",
        uncertainty:
          "Can you spot the fresh boot prints before the tide washes them?",
        stakes: "You might miss which boathouse Tams entered.",
        dice: {
          expression: "2d6",
          outcomeBands: [
            { id: "high", label: "Clear tracks", minimum: 7, maximum: 12 },
          ],
        },
        sourceRecordIds: ["canon-place-brackwater"],
      };
      const reqRes = applyRollRequest(session, rollReq, {
        turnId: `roll-req-${i}`,
        inputId: `input-roll-${i}`,
        now: at,
        playerAction: "Inspect the slipway planks for footprints.",
      });
      if (!reqRes.ok) throw new Error(`Roll request failed at ${i}`);
      session = reqRes.value;

      const recRes = recordPendingRollOutcome(
        session,
        `input-roll-${i}`,
        { kind: "numeric", value: 9, label: "Clear tracks" },
        { turnId: `roll-rec-${i}`, inputId: `input-roll-${i}`, now: at },
      );
      if (!recRes.ok) throw new Error(`Record roll failed at ${i}`);
      session = recRes.value;

      const resolveProposal = completeLivingProposal({
        narration:
          "Wet boot prints lead straight to the eastern boathouse beside the quay.",
        timeAdvance: {
          minutes: 15,
          cause: "Searching the slipway",
          developments: [
            {
              threadId: "thread-quay-tide",
              text: "The tide rises two inches along the pilings.",
            },
          ],
        },
      });
      const resolved = resolveRecordedRoll(session, resolveProposal, {
        turnId: `turn-${i}`,
        inputId: `input-${i}`,
        now: at,
      });
      if (!resolved.ok) throw new Error(`Resolve roll failed at ${i}`);
      session = resolved.value;
      evaluationTurns.push({
        narration: resolveProposal.narration,
        playerCharacterName: "Mara",
        playerAction: "Inspect the slipway planks for footprints.",
        proposal: resolveProposal,
        previousSession: prev,
        session,
      });
      continue;
    }

    let playerAction = `Ask locals around the quay (${i}).`;
    let proposal = completeLivingProposal({
      narration: `Turn ${i}: Harbourmaster Venn checks a manifest while gulls circle.`,
      timeAdvance: {
        minutes: 15,
        cause: "Routine harbour conversation",
        developments: [
          {
            threadId: "thread-quay-tide",
            text: `Tide mark shifts at step ${i}.`,
          },
        ],
      },
    });

    if (i === 4) {
      playerAction = "Ask the bakery apprentice about flour prices.";
      proposal = completeLivingProposal({
        narration:
          "The baker mutters that flour sacks at the quay bakery are half-weight this week.",
        revealScenarioIds: ["scen-grain-shortage"],
        timeAdvance: {
          minutes: 15,
          cause: "Speaking with the baker",
          developments: [],
        },
      });
    } else if (i === 8) {
      playerAction = "Travel unexpectedly to the Old Bell Tower up the hill.";
      proposal = completeLivingProposal({
        narration:
          "You climb the hill path to the Old Bell Tower, where the sexton mentions a phantom tolling at noon.",
        moveTo: {
          name: "Old Bell Tower",
          relation: "up the hill from Brackwater Quay",
        },
        visiblePatch: {
          ...emptyVisible,
          location: {
            text: "Old Bell Tower",
            source: "canonical",
            sourceRecordId: "canon-place-old-bell",
          },
        },
        revealScenarioIds: ["scen-bell-ghost"],
        timeAdvance: {
          minutes: 25,
          cause: "Walking up the hill",
          developments: [],
        },
      });
    } else if (i === 16) {
      playerAction = "Check the belfry rafters for birds or wind.";
      proposal = completeLivingProposal({
        narration:
          "Two jackdaws burst from the rafters, tugging the frayed bell cord as they take flight.",
        elaborateScenarios: [
          {
            scenarioId: "scen-bell-ghost",
            stage: "actionable-clue",
            discovery: "Jackdaws tug the frayed bell cord in the belfry.",
          },
        ],
        timeAdvance: {
          minutes: 20,
          cause: "Climbing the belfry",
          developments: [],
        },
      });
    } else if (i === 24) {
      playerAction = "Return to Brackwater Quay and inspect the weighhouse.";
      proposal = completeLivingProposal({
        narration:
          "Back at Brackwater Quay, the weighhouse scale is wedged with a brass shim.",
        moveTo: { placeId: "place-quay", name: "Brackwater Quay" },
        visiblePatch: {
          ...emptyVisible,
          location: {
            text: "Brackwater Quay",
            source: "canonical",
            sourceRecordId: "canon-place-brackwater",
          },
        },
        elaborateScenarios: [
          {
            scenarioId: "scen-grain-shortage",
            stage: "actionable-clue",
            discovery: "Weighhouse scale wedged with a brass shim.",
          },
        ],
        timeAdvance: {
          minutes: 30,
          cause: "Returning to the quay",
          developments: [],
        },
      });
    } else if (i === 32) {
      // Counterintuitive question
      playerAction =
        "Ask Harbourmaster Venn what kind of tea his mother prefers.";
      proposal = completeLivingProposal({
        narration:
          "Venn blinks, taken aback, and admits he only drinks roasted barley water on shift.",
        timeAdvance: {
          minutes: 10,
          cause: "Unexpected small talk",
          developments: [],
        },
      });
    } else if (i === 40) {
      // Decline / ordinary activity
      playerAction =
        "I decline to investigate further and buy a warm loaf of bread.";
      proposal = completeLivingProposal({
        narration:
          "You pay two coppers for a warm loaf and watch the afternoon boats unload.",
        timeAdvance: {
          minutes: 15,
          cause: "Buying bread",
          developments: [],
        },
      });
    } else if (i === totalTurns) {
      // Mundane ending
      playerAction = "Head home for supper and end the adventure quietly.";
      proposal = completeLivingProposal({
        narration:
          "You walk home up the cobbled lane as supper smoke rises from the chimneys.",
        timeAdvance: {
          minutes: 20,
          cause: "Walking home",
          developments: [],
        },
      });
    }

    const committed = applyCompletedTurn(session, proposal, {
      turnId: `turn-${i}`,
      inputId: `input-${i}`,
      now: at,
      playerAction,
    });
    if (!committed.ok) {
      throw new Error(
        `Turn ${i} failed: ${committed.errors.map((e) => e.message).join(", ")}`,
      );
    }
    session = committed.value;

    // Trigger deterministic scenario time pressures on elapsed minutes
    const pressure = applyScenarioTimePressures(
      session,
      session.worldTime?.elapsedMinutes ?? 0,
      `turn-${i}`,
      at,
    );
    if (pressure.ok) pressureTriggerCount += pressure.events.length;

    if (i === 8) {
      const linked = linkAdventurePlaceRecord(
        session,
        "Old Bell Tower",
        "canon-place-old-bell",
        session.revision,
        at,
      );
      if (linked.ok) session = linked.session;
    }

    // Resolve scen-bell-ghost at turn 18, commit consequence on scen-grain-shortage at turn 26 & propagate to scen-missing-cooper, abandon scen-missing-cooper at turn 42
    if (i === 18) {
      const resolvedBell = setScenarioStatus(
        session,
        "scen-bell-ghost",
        "resolved",
        session.revision,
        {
          id: "evt-bell-resolved",
          kind: "status-change",
          visibility: "player",
          text: "No ghost: jackdaws were pulling the cord.",
          at,
        },
        at,
      );
      if (!resolvedBell.ok)
        throw new Error(
          `Failed to resolve scen-bell-ghost: ${resolvedBell.reason}`,
        );
      session = resolvedBell.session;
    } else if (i === 26) {
      const focused = setScenarioFocus(
        session,
        "scen-grain-shortage",
        session.revision,
        at,
      );
      if (!focused.ok) throw new Error("Failed to focus scen-grain-shortage");
      session = focused.session;

      const ev = appendScenarioEvent(
        session,
        "scen-grain-shortage",
        {
          id: "evt-weighhouse-closure",
          kind: "consequence",
          visibility: "player",
          text: "Venn closes the weighhouse early after the shim is spotted.",
          at,
        },
        session.revision,
        at,
      );
      if (!ev.ok) throw new Error("Failed to commit consequence event");
      session = ev.session;

      const propagated = propagateKnownConsequence(
        session,
        {
          sourceScenarioId: "scen-grain-shortage",
          sourceEventId: "evt-weighhouse-closure",
          targetScenarioId: "scen-missing-cooper",
          anchorRef: "canon-actor-harbourmaster",
          eventId: "evt-cooper-prop",
          text: "With the weighhouse closed early, Venn's clerks linger near Cooper's Yard.",
          at,
        },
        session.revision,
      );
      if (!propagated.ok) throw new Error("Failed to propagate consequence");
      session = propagated.session;
    } else if (i === 42) {
      const abandoned = setScenarioStatus(
        session,
        "scen-missing-cooper",
        "abandoned",
        session.revision,
        {
          id: "evt-cooper-abandoned",
          kind: "status-change",
          visibility: "player",
          text: "Left the cooper's disappearance for the harbour watch.",
          at,
        },
        at,
      );
      if (!abandoned.ok)
        throw new Error(
          `Failed to abandon scen-missing-cooper: ${abandoned.reason}`,
        );
      session = abandoned.session;
    }

    // Rolling summarisation whenever triggered
    const summaryReq = buildStorySummaryRequest(session);
    if (summaryReq) {
      const attached = attachStorySummary(
        session,
        {
          text: `Turns up to ${summaryReq.throughSequence}: Mara visited the quay and bell tower.`,
          throughSequence: summaryReq.throughSequence,
        },
        at,
      );
      if (!attached.ok) throw new Error("Failed to attach story summary");
      session = attached.value;
      summariesAttached += 1;
    }

    // Reload roundtrip & archive/resume check at turn 30
    if (i === 30) {
      const archived = parseAdventureSession({
        ...JSON.parse(JSON.stringify(session)),
        status: "archived",
      });
      const resumed = parseAdventureSession({
        ...JSON.parse(JSON.stringify(archived)),
        status: "active",
      });
      session = resumed;
    }

    evaluationTurns.push({
      narration: proposal.narration,
      playerCharacterName: "Mara",
      playerAction,
      proposal,
      previousSession: prev,
      session,
    });
  }

  return {
    session,
    evaluationTurns,
    summariesAttached,
    pressureTriggerCount,
  };
}
