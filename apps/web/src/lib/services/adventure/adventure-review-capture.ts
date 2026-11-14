import type { AdventureSession } from "@codex/adventure-engine";
import {
  formatWorldElapsedMinutes,
  isQuietTurn,
  SCENE_STALL_TURN_LIMIT,
  scenarioEventTurnIds,
  sceneStallPacing,
  unsummarisedTurns,
  worldEntryDiscoveryMetrics,
} from "@codex/adventure-engine";

/**
 * On-demand, local-only GM review snapshot. Both formats include hidden state
 * deliberately; neither format is suitable for player-facing sharing.
 */
export function adventureReviewJson(session: AdventureSession): string {
  return JSON.stringify(session, null, 2);
}

function quote(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => "> " + line)
    .join("\n");
}

function addJsonSection(lines: string[], heading: string, data: unknown): void {
  lines.push(
    "## " + heading,
    "",
    "\x60\x60\x60json",
    JSON.stringify(data, null, 2),
    "\x60\x60\x60",
    "",
  );
}

/**
 * Readable counterpart to the full JSON. Includes every committed player turn
 * and the private scenario/clock/patch ledger needed to diagnose slow starts,
 * missing revelations, continuity and hidden-world progression.
 */
export function adventureReviewMarkdown(session: AdventureSession): string {
  const scenarios = session.scenarioCollection?.items ?? [];
  const lines = [
    "# Adventure play review: " + session.title,
    "",
    "> GM-only review copy. Contains hidden truths, unheard rumours and private",
    "> world state. Do not share with players.",
    "",
    "## Session",
    "",
    "- Session ID: " + session.id,
    "- Status: " + session.status,
    "- Revision: " + session.revision,
    "- Turns committed: " + session.turns.length,
    "- Scenarios: " + scenarios.length,
    "- Unheard scenarios: " +
      scenarios.filter((item) => item.knowledge === "unheard").length,
    "- Heard scenarios: " +
      scenarios.filter((item) => item.knowledge === "heard").length,
    "- Dismissed discoveries: " +
      (session.dismissedProvisionalFactIds?.length ?? 0),
    "- Elapsed fictional time: " +
      formatWorldElapsedMinutes(session.worldTime?.elapsedMinutes ?? 0),
    "- Last played: " + session.lastPlayedAt,
    "",
    "### Premise",
    "",
    quote(session.premise),
    "",
    "## Player transcript",
    "",
  ];

  if (session.turns.length === 0) {
    lines.push("No committed turns yet.", "");
  }
  for (const turn of session.turns) {
    lines.push(
      "### Turn " + (turn.sequence + 1) + " (" + turn.id + ")",
      "",
      "**Player action**",
      "",
      quote(turn.playerAction),
      "",
      "**Oracle narration**",
      "",
      quote(turn.narration),
      "",
    );
    if (turn.timeAdvance) {
      lines.push(
        "- Fictional time advanced: " +
          formatWorldElapsedMinutes(turn.timeAdvance.minutes) +
          " (" +
          turn.timeAdvance.cause +
          ")",
      );
    }
    if (turn.suggestedActions?.length) {
      lines.push("- Suggested actions: " + turn.suggestedActions.join(" | "));
    }
    lines.push("- Committed at: " + turn.committedAt, "");
  }

  addJsonSection(lines, "World entry and player character", {
    worldEntry: session.worldEntry,
    playerCharacter: session.playerCharacter,
  });
  addJsonSection(lines, "Current player-visible state", session.visibleState);
  addJsonSection(
    lines,
    "Scenario state (GM-only, including unheard seeds and truths)",
    session.scenarioCollection ?? null,
  );
  addJsonSection(lines, "Hidden state (GM-only)", session.hiddenState);
  addJsonSection(
    lines,
    "World time and private event ledger (GM-only)",
    session.worldTime ?? null,
  );
  addJsonSection(
    lines,
    "Provisional entities and facts",
    session.provisionalFacts,
  );
  addJsonSection(
    lines,
    "Dismissed discovery IDs",
    session.dismissedProvisionalFactIds ?? [],
  );
  addJsonSection(lines, "Source record references", session.sourceRecords);
  addJsonSection(
    lines,
    "Committed state-change ledger (GM-only)",
    session.turns.map((turn) => ({
      turnId: turn.id,
      sequence: turn.sequence,
      visiblePatch: turn.visiblePatch,
      hiddenPatch: turn.hiddenPatch,
      revealedSecretIds: turn.revealedSecretIds,
      sourceRecordIds: turn.sourceRecordIds,
      provisionalFactIds: turn.provisionalFactIds,
      rollOutcome: turn.rollOutcome,
      resolvedRoll: turn.resolvedRoll,
      timeAdvance: turn.timeAdvance,
    })),
  );
  addJsonSection(lines, "Pending roll", session.pendingRoll);
  return lines.join("\n").trimEnd() + "\n";
}

export const DEFAULT_DIAGNOSTIC_RECENT_TURNS = 20;

const DIAGNOSTIC_README = [
  "GM-only diagnostic snapshot of one solo adventure, written for an LLM to read.",
  "It contains hidden secrets and GM threads. Do not share with players.",
  "summary: quick orientation. quietTurns: trailing turns that changed nothing in the world (0 when under 4 turns or a roll is pending). timeToFirstSign: 1-based turn when the first scenario sign/discovery surfaced (null if none). timeToFirstActionableLead: 1-based turn when the first actionable lead was reached (null if none). integrityChecks: precomputed consistency findings (empty arrays mean clean).",
  "state: the current truth. storySoFar is the GM's rolling notes on turns older than the prompt window, written from player-visible text; summary.unsummarisedTurns counts older turns not yet folded in. places lists where the player has been; facts and characters carry a placeId, and ones with none apply everywhere. visibleState is what the player knows; hiddenState and scenarioCollection are GM-only.",
  "source 'provisional' means the Oracle invented it in play; it is not backed by a Vault record.",
  "turns: oldest first. Every turn, condensed or full, carries signals; a missing signal means false or 0: quiet (changed nothing in the world), locationChanged, and stateChanges (visible entries added, updated or removed). summary.longestQuietRun and summary.stalledScenes count quiet streaks, a stalled scene being every fourth quiet turn in a row. A turn's dropped list names the parts of the model's reply the engine left out because they could not apply (an unknown id, a step not allowed yet); the turn itself committed, and summary.droppedParts totals them. Turns marked detail 'condensed' keep only action, narration, time, dropped and signals; detail 'full' also keeps every state patch.",
  "timeAdvance is null when a turn did not move the fictional clock. Time is in minutes.",
].join(" ");

export interface AdventureDiagnosticOptions {
  /** Turns that keep their full patches. Older turns are condensed. */
  recentTurns?: number;
}

export interface DiagnosticStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface DiagnosticBaseline {
  sessionId: string;
  revision: number;
  turnCount: number;
  state: ReturnType<typeof diagnosticState>;
}

function integrityChecks(session: AdventureSession) {
  const turnIds = new Set(session.turns.map((turn) => turn.id));
  const factIds = new Set(session.provisionalFacts.map((fact) => fact.id));
  const secretIds = new Set(session.hiddenState.secrets.map((s) => s.id));
  return {
    nonContiguousTurnSequences: session.turns
      .filter((turn, index) => turn.sequence !== index)
      .map((turn) => turn.id),
    factsIntroducedOnMissingTurn: session.provisionalFacts
      .filter((fact) => !turnIds.has(fact.introducedOnTurnId))
      .map((fact) => fact.id),
    turnsReferencingMissingFacts: session.turns
      .filter((turn) =>
        (turn.provisionalFactIds ?? []).some((id) => !factIds.has(id)),
      )
      .map((turn) => turn.id),
    turnsRevealingUnknownSecrets: session.turns
      .filter((turn) =>
        (turn.revealedSecretIds ?? []).some((id) => !secretIds.has(id)),
      )
      .map((turn) => turn.id),
    secretsMarkedRevealedWithoutTurn: session.hiddenState.secrets
      .filter(
        (secret) =>
          secret.status === "revealed" &&
          (!secret.revealedOnTurnId || !turnIds.has(secret.revealedOnTurnId)),
      )
      .map((secret) => secret.id),
  };
}

type CommittedTurn = AdventureSession["turns"][number];

function changeCount(patch: {
  add: unknown[];
  update: unknown[];
  removeIds: unknown[];
}): number {
  return patch.add.length + patch.update.length + patch.removeIds.length;
}

/**
 * Per-turn signals worked out from each turn's own patches, so older turns
 * (which are condensed and lose their patches) can still be scored:
 * `quiet` is a turn that changed nothing in the world, `locationChanged` is a
 * rewritten location line, and `stateChanges` counts visible state entries
 * added, updated or removed.
 */
function turnSignals(turn: CommittedTurn, scenarioTurnIds: Set<string>) {
  const visible = turn.visiblePatch;
  const stateChanges =
    changeCount(visible.objectives) +
    changeCount(visible.activeCharacters) +
    changeCount(visible.knownFacts) +
    changeCount(visible.relationships);
  // Defaults are left out to keep long sessions compact; see the readme.
  return {
    ...(isQuietTurn(turn, scenarioTurnIds) ? { quiet: true } : {}),
    ...(visible.location !== undefined ? { locationChanged: true } : {}),
    ...(stateChanges > 0 ? { stateChanges } : {}),
  };
}

function diagnosticTurns(session: AdventureSession, cutoff: number) {
  const scenarioTurnIds = scenarioEventTurnIds(session);
  return session.turns.map((turn, index) => {
    const signals = turnSignals(turn, scenarioTurnIds);
    if (index >= cutoff) {
      return {
        detail: "full",
        ...turn,
        timeAdvance: turn.timeAdvance ?? null,
        signals,
      };
    }
    return {
      detail: "condensed",
      id: turn.id,
      sequence: turn.sequence,
      playerAction: turn.playerAction,
      narration: turn.narration,
      timeAdvance: turn.timeAdvance ?? null,
      committedAt: turn.committedAt,
      ...(turn.dropped ? { dropped: turn.dropped } : {}),
      signals,
    };
  });
}

/** Longest run of consecutive quiet turns, and how many runs reached the stall limit. */
function quietRuns(session: AdventureSession) {
  const scenarioTurnIds = scenarioEventTurnIds(session);
  let run = 0;
  let longest = 0;
  let stalls = 0;
  for (const turn of session.turns) {
    run = isQuietTurn(turn, scenarioTurnIds) ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (run > 0 && run % SCENE_STALL_TURN_LIMIT === 0) stalls += 1;
  }
  return { longestQuietRun: longest, stalledScenes: stalls };
}

function secretCounts(session: AdventureSession) {
  return {
    hiddenSecrets: session.hiddenState.secrets.filter(
      (secret) => secret.status === "hidden",
    ).length,
    revealedSecrets: session.hiddenState.secrets.filter(
      (secret) => secret.status === "revealed",
    ).length,
  };
}

function scenarioCounts(scenarios: AdventureSession["scenarioCollection"]) {
  const items = scenarios?.items ?? [];
  return {
    openScenarios: items.filter((item) => item.status === "open").length,
    unheardScenarios: items.filter((item) => item.knowledge === "unheard")
      .length,
  };
}

function diagnosticPlaceSummary(session: AdventureSession) {
  return {
    currentLocation: session.visibleState.location?.text ?? null,
    currentPlace:
      session.places?.find((place) => place.id === session.currentPlaceId)
        ?.name ?? null,
    currentSituation: session.visibleState.situation?.text ?? null,
  };
}

function diagnosticTurnSummary(
  session: AdventureSession,
  cutoff: number,
  lastTurn: AdventureSession["turns"][number] | undefined,
) {
  return {
    turnsTotal: session.turns.length,
    turnsFull: session.turns.length - cutoff,
    turnsCondensed: cutoff,
    pendingRoll: session.pendingRoll != null,
    quietTurns: sceneStallPacing(session)?.quietTurns ?? 0,
    ...quietRuns(session),
    droppedParts: session.turns.reduce(
      (total, turn) => total + (turn.dropped?.length ?? 0),
      0,
    ),
    lastPlayerAction: lastTurn?.playerAction ?? null,
  };
}

function diagnosticSummary(
  session: AdventureSession,
  cutoff: number,
  lastTurn: AdventureSession["turns"][number] | undefined,
) {
  const discoveryMetrics = worldEntryDiscoveryMetrics(session);
  return {
    sessionId: session.id,
    title: session.title,
    schemaVersion: session.schemaVersion,
    revision: session.revision,
    status: session.status,
    elapsedMinutes: session.worldTime?.elapsedMinutes ?? 0,
    ...diagnosticPlaceSummary(session),
    unsummarisedTurns: unsummarisedTurns(session).length,
    ...secretCounts(session),
    ...scenarioCounts(session.scenarioCollection),
    timeToFirstSign: discoveryMetrics.timeToFirstSign,
    timeToFirstActionableLead: discoveryMetrics.timeToFirstActionableLead,
    ...diagnosticTurnSummary(session, cutoff, lastTurn),
    lastPlayedAt: session.lastPlayedAt,
  };
}

function diagnosticState(session: AdventureSession) {
  return {
    premise: session.premise,
    worldEntry: session.worldEntry,
    playerCharacter: session.playerCharacter,
    visibleState: session.visibleState,
    hiddenState: session.hiddenState,
    scenarioCollection: session.scenarioCollection ?? null,
    worldTime: session.worldTime ?? null,
    places: session.places ?? [],
    currentPlaceId: session.currentPlaceId ?? null,
    storySoFar: session.storySoFar ?? null,
    provisionalFacts: session.provisionalFacts,
    sourceRecords: session.sourceRecords,
    pendingRoll: session.pendingRoll ?? null,
  };
}

/**
 * Compact, LLM-oriented JSON snapshot. Keeps the current state in full, the
 * latest turns in full and older turns as action, narration and time only, so
 * long sessions stay within a model's context. The full-fidelity copy remains
 * `adventureReviewJson`.
 */
export function adventureDiagnosticJson(
  session: AdventureSession,
  options: AdventureDiagnosticOptions = {},
): string {
  const recent = Math.max(
    0,
    options.recentTurns ?? DEFAULT_DIAGNOSTIC_RECENT_TURNS,
  );
  const cutoff = Math.max(0, session.turns.length - recent);
  const lastTurn = session.turns.at(-1);

  return JSON.stringify(
    {
      _readme: DIAGNOSTIC_README,
      summary: diagnosticSummary(session, cutoff, lastTurn),
      integrityChecks: integrityChecks(session),
      state: diagnosticState(session),
      turns: diagnosticTurns(session, cutoff),
    },
    null,
    1,
  );
}

const DIAGNOSTIC_BASELINE_PREFIX = "codex-adventure-diagnostic-baseline:";

function baselineKey(sessionId: string): string {
  return DIAGNOSTIC_BASELINE_PREFIX + sessionId;
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffIdArray<T extends { id: string }>(
  prev: readonly T[] | undefined,
  next: readonly T[] | undefined,
): { added: T[]; updated: T[]; removedIds: string[] } | undefined {
  const prevList = prev ?? [];
  const nextList = next ?? [];
  const prevById = new Map(prevList.map((item) => [item.id, item]));
  const nextIds = new Set(nextList.map((item) => item.id));
  const added: T[] = [];
  const updated: T[] = [];
  for (const item of nextList) {
    const before = prevById.get(item.id);
    if (!before) {
      added.push(item);
    } else if (!jsonEqual(before, item)) {
      updated.push(item);
    }
  }
  const removedIds = prevList
    .filter((item) => !nextIds.has(item.id))
    .map((item) => item.id);
  if (added.length === 0 && updated.length === 0 && removedIds.length === 0) {
    return undefined;
  }
  return { added, updated, removedIds };
}

function diffObjectFields(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  arrayKeys: ReadonlySet<string>,
): Record<string, unknown> | undefined {
  const diff: Record<string, unknown> = {};
  for (const key of Object.keys(next)) {
    if (arrayKeys.has(key)) {
      const arrayDiff = diffIdArray(
        prev[key] as Array<{ id: string }> | undefined,
        next[key] as Array<{ id: string }> | undefined,
      );
      if (arrayDiff) diff[key] = arrayDiff;
    } else if (!jsonEqual(prev[key], next[key])) {
      diff[key] = next[key];
    }
  }
  return Object.keys(diff).length > 0 ? diff : undefined;
}

function diffDiagnosticState(
  prev: ReturnType<typeof diagnosticState>,
  next: ReturnType<typeof diagnosticState>,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  const topArrayKeys = ["places", "provisionalFacts", "sourceRecords"] as const;
  for (const key of topArrayKeys) {
    const arrayDiff = diffIdArray(
      prev[key] as Array<{ id: string }>,
      next[key] as Array<{ id: string }>,
    );
    if (arrayDiff) changes[key] = arrayDiff;
  }

  const visibleDiff = diffObjectFields(
    prev.visibleState as unknown as Record<string, unknown>,
    next.visibleState as unknown as Record<string, unknown>,
    new Set(["objectives", "activeCharacters", "knownFacts", "relationships"]),
  );
  if (visibleDiff) changes.visibleState = visibleDiff;

  const hiddenDiff = diffObjectFields(
    prev.hiddenState as unknown as Record<string, unknown>,
    next.hiddenState as unknown as Record<string, unknown>,
    new Set(["secrets", "gmThreads"]),
  );
  if (hiddenDiff) changes.hiddenState = hiddenDiff;

  if (!jsonEqual(prev.scenarioCollection, next.scenarioCollection)) {
    if (!prev.scenarioCollection || !next.scenarioCollection) {
      changes.scenarioCollection = next.scenarioCollection;
    } else {
      const scenarioDiff = diffObjectFields(
        prev.scenarioCollection as unknown as Record<string, unknown>,
        next.scenarioCollection as unknown as Record<string, unknown>,
        new Set(["items"]),
      );
      if (scenarioDiff) changes.scenarioCollection = scenarioDiff;
    }
  }

  if (!jsonEqual(prev.worldTime, next.worldTime)) {
    if (!prev.worldTime || !next.worldTime) {
      changes.worldTime = next.worldTime;
    } else {
      const timeDiff = diffObjectFields(
        prev.worldTime as unknown as Record<string, unknown>,
        next.worldTime as unknown as Record<string, unknown>,
        new Set(["events"]),
      );
      if (timeDiff) changes.worldTime = timeDiff;
    }
  }

  const scalarKeys = [
    "premise",
    "worldEntry",
    "playerCharacter",
    "currentPlaceId",
    "storySoFar",
    "pendingRoll",
  ] as const;
  for (const key of scalarKeys) {
    if (!jsonEqual(prev[key], next[key])) {
      changes[key] = next[key];
    }
  }
  return changes;
}

/** Capture a baseline snapshot of the session for future delta copies. */
export function createDiagnosticBaseline(
  session: AdventureSession,
): DiagnosticBaseline {
  return {
    sessionId: session.id,
    revision: session.revision,
    turnCount: session.turns.length,
    state: structuredClone(diagnosticState(session)),
  };
}

/**
 * Delta counterpart to `adventureDiagnosticJson`. Emits only turns added and
 * state fields changed since `baseline`, keeping repeated AI-chat pastes small.
 */
export function adventureDiagnosticDeltaJson(
  session: AdventureSession,
  baseline: DiagnosticBaseline,
  options: AdventureDiagnosticOptions = {},
): string {
  const recent = Math.max(
    0,
    options.recentTurns ?? DEFAULT_DIAGNOSTIC_RECENT_TURNS,
  );
  const cutoff = Math.max(0, session.turns.length - recent);
  const lastTurn = session.turns.at(-1);
  const fromTurnCount = Math.min(baseline.turnCount, session.turns.length);
  const newTurns = diagnosticTurns(session, fromTurnCount).slice(fromTurnCount);
  const stateChanges = diffDiagnosticState(
    baseline.state,
    diagnosticState(session),
  );

  return JSON.stringify(
    {
      _readme: [
        "GM-only diagnostic DELTA snapshot of one solo adventure, written for an LLM to read.",
        `Covers changes since revision ${baseline.revision} (turn ${fromTurnCount}) up to revision ${session.revision} (turn ${session.turns.length}).`,
        "stateChanges lists only fields added, updated or removed since the previous copy; turns lists only newly committed turns.",
      ].join(" "),
      delta: {
        fromRevision: baseline.revision,
        toRevision: session.revision,
        fromTurnCount,
        toTurnCount: session.turns.length,
        newTurnsCount: newTurns.length,
      },
      summary: diagnosticSummary(session, cutoff, lastTurn),
      integrityChecks: integrityChecks(session),
      stateChanges,
      turns: newTurns,
    },
    null,
    1,
  );
}

/** Read a previously saved diagnostic baseline for `sessionId`, if valid. */
export function readDiagnosticBaseline(
  sessionId: string,
  storage: DiagnosticStorage | null | undefined,
): DiagnosticBaseline | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(baselineKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DiagnosticBaseline>;
    if (
      parsed.sessionId !== sessionId ||
      typeof parsed.revision !== "number" ||
      typeof parsed.turnCount !== "number" ||
      !parsed.state
    ) {
      return null;
    }
    return parsed as DiagnosticBaseline;
  } catch {
    return null;
  }
}

/**
 * Copy-ready diagnostic JSON: emits a delta from the last copy when a valid
 * baseline exists for the same session (unless `forceFull` is set), then
 * advances the stored baseline to the current session.
 */
export function copyDiagnosticSnapshot(
  session: AdventureSession,
  storage: DiagnosticStorage | null | undefined,
  options: AdventureDiagnosticOptions & { forceFull?: boolean } = {},
): {
  text: string;
  isDelta: boolean;
  fromTurnCount: number;
  toTurnCount: number;
} {
  const baseline = options.forceFull
    ? null
    : readDiagnosticBaseline(session.id, storage);
  const canDelta =
    baseline !== null &&
    session.turns.length >= baseline.turnCount &&
    session.revision >= baseline.revision;
  const text = canDelta
    ? adventureDiagnosticDeltaJson(session, baseline, options)
    : adventureDiagnosticJson(session, options);

  if (storage) {
    try {
      storage.setItem(
        baselineKey(session.id),
        JSON.stringify(createDiagnosticBaseline(session)),
      );
    } catch {
      // Ignore storage quota / privacy-mode errors; clipboard copy still succeeds.
    }
  }

  return {
    text,
    isDelta: canDelta,
    fromTurnCount: canDelta ? baseline.turnCount : 0,
    toTurnCount: session.turns.length,
  };
}
