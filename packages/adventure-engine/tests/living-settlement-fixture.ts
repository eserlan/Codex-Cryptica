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

function emptyPatchGroup() {
  return { add: [], update: [], removeIds: [] };
}

const emptyVisible = {
  objectives: emptyPatchGroup(),
  activeCharacters: emptyPatchGroup(),
  knownFacts: emptyPatchGroup(),
  relationships: emptyPatchGroup(),
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
    if (i === 12) {
      const rollOutcome = completeRollTurn(session, i, at, prev);
      session = rollOutcome.session;
      evaluationTurns.push(rollOutcome.evaluationTurn);
      continue;
    }

    const { playerAction, proposal } = proposalForTurn(i, totalTurns);
    session = commitLongRunTurn(session, proposal, playerAction, i, at);
    const pressure = applyScenarioTimePressures(
      session,
      session.worldTime?.elapsedMinutes ?? 0,
      `turn-${i}`,
      at,
    );
    if (pressure.ok) pressureTriggerCount += pressure.events.length;
    session = linkTowerAtTurn(session, i, at);
    session = updateScenarioEvents(session, i, at);
    const summary = summarizeAndArchive(session, i, at);
    session = summary.session;
    summariesAttached += summary.attached;
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

function completeRollTurn(
  initial: AdventureSession,
  turn: number,
  at: string,
  previousSession: AdventureSession,
): { session: AdventureSession; evaluationTurn: EvaluationTurn } {
  const playerAction = "Inspect the slipway planks for footprints.";
  const request = applyRollRequest(
    initial,
    {
      kind: "roll-required",
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
    },
    {
      turnId: `roll-req-${turn}`,
      inputId: `input-roll-${turn}`,
      now: at,
      playerAction,
    },
  );
  if (!request.ok) throw new Error(`Roll request failed at ${turn}`);
  const recorded = recordPendingRollOutcome(
    request.value,
    `input-roll-${turn}`,
    {
      kind: "numeric",
      value: 9,
      label: "Clear tracks",
    },
    { turnId: `roll-rec-${turn}`, inputId: `input-roll-${turn}`, now: at },
  );
  if (!recorded.ok) throw new Error(`Record roll failed at ${turn}`);
  const proposal = completeLivingProposal({
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
  const resolved = resolveRecordedRoll(recorded.value, proposal, {
    turnId: `turn-${turn}`,
    inputId: `input-${turn}`,
    now: at,
  });
  if (!resolved.ok) throw new Error(`Resolve roll failed at ${turn}`);
  return {
    session: resolved.value,
    evaluationTurn: {
      narration: proposal.narration,
      playerCharacterName: "Mara",
      playerAction,
      proposal,
      previousSession,
      session: resolved.value,
    },
  };
}

function proposalForTurn(
  turn: number,
  totalTurns: number,
): {
  playerAction: string;
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>;
} {
  if (turn === 4)
    return {
      playerAction: "Ask the bakery apprentice about flour prices.",
      proposal: completeLivingProposal({
        narration:
          "The baker mutters that flour sacks at the quay bakery are half-weight this week.",
        revealScenarioIds: ["scen-grain-shortage"],
        timeAdvance: {
          minutes: 15,
          cause: "Speaking with the baker",
          developments: [],
        },
      }),
    };
  if (turn === 8)
    return {
      playerAction: "Travel unexpectedly to the Old Bell Tower up the hill.",
      proposal: completeLivingProposal({
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
      }),
    };
  if (turn === 16)
    return {
      playerAction: "Check the belfry rafters for birds or wind.",
      proposal: completeLivingProposal({
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
      }),
    };
  if (turn === 24)
    return {
      playerAction: "Return to Brackwater Quay and inspect the weighhouse.",
      proposal: completeLivingProposal({
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
      }),
    };
  if (turn === 32)
    return {
      playerAction:
        "Ask Harbourmaster Venn what kind of tea his mother prefers.",
      proposal: completeLivingProposal({
        narration:
          "Venn blinks, taken aback, and admits he only drinks roasted barley water on shift.",
        timeAdvance: {
          minutes: 10,
          cause: "Unexpected small talk",
          developments: [],
        },
      }),
    };
  if (turn === 40)
    return {
      playerAction:
        "I decline to investigate further and buy a warm loaf of bread.",
      proposal: completeLivingProposal({
        narration:
          "You pay two coppers for a warm loaf and watch the afternoon boats unload.",
        timeAdvance: { minutes: 15, cause: "Buying bread", developments: [] },
      }),
    };
  if (turn === totalTurns)
    return {
      playerAction: "Head home for supper and end the adventure quietly.",
      proposal: completeLivingProposal({
        narration:
          "You walk home up the cobbled lane as supper smoke rises from the chimneys.",
        timeAdvance: { minutes: 20, cause: "Walking home", developments: [] },
      }),
    };
  return {
    playerAction: `Ask locals around the quay (${turn}).`,
    proposal: completeLivingProposal({
      narration: `Turn ${turn}: Harbourmaster Venn checks a manifest while gulls circle.`,
      timeAdvance: {
        minutes: 15,
        cause: "Routine harbour conversation",
        developments: [
          {
            threadId: "thread-quay-tide",
            text: `Tide mark shifts at step ${turn}.`,
          },
        ],
      },
    }),
  };
}

function commitLongRunTurn(
  session: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  playerAction: string,
  turn: number,
  at: string,
): AdventureSession {
  const committed = applyCompletedTurn(session, proposal, {
    turnId: `turn-${turn}`,
    inputId: `input-${turn}`,
    now: at,
    playerAction,
  });
  if (!committed.ok) {
    throw new Error(
      `Turn ${turn} failed: ${committed.errors.map((error) => error.message).join(", ")}`,
    );
  }
  return committed.value;
}

function linkTowerAtTurn(
  session: AdventureSession,
  turn: number,
  at: string,
): AdventureSession {
  if (turn !== 8) return session;
  const linked = linkAdventurePlaceRecord(
    session,
    "Old Bell Tower",
    "canon-place-old-bell",
    session.revision,
    at,
  );
  return linked.ok ? linked.session : session;
}

function updateScenarioEvents(
  session: AdventureSession,
  turn: number,
  at: string,
): AdventureSession {
  if (turn === 18) return resolveBellScenario(session, at);
  if (turn === 26) return closeWeighhouseAndPropagate(session, at);
  if (turn === 42) return abandonCooperScenario(session, at);
  return session;
}

function resolveBellScenario(
  session: AdventureSession,
  at: string,
): AdventureSession {
  const result = setScenarioStatus(
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
  if (!result.ok)
    throw new Error(`Failed to resolve scen-bell-ghost: ${result.reason}`);
  return result.session;
}

function closeWeighhouseAndPropagate(
  session: AdventureSession,
  at: string,
): AdventureSession {
  const focused = setScenarioFocus(
    session,
    "scen-grain-shortage",
    session.revision,
    at,
  );
  if (!focused.ok) throw new Error("Failed to focus scen-grain-shortage");
  const consequence = appendScenarioEvent(
    focused.session,
    "scen-grain-shortage",
    {
      id: "evt-weighhouse-closure",
      kind: "consequence",
      visibility: "player",
      text: "Venn closes the weighhouse early after the shim is spotted.",
      at,
    },
    focused.session.revision,
    at,
  );
  if (!consequence.ok) throw new Error("Failed to commit consequence event");
  const propagated = propagateKnownConsequence(
    consequence.session,
    {
      sourceScenarioId: "scen-grain-shortage",
      sourceEventId: "evt-weighhouse-closure",
      targetScenarioId: "scen-missing-cooper",
      anchorRef: "canon-actor-harbourmaster",
      eventId: "evt-cooper-prop",
      text: "With the weighhouse closed early, Venn's clerks linger near Cooper's Yard.",
      at,
    },
    consequence.session.revision,
  );
  if (!propagated.ok) throw new Error("Failed to propagate consequence");
  return propagated.session;
}

function abandonCooperScenario(
  session: AdventureSession,
  at: string,
): AdventureSession {
  const result = setScenarioStatus(
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
  if (!result.ok)
    throw new Error(`Failed to abandon scen-missing-cooper: ${result.reason}`);
  return result.session;
}

function summarizeAndArchive(
  session: AdventureSession,
  turn: number,
  at: string,
): { session: AdventureSession; attached: number } {
  let current = session;
  let attached = 0;
  const request = buildStorySummaryRequest(current);
  if (request) {
    const result = attachStorySummary(
      current,
      {
        text: `Turns up to ${request.throughSequence}: Mara visited the quay and bell tower.`,
        throughSequence: request.throughSequence,
      },
      at,
    );
    if (!result.ok) throw new Error("Failed to attach story summary");
    current = result.value;
    attached = 1;
  }
  if (turn === 30) current = archiveAndResume(current);
  return { session: current, attached };
}

function archiveAndResume(session: AdventureSession): AdventureSession {
  const archived = parseAdventureSession({
    ...JSON.parse(JSON.stringify(session)),
    status: "archived",
  });
  return parseAdventureSession({
    ...JSON.parse(JSON.stringify(archived)),
    status: "active",
  });
}
