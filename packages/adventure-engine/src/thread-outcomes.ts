import { scenarioEventSchema } from "./scenario-schemas";
import type {
  AdventureSession,
  CommittedAdventureTurn,
  EmergentThread,
  EmergentThreadStatus,
  ScenarioItem,
  ThreadOutcome,
  ThreadOutcomeProposal,
  ThreadOutcomeResult,
} from "./types";

export interface LegacyOutcomeCandidate {
  threadId: string;
  title: string;
  suggestedResult: ThreadOutcomeResult;
  reason: string;
  supportingFactIds: string[];
  supportingCommitmentIds: string[];
}

function resultToEmergentStatus(
  result: ThreadOutcomeResult,
): EmergentThreadStatus {
  if (result === "abandoned") return "abandoned";
  if (result === "cold") return "cold";
  return "resolved";
}

function pushUniqueBounded(
  target: readonly string[],
  items: readonly string[],
  limit: number,
): string[] {
  const next = [...target];
  for (const item of items) {
    if (next.length >= limit) break;
    if (!item || next.includes(item)) continue;
    next.push(item);
  }
  return next;
}

function collectEvidenceSets(
  session: AdventureSession,
  turn: CommittedAdventureTurn,
) {
  const playerVisibleFactIds = new Set<string>([
    ...session.visibleState.knownFacts.map((f) => f.id),
    ...session.provisionalFacts
      .filter((f) => f.visibility === "player-visible")
      .map((f) => f.id),
  ]);
  const sameTurnVisibleFactIds = [
    ...turn.visiblePatch.knownFacts.add.map((f) => f.id),
    ...turn.provisionalFactIds.filter((id) => playerVisibleFactIds.has(id)),
  ];
  const validCommitmentIds = new Set<string>(
    (session.causalCommitments ?? []).map((c) => c.id),
  );
  const sameTurnCommitmentIds = (turn.causalCommitmentIds ?? []).filter((id) =>
    validCommitmentIds.has(id),
  );
  return {
    playerVisibleFactIds,
    sameTurnVisibleFactIds,
    validCommitmentIds,
    sameTurnCommitmentIds,
  };
}

function resolveSupportingEvidence(
  proposal: ThreadOutcomeProposal,
  evidence: ReturnType<typeof collectEvidenceSets>,
) {
  const requestedFacts = (proposal.supportingFactIds ?? []).filter((id) =>
    evidence.playerVisibleFactIds.has(id),
  );
  const requestedCommitments = (proposal.supportingCommitmentIds ?? []).filter(
    (id) => evidence.validCommitmentIds.has(id),
  );
  const useSameTurnFallback =
    requestedFacts.length === 0 && requestedCommitments.length === 0;
  const supportingFactIds = [
    ...new Set(
      useSameTurnFallback ? evidence.sameTurnVisibleFactIds : requestedFacts,
    ),
  ].slice(0, 16);
  const supportingCommitmentIds = [
    ...new Set(
      useSameTurnFallback
        ? evidence.sameTurnCommitmentIds
        : requestedCommitments,
    ),
  ].slice(0, 16);
  return { supportingFactIds, supportingCommitmentIds };
}

function buildOutcomeRecord(
  proposal: ThreadOutcomeProposal,
  turn: CommittedAdventureTurn,
  now: string,
  supportingFactIds: string[],
  supportingCommitmentIds: string[],
): ThreadOutcome {
  const unresolved = proposal.unresolvedConsequences
    ?.map((entry) => entry.trim().slice(0, 600))
    .filter(Boolean)
    .slice(0, 6);
  return {
    result: proposal.result,
    reason: proposal.reason.trim().slice(0, 600),
    sourceTurnId: turn.id,
    supportingFactIds,
    supportingCommitmentIds,
    recordedAt: now,
    sequence: turn.sequence,
    ...(unresolved && unresolved.length > 0
      ? { unresolvedConsequences: unresolved }
      : {}),
  };
}

function applyToEmergentThread(
  session: AdventureSession,
  thread: EmergentThread,
  proposal: ThreadOutcomeProposal,
  outcome: ThreadOutcome,
  dropped: string[],
): void {
  if (thread.status !== "open") {
    if (
      thread.outcome?.sourceTurnId === outcome.sourceTurnId ||
      thread.outcome?.result === outcome.result
    ) {
      return;
    }
    dropped.push(
      `threadOutcomes: thread ${thread.id} already ${thread.status}`,
    );
    return;
  }
  const nextStatus = resultToEmergentStatus(outcome.result);
  const nextGoal = proposal.goal?.trim().slice(0, 240);
  session.emergentThreads = (session.emergentThreads ?? []).map((item) =>
    item.id === thread.id
      ? {
          ...item,
          status: nextStatus,
          outcome,
          ...(nextGoal ? { goal: nextGoal } : {}),
          linkedFactIds: pushUniqueBounded(
            item.linkedFactIds,
            outcome.supportingFactIds,
            32,
          ),
          linkedCommitmentIds: pushUniqueBounded(
            item.linkedCommitmentIds,
            outcome.supportingCommitmentIds,
            24,
          ),
          updatedAtTurnId: outcome.sourceTurnId,
        }
      : item,
  );
  if (session.focusedEmergentThreadId === thread.id) {
    session.focusedEmergentThreadId = null;
  }
}

function appendScenarioOutcomeEvent(
  events: readonly ScenarioItem["events"][number][],
  reason: string,
  turnId: string,
  now: string,
) {
  if (events.length >= 100) return [...events];
  const parsed = scenarioEventSchema.safeParse({
    id: `${turnId.slice(0, 120)}:outcome:${events.length + 1}`,
    kind: "status-change",
    visibility: "player",
    text: reason,
    at: now,
    turnId,
  });
  return parsed.success ? [...events, parsed.data] : [...events];
}

function isSameOutcome(
  existing: ThreadOutcome | undefined,
  incoming: ThreadOutcome,
): boolean {
  return (
    existing?.sourceTurnId === incoming.sourceTurnId ||
    existing?.result === incoming.result
  );
}

function applyToScenarioItem(
  session: AdventureSession,
  scenario: ScenarioItem,
  proposal: ThreadOutcomeProposal,
  outcome: ThreadOutcome,
  turnId: string,
  now: string,
  dropped: string[],
): void {
  if (scenario.knowledge === "unheard") {
    dropped.push(`threadOutcomes: scenario ${scenario.id} is unheard`);
    return;
  }
  if (scenario.status !== "open") {
    if (!isSameOutcome(scenario.outcome, outcome)) {
      dropped.push(
        `threadOutcomes: scenario ${scenario.id} already ${scenario.status}`,
      );
    }
    return;
  }
  if (outcome.result === "cold") {
    dropped.push(
      `threadOutcomes: scenario ${scenario.id} does not support cold status`,
    );
    return;
  }
  const nextGoal = proposal.goal?.trim().slice(0, 240);
  scenario.status = outcome.result === "abandoned" ? "abandoned" : "resolved";
  scenario.outcome = outcome;
  scenario.events = appendScenarioOutcomeEvent(
    scenario.events,
    outcome.reason,
    turnId,
    now,
  );
  if (nextGoal) scenario.goal = nextGoal;
  if (session.scenarioCollection?.focusedScenarioId === scenario.id) {
    session.scenarioCollection.focusedScenarioId = null;
  }
}

function resolveOutcomeTargets(
  session: AdventureSession,
  proposal: ThreadOutcomeProposal,
) {
  const threads = session.emergentThreads ?? [];
  const emergentTarget = proposal.threadId
    ? threads.find((t) => t.id === proposal.threadId)
    : proposal.scenarioId
      ? threads.find((t) => t.linkedScenarioId === proposal.scenarioId)
      : undefined;
  const scenarioId =
    proposal.scenarioId ?? (!emergentTarget ? proposal.threadId : undefined);
  const scenarioTarget = scenarioId
    ? (session.scenarioCollection?.items ?? []).find(
        (item) => item.id === scenarioId,
      )
    : undefined;
  return { emergentTarget, scenarioTarget };
}

function hasSufficientEvidence(
  proposal: ThreadOutcomeProposal,
  supportingFactIds: readonly string[],
  supportingCommitmentIds: readonly string[],
): boolean {
  if (proposal.result !== "achieved" && proposal.result !== "failed") {
    return true;
  }
  if (supportingFactIds.length > 0 || supportingCommitmentIds.length > 0) {
    return true;
  }
  return false;
}

function reconcileSingleOutcome(
  session: AdventureSession,
  turn: CommittedAdventureTurn,
  proposal: ThreadOutcomeProposal,
  evidence: ReturnType<typeof collectEvidenceSets>,
  now: string,
  dropped: string[],
): void {
  const { emergentTarget, scenarioTarget } = resolveOutcomeTargets(
    session,
    proposal,
  );
  if (!emergentTarget && !scenarioTarget) {
    const ref = proposal.threadId ?? proposal.scenarioId ?? "missing";
    dropped.push(`threadOutcomes: unknown target ${ref.slice(0, 80)}`);
    return;
  }
  const { supportingFactIds, supportingCommitmentIds } =
    resolveSupportingEvidence(proposal, evidence);
  if (
    !hasSufficientEvidence(proposal, supportingFactIds, supportingCommitmentIds)
  ) {
    dropped.push(
      `threadOutcomes: insufficient committed evidence for ${proposal.result}`,
    );
    return;
  }
  const outcome = buildOutcomeRecord(
    proposal,
    turn,
    now,
    supportingFactIds,
    supportingCommitmentIds,
  );
  if (emergentTarget) {
    applyToEmergentThread(session, emergentTarget, proposal, outcome, dropped);
  }
  if (scenarioTarget) {
    applyToScenarioItem(
      session,
      scenarioTarget,
      proposal,
      outcome,
      turn.id,
      now,
      dropped,
    );
  }
}

/**
 * Deterministically validates and applies GM-proposed goal/thread outcomes
 * against committed player-visible facts, causal commitments, and open
 * emergent threads or scenarios. Drops ungrounded or conflicting proposals
 * into `dropped` rather than fabricating proof.
 */
export function reconcileThreadOutcomes(
  session: AdventureSession,
  turn: CommittedAdventureTurn,
  proposals: readonly ThreadOutcomeProposal[] | undefined,
  now: string,
  dropped: string[],
): void {
  if (!proposals?.length) return;
  const evidence = collectEvidenceSets(session, turn);
  for (const proposal of proposals) {
    reconcileSingleOutcome(session, turn, proposal, evidence, now, dropped);
  }
}

function normalizeThreadKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function mergeTwoThreads(
  primary: EmergentThread,
  duplicate: EmergentThread,
): EmergentThread {
  return {
    ...primary,
    goal: primary.goal ?? duplicate.goal,
    outcome: primary.outcome ?? duplicate.outcome,
    provenance:
      primary.provenance !== duplicate.provenance
        ? "mixed"
        : primary.provenance,
    topicTokens: pushUniqueBounded(
      primary.topicTokens,
      duplicate.topicTokens,
      16,
    ),
    linkedPersonIds: pushUniqueBounded(
      primary.linkedPersonIds,
      duplicate.linkedPersonIds,
      24,
    ),
    linkedPlaceIds: pushUniqueBounded(
      primary.linkedPlaceIds,
      duplicate.linkedPlaceIds,
      24,
    ),
    linkedFactIds: pushUniqueBounded(
      primary.linkedFactIds,
      duplicate.linkedFactIds,
      32,
    ),
    linkedCommitmentIds: pushUniqueBounded(
      primary.linkedCommitmentIds,
      duplicate.linkedCommitmentIds,
      24,
    ),
    openQuestions: pushUniqueBounded(
      primary.openQuestions,
      duplicate.openQuestions,
      8,
    ),
    knownConsequences: pushUniqueBounded(
      primary.knownConsequences,
      duplicate.knownConsequences,
      12,
    ),
    gmOnlyDevelopments: pushUniqueBounded(
      primary.gmOnlyDevelopments,
      duplicate.gmOnlyDevelopments,
      8,
    ),
    linkedScenarioId: primary.linkedScenarioId ?? duplicate.linkedScenarioId,
    updatedAtTurnId: duplicate.updatedAtTurnId,
    turnCount: primary.turnCount + duplicate.turnCount,
  };
}

/**
 * Safely reconciles duplicate open emergent threads that share a linked
 * scenario or identical normalised title, preserving the earliest thread ID.
 */
export function reconcileDuplicateEmergentThreads(
  threads: readonly EmergentThread[],
): { threads: EmergentThread[]; idRemap: Record<string, string> } {
  const result: EmergentThread[] = [];
  const idRemap: Record<string, string> = {};
  for (const thread of threads) {
    const matchIndex = result.findIndex(
      (existing) =>
        existing.status === "open" &&
        thread.status === "open" &&
        ((existing.linkedScenarioId &&
          existing.linkedScenarioId === thread.linkedScenarioId) ||
          (normalizeThreadKey(existing.title).length > 0 &&
            normalizeThreadKey(existing.title) ===
              normalizeThreadKey(thread.title))),
    );
    if (matchIndex === -1) {
      result.push(thread);
    } else {
      const primary = result[matchIndex]!;
      idRemap[thread.id] = primary.id;
      result[matchIndex] = mergeTwoThreads(primary, thread);
    }
  }
  return { threads: result, idRemap };
}

const LEGACY_RESOLUTION_RE =
  /\b(?:ratified|sealed|proclaimed|compact|resolved|settled|completed|abandoned)\b/i;

function inspectScenarioCandidate(
  session: AdventureSession,
  thread: EmergentThread,
): LegacyOutcomeCandidate | undefined {
  if (!thread.linkedScenarioId) return undefined;
  const scenario = (session.scenarioCollection?.items ?? []).find(
    (s) => s.id === thread.linkedScenarioId && s.status !== "open",
  );
  if (!scenario) return undefined;
  return {
    threadId: thread.id,
    title: thread.title,
    suggestedResult: scenario.status === "abandoned" ? "abandoned" : "achieved",
    reason:
      scenario.outcome?.reason ??
      `Linked scenario "${scenario.playerVisible.lead}" is ${scenario.status}.`,
    supportingFactIds: thread.linkedFactIds.slice(0, 6),
    supportingCommitmentIds: thread.linkedCommitmentIds.slice(0, 6),
  };
}

function inspectFactCandidate(
  session: AdventureSession,
  thread: EmergentThread,
  recentTurnIds: ReadonlySet<string>,
): LegacyOutcomeCandidate | undefined {
  const hasRecentActivity =
    recentTurnIds.size === 0 || recentTurnIds.has(thread.updatedAtTurnId);
  if (!hasRecentActivity) return undefined;
  const matchingFacts = session.visibleState.knownFacts.filter(
    (f) =>
      thread.linkedFactIds.includes(f.id) && LEGACY_RESOLUTION_RE.test(f.text),
  );
  if (matchingFacts.length === 0) return undefined;
  return {
    threadId: thread.id,
    title: thread.title,
    suggestedResult: "achieved",
    reason: matchingFacts.at(-1)!.text.slice(0, 240),
    supportingFactIds: matchingFacts.map((f) => f.id).slice(0, 6),
    supportingCommitmentIds: thread.linkedCommitmentIds.slice(0, 6),
  };
}

/**
 * Pure, read-only inspection for older sessions: identifies open emergent
 * threads that already appear to have a committed completion signal (such as
 * a linked resolved scenario or explicit resolution facts) for human review.
 * Never mutates the session or rewrites transcript turns.
 */
export function inspectLegacyThreadOutcomeCandidates(
  session: AdventureSession,
  maxLookbackTurns = 12,
): LegacyOutcomeCandidate[] {
  const threads = (session.emergentThreads ?? []).filter(
    (t) => t.status === "open" && !t.outcome,
  );
  if (threads.length === 0) return [];
  const recentTurnIds = new Set(
    session.turns.slice(-maxLookbackTurns).map((t) => t.id),
  );
  const candidates: LegacyOutcomeCandidate[] = [];
  for (const thread of threads) {
    const candidate =
      inspectScenarioCandidate(session, thread) ??
      inspectFactCandidate(session, thread, recentTurnIds);
    if (candidate) candidates.push(candidate);
  }
  return candidates.slice(0, 8);
}

/**
 * Applies explicitly reviewed outcome proposals to an existing session without
 * rewriting transcript turns.
 */
export function applyReviewedThreadOutcomes(
  sessionInput: AdventureSession,
  approvals: readonly ThreadOutcomeProposal[],
  now: string,
): { session: AdventureSession; dropped: string[] } {
  const session = structuredClone(sessionInput);
  const lastTurn = session.turns.at(-1);
  if (!lastTurn || approvals.length === 0) {
    return { session, dropped: [] };
  }
  let reconciledApprovals = approvals;
  if (session.emergentThreads?.length) {
    const deduped = reconcileDuplicateEmergentThreads(session.emergentThreads);
    session.emergentThreads = deduped.threads;
    if (
      session.focusedEmergentThreadId &&
      deduped.idRemap[session.focusedEmergentThreadId]
    ) {
      session.focusedEmergentThreadId =
        deduped.idRemap[session.focusedEmergentThreadId]!;
    }
    reconciledApprovals = approvals.map((approval) =>
      approval.threadId && deduped.idRemap[approval.threadId]
        ? { ...approval, threadId: deduped.idRemap[approval.threadId]! }
        : approval,
    );
  }
  const dropped: string[] = [];
  reconcileThreadOutcomes(session, lastTurn, reconciledApprovals, now, dropped);
  return { session, dropped };
}
