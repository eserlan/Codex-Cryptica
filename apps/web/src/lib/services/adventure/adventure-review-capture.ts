import type {
  AdventureSession,
  HiddenLeakageDiagnostic,
} from "@codex/adventure-engine";
import {
  dialogueLoopPacing,
  findDuplicateActiveCharacterPresence,
  formatWorldElapsedMinutes,
  investigativeProgressPacing,
  isQuietTurn,
  revealedSecretIds as knownRevealedSecretIds,
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
  const { packageProgress: _packageProgress, ...exportedSession } = session;
  return JSON.stringify(exportedSession, null, 2);
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

/** #5110 TurnProgressKind values that count as observable advancement. */
const MEANINGFUL_PROGRESS_CATEGORIES = new Set([
  "scenario-stage-or-status-change",
  "actionable-discovery",
  "obstacle-advanced-or-resolved",
  "causal-state-change",
  "consequential-player-choice",
  "useful-negative-finding",
]);

/**
 * Bounded #5112 generation roll-up for the GM-only diagnostic summary.
 * Counts and categories only; legacy turns without metadata count as
 * `unknown`, never a guessed classification. Scenario IDs are GM-only.
 */
type GenerationTally = {
  transportCounts: { interaction: number; stateless: number; unknown: number };
  threadModeCounts: {
    new: number;
    continued: number;
    reset: number;
    unknown: number;
  };
  progressCategoryCounts: Record<string, number>;
  turnsWithGeneration: number;
  lastResetReason: string | null;
  lastRevisionMismatchCause: string | null;
  resetWithoutReason: boolean;
  lastProgressCategory: string | null;
  recentProgressCategories: string[];
};

function recordReset(
  tally: GenerationTally,
  generation: NonNullable<AdventureSession["turns"][number]["generation"]>,
): void {
  if (generation.threadMode !== "reset") return;
  if (generation.resetReason) tally.lastResetReason = generation.resetReason;
  else tally.resetWithoutReason = true;
  if (generation.revisionMismatchCause) {
    tally.lastRevisionMismatchCause = generation.revisionMismatchCause;
  }
}

function tallyGeneration(session: AdventureSession): GenerationTally {
  const tally: GenerationTally = {
    transportCounts: { interaction: 0, stateless: 0, unknown: 0 },
    threadModeCounts: { new: 0, continued: 0, reset: 0, unknown: 0 },
    progressCategoryCounts: {},
    turnsWithGeneration: 0,
    lastResetReason: null,
    lastRevisionMismatchCause: null,
    resetWithoutReason: false,
    lastProgressCategory: null,
    recentProgressCategories: [],
  };
  for (const turn of session.turns) {
    const generation = turn.generation;
    if (!generation) {
      tally.transportCounts.unknown += 1;
      tally.threadModeCounts.unknown += 1;
      continue;
    }
    tally.turnsWithGeneration += 1;
    tally.transportCounts[generation.transport ?? "unknown"] += 1;
    tally.threadModeCounts[generation.threadMode ?? "unknown"] += 1;
    recordReset(tally, generation);
    if (generation.progressCategory)
      recordProgress(tally, generation.progressCategory);
  }
  return tally;
}

function recordProgress(tally: GenerationTally, category: string): void {
  tally.progressCategoryCounts[category] =
    (tally.progressCategoryCounts[category] ?? 0) + 1;
  tally.lastProgressCategory = category;
  tally.recentProgressCategories.push(category);
  if (tally.recentProgressCategories.length > 5)
    tally.recentProgressCategories.shift();
}

function lastScenarioIdsFrom(session: AdventureSession): string[] {
  for (let i = session.turns.length - 1; i >= 0; i -= 1) {
    const ids = session.turns[i]?.generation?.scenarioIds;
    if (ids?.length) return ids;
  }
  return [];
}

function generationSummary(session: AdventureSession) {
  const tally = tallyGeneration(session);
  const items = session.scenarioCollection?.items ?? [];
  const lastScenarioIds = lastScenarioIdsFrom(session);
  const recentMeaningful = tally.recentProgressCategories.filter((category) =>
    MEANINGFUL_PROGRESS_CATEGORIES.has(category),
  ).length;

  return {
    turnsWithGeneration: tally.turnsWithGeneration,
    turnsWithoutGeneration: session.turns.length - tally.turnsWithGeneration,
    transportCounts: tally.transportCounts,
    threadModeCounts: tally.threadModeCounts,
    threadReuseTurns: tally.threadModeCounts.continued,
    resets: tally.threadModeCounts.reset,
    // Null when no reset was recorded; "unknown" when a reset was recorded
    // without a reason. Never guesses a reason.
    lastResetReason:
      tally.lastResetReason ?? (tally.resetWithoutReason ? "unknown" : null),
    ...(tally.lastRevisionMismatchCause
      ? { lastRevisionMismatchCause: tally.lastRevisionMismatchCause }
      : {}),
    focusedScenarioId: session.scenarioCollection?.focusedScenarioId ?? null,
    activeScenarioIds: items
      .filter((item) => item.status === "open")
      .map((item) => item.id),
    lastScenarioIds,
    progressCategoryCounts: tally.progressCategoryCounts,
    lastProgressCategory: tally.lastProgressCategory,
    recentProgressCategories: tally.recentProgressCategories,
    recentMeaningfulProgressTurns: recentMeaningful,
  };
}

const DIAGNOSTIC_README = [
  "GM-only diagnostic snapshot of one solo adventure, written for an LLM to read.",
  "It contains hidden secrets and GM threads. Do not share with players.",
  "summary: quick orientation. dialogueLoopTurns counts consecutive unanswered related inquiries; dialogueRecoveryDue indicates a dialogue-specific recovery opportunity. investigativeStallTurns counts pursued-thread turns without meaningful advancement; repeatedNonAnswerTurns counts inquiry non-answers; investigativeRecoveryDue indicates pursued-thread stall recovery is due. quietTurns: trailing turns that changed nothing in the world (0 when under 4 turns or a roll is pending). timeToFirstSign: 1-based turn when the first scenario sign/discovery surfaced (null if none). timeToFirstActionableLead: 1-based turn when the first actionable lead was reached (null if none). integrityChecks: precomputed consistency findings (empty arrays mean clean).",
  "state: the current truth. storySoFar is the GM's rolling notes on turns older than the prompt window, written from player-visible text; summary.unsummarisedTurns counts older turns not yet folded in. places lists where the player has been; facts and characters carry a placeId, and ones with none apply everywhere. visibleState is what the player knows; hiddenState and scenarioCollection are GM-only.",
  "source 'provisional' means the Oracle invented it in play; it is not backed by a Vault record.",
  "turns: oldest first. Every turn, condensed or full, carries signals; a missing signal means false or 0: quiet (changed nothing in the world), locationChanged, and stateChanges (visible entries added, updated or removed). summary.longestQuietRun and summary.stalledScenes count quiet streaks, a stalled scene being every fourth quiet turn in a row. A turn's dropped list names the parts of the model's reply the engine left out because they could not apply (an unknown id, a step not allowed yet); the turn itself committed, and summary.droppedParts totals them. Turns marked detail 'condensed' keep only action, narration, time, dropped and signals; detail 'full' also keeps every state patch.",
  "timeAdvance is null when a turn did not move the fictional clock. Time is in minutes.",
  "generation: per-turn GM-only transport diagnostics (#5112), present only on instrumented committed turns; absent means legacy/unknown, never guess it. transport is 'interaction' (retained provider history) or 'stateless' (fresh context, including fallback after a provider failure); a stateless turn is never retained history. threadMode is 'new', 'continued' (provider thread reused) or 'reset'; resetReason names the recorded cause and lastResetReason in the summary is null when no reset was recorded and 'unknown' when a reset had no reason. modelKey is a model registry key only. summary.generation rolls up thread reuse/reset counts, the last reset reason, focused/active scenario IDs and the recent #5110 progress categories; summary.droppedParts and lastTurnRejection stay the channels for omitted reply parts and rejected turns, which carry no committed generation record.",
  "To capture and interpret a diagnostic for a stalled adventure: copy it while the stall is visible, then compare summary.generation with the quiet and investigative counters. A run of 'stateless' turns after 'interaction' turns points at provider fallback; a reset names why the thread restarted; repeated 'no-observable-change' or 'repeated-non-answer' progress categories alongside quiet turns mean nothing is advancing, while a meaningful recent category with a long quiet run points at a committed change the player never saw. Turns without generation are pre-instrumentation history: treat them as unknown, not as retained success.",
].join(" ");

export interface TurnRejectionDiagnostic {
  reason: string;
  diagnostic?: HiddenLeakageDiagnostic;
  revision: number;
  recordedAt: string;
}

export interface AdventureDiagnosticOptions {
  /** Turns that keep their full patches. Older turns are condensed. */
  recentTurns?: number;
  /** Most recent uncommitted turn refusal (if any), for mobile/on-device triage. */
  lastTurnRejection?: TurnRejectionDiagnostic | null;
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
  const turnRevealIds = session.turns.flatMap(
    (turn) => turn.revealedSecretIds ?? [],
  );
  const secretIds = new Set(knownRevealedSecretIds(session, turnRevealIds));
  return {
    nonContiguousTurnSequences: session.turns
      .filter((turn, index) => turn.sequence !== index)
      .map((turn) => turn.id),
    factsIntroducedOnMissingTurn: session.provisionalFacts
      .filter(
        (fact) =>
          Boolean(fact.introducedOnTurnId) &&
          !turnIds.has(fact.introducedOnTurnId!),
      )
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
    orphanedPersonFactLinks: (session.people ?? []).flatMap((person) =>
      person.linkedFactIds
        .filter((factId) => !factIds.has(factId))
        .map((factId) => ({ personId: person.id, factId })),
    ),
    duplicateActiveCharacterPresence:
      findDuplicateActiveCharacterPresence(session),
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
      ...(turn.generation ? { generation: turn.generation } : {}),
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

function dialogueSummary(session: AdventureSession) {
  const dialogue = dialogueLoopPacing(session);
  return {
    dialogueLoopTurns: dialogue ? dialogue.repeatedTurns : 0,
    dialogueRecoveryDue: dialogue ? dialogue.recoveryDue : false,
  };
}

function investigativeSummary(session: AdventureSession) {
  const inv = investigativeProgressPacing(session);
  return {
    investigativeStallTurns: inv ? inv.turnsWithoutAdvancement : 0,
    investigativeRecoveryDue: inv ? inv.recoveryDue : false,
    repeatedNonAnswerTurns: inv ? inv.repeatedNonAnswerTurns : 0,
  };
}

function diagnosticTurnSummary(
  session: AdventureSession,
  cutoff: number,
  lastTurn: AdventureSession["turns"][number] | undefined,
) {
  const stall = sceneStallPacing(session);
  return {
    turnsTotal: session.turns.length,
    turnsFull: session.turns.length - cutoff,
    turnsCondensed: cutoff,
    pendingRoll: session.pendingRoll != null,
    quietTurns: stall ? stall.quietTurns : 0,
    ...dialogueSummary(session),
    ...investigativeSummary(session),
    ...quietRuns(session),
    droppedParts: session.turns.reduce(
      (total, turn) => total + (turn.dropped?.length ?? 0),
      0,
    ),
    lastPlayerAction: lastTurn?.playerAction ?? null,
  };
}

function emergentThreadSummary(session: AdventureSession) {
  const threads = session.emergentThreads ?? [];
  const countStatus = (status: string) =>
    threads.filter((t) => t.status === status).length;
  return {
    total: threads.length,
    open: countStatus("open"),
    resolved: countStatus("resolved"),
    abandoned: countStatus("abandoned"),
    cold: countStatus("cold"),
    focusedEmergentThreadId: session.focusedEmergentThreadId ?? null,
    threads: threads.slice(-6).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      provenance: t.provenance,
      turnCount: t.turnCount,
      linkedFactCount: t.linkedFactIds.length,
      linkedPersonCount: t.linkedPersonIds.length,
      linkedPlaceCount: t.linkedPlaceIds.length,
      linkedCommitmentCount: t.linkedCommitmentIds.length,
      openQuestionCount: t.openQuestions.length,
      knownConsequenceCount: t.knownConsequences.length,
      ...(t.linkedScenarioId ? { linkedScenarioId: t.linkedScenarioId } : {}),
    })),
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
    ooc: {
      totalExchanges: (session.oocExchanges ?? []).length,
      answeredCount: (session.oocExchanges ?? []).filter(
        (entry) => entry.status === "answered",
      ).length,
      establishedDecisionsCount: (session.oocExchanges ?? []).reduce(
        (sum, entry) => sum + (entry.committedFactIds?.length ?? 0),
        0,
      ),
      latestExchangeIds: (session.oocExchanges ?? [])
        .slice(-5)
        .map((entry) => entry.id),
      oocSourcedFactCount: session.provisionalFacts.filter(
        (fact) => fact.provenance === "ooc",
      ).length,
    },
    generation: generationSummary(session),
    emergentThreads: emergentThreadSummary(session),
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
    oocExchanges: session.oocExchanges ?? [],
    pendingRoll: session.pendingRoll ?? null,
  };
}

function resolveDiagnosticCutoff(
  session: AdventureSession,
  options: AdventureDiagnosticOptions,
): number {
  const recent = Math.max(
    0,
    options.recentTurns ?? DEFAULT_DIAGNOSTIC_RECENT_TURNS,
  );
  return Math.max(0, session.turns.length - recent);
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
  const cutoff = resolveDiagnosticCutoff(session, options);
  const lastTurn = session.turns.at(-1);

  return JSON.stringify(
    {
      _readme: DIAGNOSTIC_README,
      summary: diagnosticSummary(session, cutoff, lastTurn),
      ...(options.lastTurnRejection
        ? { lastTurnRejection: options.lastTurnRejection }
        : {}),
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

function diffOptionalObjectField(
  prev: unknown,
  next: unknown,
  idArrayKeys: Set<string>,
): unknown {
  if (jsonEqual(prev, next)) return undefined;
  if (!prev || !next) return next;
  return diffObjectFields(
    prev as Record<string, unknown>,
    next as Record<string, unknown>,
    idArrayKeys,
  );
}

function diffDiagnosticState(
  prev: ReturnType<typeof diagnosticState>,
  next: ReturnType<typeof diagnosticState>,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  const topArrayKeys = [
    "places",
    "provisionalFacts",
    "sourceRecords",
    "oocExchanges",
  ] as const;
  for (const key of topArrayKeys) {
    const arrayDiff = diffIdArray(
      prev[key] as Array<{ id: string }>,
      next[key] as Array<{ id: string }>,
    );
    if (arrayDiff) changes[key] = arrayDiff;
  }

  const nestedSpecs: Array<{
    key: "visibleState" | "hiddenState" | "scenarioCollection" | "worldTime";
    idArrayKeys: Set<string>;
  }> = [
    {
      key: "visibleState",
      idArrayKeys: new Set([
        "objectives",
        "activeCharacters",
        "knownFacts",
        "relationships",
      ]),
    },
    {
      key: "hiddenState",
      idArrayKeys: new Set(["secrets", "gmThreads"]),
    },
    {
      key: "scenarioCollection",
      idArrayKeys: new Set(["items"]),
    },
    {
      key: "worldTime",
      idArrayKeys: new Set(["events"]),
    },
  ];
  for (const { key, idArrayKeys } of nestedSpecs) {
    const diff = diffOptionalObjectField(prev[key], next[key], idArrayKeys);
    if (diff !== undefined) changes[key] = diff;
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
  const cutoff = resolveDiagnosticCutoff(session, options);
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
      ...(options.lastTurnRejection
        ? { lastTurnRejection: options.lastTurnRejection }
        : {}),
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
 * Copy-ready diagnostic JSON: emits a delta from the last successful copy when
 * a valid baseline exists for the same session (unless `forceFull` is set).
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

  return {
    text,
    isDelta: canDelta,
    fromTurnCount: canDelta ? baseline.turnCount : 0,
    toTurnCount: session.turns.length,
  };
}

/** Advance the local delta cursor after the diagnostic text was copied. */
export function saveDiagnosticBaseline(
  session: AdventureSession,
  storage: DiagnosticStorage | null | undefined,
): void {
  if (!storage) return;
  try {
    storage.setItem(
      baselineKey(session.id),
      JSON.stringify(createDiagnosticBaseline(session)),
    );
  } catch {
    // Ignore storage quota / privacy-mode errors; clipboard copy still succeeds.
  }
}
