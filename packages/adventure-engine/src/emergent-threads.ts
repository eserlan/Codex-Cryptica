import { threadTopicWords } from "./dialogue-pacing";
import { resolvePersonByReference } from "./people";
import { isInvestigativeInquiry } from "./turn-progression";
import type {
  AdventureOocExchange,
  AdventureSession,
  CommittedAdventureTurn,
  EmergentThread,
  EmergentThreadStatus,
  ProvisionalFact,
} from "./types";

export const MAX_EMERGENT_THREADS = 16;
const MAX_THREAD_TOKENS = 16;
const MAX_THREAD_IDS = 24;
const MAX_THREAD_FACTS = 32;
const MAX_THREAD_QUESTIONS = 8;
const MAX_THREAD_CONSEQUENCES = 12;
const MAX_THREAD_GM_DEVS = 8;

const CASUAL_CHATTER_RE =
  /\b(?:price|prices|cost|costs|how\s+much|buy|sell|ale|beer|bread|stew|room\s+for\s+the\s+night|weather|greeting|hello|good\s+morning)\b/i;

const EXPLORE_PIVOT_RE =
  /^(?:i\s+)?(?:explore|browse|wander|stroll|shop|relax|rest|eat|drink|sleep|ignore|walk\s+away)\b/i;

function pushBoundedUnique(
  target: string[],
  items: readonly (string | undefined)[],
  limit: number,
): string[] {
  const next = [...target];
  for (const item of items) {
    if (next.length >= limit) break;
    const trimmed = item?.trim();
    if (!trimmed || next.includes(trimmed)) continue;
    next.push(trimmed);
  }
  return next;
}

function collectTurnTopicTokens(
  turn: CommittedAdventureTurn,
  facts: readonly ProvisionalFact[],
): string[] {
  const tokens = new Set<string>(threadTopicWords(turn.playerAction));
  for (const f of facts) {
    for (const t of threadTopicWords(`${f.name} ${f.summary}`)) tokens.add(t);
  }
  for (const f of turn.visiblePatch.knownFacts.add) {
    for (const t of threadTopicWords(f.text)) tokens.add(t);
  }
  return [...tokens].slice(0, MAX_THREAD_TOKENS);
}

function collectTurnFactIds(turn: CommittedAdventureTurn): string[] {
  return [
    ...turn.provisionalFactIds,
    ...turn.visiblePatch.knownFacts.add.map((f) => f.id),
    ...turn.visiblePatch.knownFacts.update.map((f) => f.id),
  ];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectMentionedPersonIds(
  text: string,
  people: readonly NonNullable<AdventureSession["people"]>[number][],
): string[] {
  const matched: string[] = [];
  for (const person of people) {
    const names = [person.name, ...person.aliases].filter(
      (n) => n.trim().length >= 3,
    );
    const hit = names.some((name) =>
      new RegExp(`\\b${escapeRegex(name.trim())}\\b`, "i").test(text),
    );
    if (hit) matched.push(person.id);
  }
  return matched;
}

function collectActivePatchPersonIds(
  turn: CommittedAdventureTurn,
  people: readonly NonNullable<AdventureSession["people"]>[number][],
): string[] {
  const ids: string[] = [];
  for (const char of [
    ...turn.visiblePatch.activeCharacters.add,
    ...turn.visiblePatch.activeCharacters.update,
  ]) {
    const baseName = (char.text.split(/[,(—]|\s+-\s+/)[0] ?? char.text).trim();
    if (!baseName) continue;
    const res = resolvePersonByReference(people, baseName);
    if (res.person) ids.push(res.person.id);
  }
  return ids;
}

function collectTurnPersonIds(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
): string[] {
  const people = session.people ?? [];
  if (people.length === 0) return [];
  const factOwners = turn.provisionalFactIds
    .map((factId) => people.find((p) => p.linkedFactIds.includes(factId))?.id)
    .filter((id): id is string => Boolean(id));
  return [
    ...new Set([
      ...collectActivePatchPersonIds(turn, people),
      ...factOwners,
      ...collectMentionedPersonIds(
        `${turn.playerAction}\n${turn.narration}`,
        people,
      ),
    ]),
  ];
}

function collectTurnCommitmentIds(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
): string[] {
  const fromTurn = turn.causalCommitmentIds ?? [];
  const fromSession = (session.causalCommitments ?? [])
    .filter((c) => c.sourceTurnId === turn.id)
    .map((c) => c.id);
  return [...new Set([...fromTurn, ...fromSession])];
}

function isSubstantiveTurn(
  turn: CommittedAdventureTurn,
  facts: readonly ProvisionalFact[],
  commitmentIds: readonly string[],
): boolean {
  const hasClueOrCommitment =
    facts.some((f) => f.kind === "clue" || f.kind === "event") ||
    commitmentIds.length > 0;
  if (CASUAL_CHATTER_RE.test(turn.playerAction) && !hasClueOrCommitment) {
    return false;
  }
  return (
    isInvestigativeInquiry(turn.playerAction) ||
    hasClueOrCommitment ||
    turn.visiblePatch.knownFacts.add.length > 0
  );
}

function countOverlap(a: readonly string[], b: readonly string[]): number {
  const setB = new Set(b);
  let count = 0;
  for (const token of a) {
    if (setB.has(token)) count += 1;
  }
  return count;
}

const REPORT_EVIDENCE_RE =
  /\b(?:report|tell|inform|explain|show|bring|return\s+to|debrief|update|share\s+(?:what|the\s+evidence|the\s+findings)|what\s+(?:we|i)\s+found)\b/i;

function threadAllTopicTokens(thread: EmergentThread): string[] {
  const extra = [
    thread.title,
    ...thread.knownConsequences.slice(-4),
    ...thread.openQuestions.slice(-3),
  ].flatMap((text) => [...threadTopicWords(text)]);
  return [...new Set([...thread.topicTokens, ...extra])];
}

function findBestMatchingThread(
  threads: readonly EmergentThread[],
  tokens: readonly string[],
  personIds: readonly string[],
  factIds: readonly string[],
): EmergentThread | undefined {
  let best: EmergentThread | undefined;
  let bestScore = 0;
  for (const thread of threads) {
    if (thread.status !== "open") continue;
    const allTokens = threadAllTopicTokens(thread);
    const tokenScore = countOverlap(allTokens, tokens);
    const factScore = countOverlap(thread.linkedFactIds, factIds);
    const personScore = countOverlap(thread.linkedPersonIds, personIds);
    // Never merge solely on shared location; require topic or fact/person+topic signal.
    const total =
      tokenScore > 0
        ? tokenScore * 2 + factScore * 2 + personScore
        : factScore > 0
          ? factScore * 2 + personScore
          : 0;
    if (total > bestScore) {
      bestScore = total;
      best = thread;
    }
  }
  return bestScore >= 2 ? best : undefined;
}

function hasUnrelatedNewClue(
  facts: readonly ProvisionalFact[],
  thread: EmergentThread,
): boolean {
  const clues = facts.filter((f) => f.kind === "clue" || f.kind === "event");
  if (clues.length === 0) return false;
  const threadTokens = threadAllTopicTokens(thread);
  return clues.every(
    (f) =>
      countOverlap(
        [...threadTopicWords(`${f.name} ${f.summary}`)],
        threadTokens,
      ) === 0,
  );
}

function findContinuationThread(
  threads: readonly EmergentThread[],
  session: AdventureSession,
  turn: CommittedAdventureTurn,
  tokens: readonly string[],
  personIds: readonly string[],
  facts: readonly ProvisionalFact[],
): EmergentThread | undefined {
  const openThreads = threads.filter((t) => t.status === "open");
  if (openThreads.length === 0) return undefined;

  // 1. Shared active objective bridge (objective overlaps both current turn and an open thread)
  const objMatches = openThreads.filter((thread) =>
    session.visibleState.objectives.some((obj) => {
      const objTokens = [...threadTopicWords(obj.text)];
      return (
        countOverlap(objTokens, tokens) >= 1 &&
        countOverlap(objTokens, threadAllTopicTokens(thread)) >= 1
      );
    }),
  );
  if (objMatches.length === 1) return objMatches[0];

  // 2. Contact/witness continuity when not introducing an unrelated new clue
  if (personIds.length > 0) {
    const personMatches = openThreads.filter(
      (t) =>
        countOverlap(t.linkedPersonIds, personIds) >= 1 &&
        !hasUnrelatedNewClue(facts, t),
    );
    if (personMatches.length === 1) return personMatches[0];
  }

  // 3. Explicit return-to-contact / report-evidence turn on the sole open case
  if (
    openThreads.length === 1 &&
    REPORT_EVIDENCE_RE.test(turn.playerAction) &&
    !hasUnrelatedNewClue(facts, openThreads[0]!)
  ) {
    return openThreads[0];
  }
  return undefined;
}

function countStrongSignals(
  turn: CommittedAdventureTurn,
  facts: readonly ProvisionalFact[],
  commitmentIds: readonly string[],
): number {
  const checks = [
    isInvestigativeInquiry(turn.playerAction),
    facts.some((f) => f.visibility === "player-visible"),
    commitmentIds.length > 0,
    turn.visiblePatch.knownFacts.add.length > 0,
  ];
  return checks.filter(Boolean).length;
}

function hasPriorTopicOverlap(
  session: AdventureSession,
  turnId: string,
  tokens: readonly string[],
): boolean {
  const recentTurnMatch = session.turns
    .slice(-8)
    .some(
      (prev) =>
        prev.id !== turnId &&
        countOverlap([...threadTopicWords(prev.playerAction)], tokens) >= 1,
    );
  if (recentTurnMatch) return true;
  return (session.oocExchanges ?? []).some(
    (ooc) =>
      ooc.status === "answered" &&
      ooc.classification === "established" &&
      countOverlap([...threadTopicWords(ooc.question)], tokens) >= 1,
  );
}

function hasEmergenceThreshold(
  session: AdventureSession,
  turn: CommittedAdventureTurn,
  tokens: readonly string[],
  facts: readonly ProvisionalFact[],
  commitmentIds: readonly string[],
): boolean {
  if (countStrongSignals(turn, facts, commitmentIds) >= 2) return true;
  return hasPriorTopicOverlap(session, turn.id, tokens);
}

const IMPERATIVE_ACTION_PREFIX_RE =
  /^(?:i\s+)?(?:inspect|examine|check|search|look\s+(?:at|around|for)|ask|question|inquire|investigate|probe)\s+(?:the\s+)?/i;

function matchingObjectiveOrSituation(
  session: AdventureSession,
  tokens: readonly string[],
): string | undefined {
  for (const obj of session.visibleState.objectives) {
    const candTokens = [...threadTopicWords(obj.text)];
    if (countOverlap(candTokens, tokens) >= 1) {
      return obj.text.trim().slice(0, 120);
    }
  }
  const sitText = session.visibleState.situation?.text?.trim();
  if (sitText && sitText.length <= 80) {
    const sitTokens = [...threadTopicWords(sitText)];
    if (countOverlap(sitTokens, tokens) >= 1) return sitText;
  }
  return undefined;
}

function deriveThreadTitle(
  session: AdventureSession,
  turn: CommittedAdventureTurn,
  facts: readonly ProvisionalFact[],
  tokens: readonly string[],
): string {
  const firstFact = facts.find((f) => f.visibility === "player-visible");
  if (firstFact) {
    return `${firstFact.name}: ${firstFact.summary}`.slice(0, 120);
  }
  const caseSubject = matchingObjectiveOrSituation(session, tokens);
  if (caseSubject) return caseSubject;

  const recurringFact = session.visibleState.knownFacts.find(
    (f) => countOverlap([...threadTopicWords(f.text)], tokens) >= 2,
  );
  if (recurringFact) return recurringFact.text.trim().slice(0, 120);

  const cleanedAction = turn.playerAction
    .trim()
    .replace(IMPERATIVE_ACTION_PREFIX_RE, "");
  return (
    cleanedAction.slice(0, 120) ||
    turn.playerAction.trim().slice(0, 120) ||
    "Improvised investigation"
  );
}

function collectGmDevelopments(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  commitmentIds: readonly string[],
): string[] {
  const devs: string[] = [];
  for (const cid of commitmentIds) {
    const c = (session.causalCommitments ?? []).find((item) => item.id === cid);
    if (c) devs.push(`${c.subject}: ${c.summary}`.slice(0, 180));
  }
  for (const gm of turn.hiddenPatch.gmThreads.add) {
    devs.push(gm.text.slice(0, 180));
  }
  return devs;
}

function mergeIntoThread(
  thread: EmergentThread,
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  tokens: readonly string[],
  personIds: readonly string[],
  commitmentIds: readonly string[],
  placeIdOverride?: string,
): EmergentThread {
  const resolvedPlaceId = placeIdOverride ?? session.currentPlaceId;
  const placeIds = resolvedPlaceId ? [resolvedPlaceId] : [];
  const factIds = collectTurnFactIds(turn);
  const consequences = turn.visiblePatch.knownFacts.add.map((f) => f.text);
  const questions = isInvestigativeInquiry(turn.playerAction)
    ? [turn.playerAction.trim()]
    : [];
  const gmDevs = collectGmDevelopments(turn, session, commitmentIds);
  return {
    ...thread,
    topicTokens: pushBoundedUnique(
      thread.topicTokens,
      tokens,
      MAX_THREAD_TOKENS,
    ),
    linkedPersonIds: pushBoundedUnique(
      thread.linkedPersonIds,
      personIds,
      MAX_THREAD_IDS,
    ),
    linkedPlaceIds: pushBoundedUnique(
      thread.linkedPlaceIds,
      placeIds,
      MAX_THREAD_IDS,
    ),
    linkedFactIds: pushBoundedUnique(
      thread.linkedFactIds,
      factIds,
      MAX_THREAD_FACTS,
    ),
    linkedCommitmentIds: pushBoundedUnique(
      thread.linkedCommitmentIds,
      commitmentIds,
      MAX_THREAD_IDS,
    ),
    openQuestions: pushBoundedUnique(
      thread.openQuestions,
      questions,
      MAX_THREAD_QUESTIONS,
    ),
    knownConsequences: pushBoundedUnique(
      thread.knownConsequences,
      consequences,
      MAX_THREAD_CONSEQUENCES,
    ),
    gmOnlyDevelopments: pushBoundedUnique(
      thread.gmOnlyDevelopments,
      gmDevs,
      MAX_THREAD_GM_DEVS,
    ),
    updatedAtTurnId: turn.id,
    turnCount: thread.turnCount + 1,
  };
}

function collectSeedAnchorTokens(
  session: AdventureSession,
  currentTokens: readonly string[],
): Set<string> {
  const anchor = new Set<string>(currentTokens);
  for (const obj of session.visibleState.objectives) {
    const objTokens = [...threadTopicWords(obj.text)];
    if (countOverlap(objTokens, currentTokens) >= 1) {
      for (const t of objTokens) anchor.add(t);
    }
  }
  return anchor;
}

function bootstrapEmergentThreadFromHistory(
  session: AdventureSession,
  currentTurn: CommittedAdventureTurn,
  currentTokens: readonly string[],
  currentFacts: readonly ProvisionalFact[],
  createId: () => string,
): EmergentThread | undefined {
  const priorTurns = session.turns
    .filter((t) => t.id !== currentTurn.id)
    .slice(-12);
  if (priorTurns.length === 0) return undefined;

  const anchorTokens = collectSeedAnchorTokens(session, currentTokens);
  const related = priorTurns.filter((prev) => {
    const prevFacts = session.provisionalFacts.filter((f) =>
      prev.provisionalFactIds.includes(f.id),
    );
    const prevTokens = collectTurnTopicTokens(prev, prevFacts);
    return countOverlap(prevTokens, [...anchorTokens]) >= 1;
  });
  if (related.length === 0) return undefined;

  const hasOoc = (session.oocExchanges ?? []).some(
    (ooc) =>
      ooc.status === "answered" &&
      ooc.classification === "established" &&
      countOverlap([...threadTopicWords(ooc.question)], [...anchorTokens]) >= 1,
  );
  let seeded: EmergentThread = {
    id: createId(),
    title: deriveThreadTitle(session, currentTurn, currentFacts, [
      ...anchorTokens,
    ]),
    status: "open",
    provenance: hasOoc ? "mixed" : "play",
    topicTokens: [...anchorTokens].slice(0, MAX_THREAD_TOKENS),
    linkedPersonIds: [],
    linkedPlaceIds: [],
    linkedFactIds: [],
    linkedCommitmentIds: [],
    openQuestions: [],
    knownConsequences: [],
    gmOnlyDevelopments: [],
    createdAtTurnId: related[0]!.id,
    updatedAtTurnId: related[0]!.id,
    turnCount: 0,
  };
  for (const prev of related) {
    const prevFacts = session.provisionalFacts.filter((f) =>
      prev.provisionalFactIds.includes(f.id),
    );
    const prevTokens = collectTurnTopicTokens(prev, prevFacts);
    const prevPersons = collectTurnPersonIds(prev, session);
    const prevCommits = collectTurnCommitmentIds(prev, session);
    const prevPlaceId = prev.visiblePatch.location?.placeId;
    seeded = mergeIntoThread(
      seeded,
      prev,
      session,
      prevTokens,
      prevPersons,
      prevCommits,
      prevPlaceId,
    );
  }
  return seeded;
}

/**
 * Deterministically tracks substantive player-led investigations as durable
 * emergent threads, isolated from seeded scenarios and casual chatter.
 */
export function updateEmergentThreadsOnTurn(
  session: AdventureSession,
  turn: CommittedAdventureTurn,
  createId: () => string,
): EmergentThread[] {
  const existing = [...(session.emergentThreads ?? [])];
  const facts = session.provisionalFacts.filter((f) =>
    turn.provisionalFactIds.includes(f.id),
  );
  const commitmentIds = collectTurnCommitmentIds(turn, session);
  if (!isSubstantiveTurn(turn, facts, commitmentIds)) return existing;

  const tokens = collectTurnTopicTokens(turn, facts);
  const personIds = collectTurnPersonIds(turn, session);
  const factIds = collectTurnFactIds(turn);
  const matched =
    findBestMatchingThread(existing, tokens, personIds, factIds) ??
    findContinuationThread(existing, session, turn, tokens, personIds, facts);
  if (matched) {
    const updated = mergeIntoThread(
      matched,
      turn,
      session,
      tokens,
      personIds,
      commitmentIds,
    );
    return existing.map((t) => (t.id === matched.id ? updated : t));
  }

  if (
    existing.length >= MAX_EMERGENT_THREADS ||
    !hasEmergenceThreshold(session, turn, tokens, facts, commitmentIds)
  ) {
    return existing;
  }

  const bootstrapped =
    existing.length === 0
      ? bootstrapEmergentThreadFromHistory(
          session,
          turn,
          tokens,
          facts,
          createId,
        )
      : undefined;
  const baseThread: EmergentThread = bootstrapped ?? {
    id: createId(),
    title: deriveThreadTitle(session, turn, facts, tokens),
    status: "open",
    provenance: "play",
    topicTokens: [],
    linkedPersonIds: [],
    linkedPlaceIds: [],
    linkedFactIds: [],
    linkedCommitmentIds: [],
    openQuestions: [],
    knownConsequences: [],
    gmOnlyDevelopments: [],
    createdAtTurnId: turn.id,
    updatedAtTurnId: turn.id,
    turnCount: 0,
  };
  const created = mergeIntoThread(
    baseThread,
    turn,
    session,
    tokens,
    personIds,
    commitmentIds,
  );
  return [...existing, created];
}

/** Attaches OOC-established facts to a matching open emergent thread. */
export function syncEmergentThreadsFromOoc(
  session: AdventureSession,
  exchange: AdventureOocExchange,
  committedFactIds: readonly string[],
): EmergentThread[] | undefined {
  const existing = session.emergentThreads;
  if (!existing?.length || committedFactIds.length === 0) return existing;
  const tokens = [
    ...threadTopicWords(`${exchange.question} ${exchange.answer ?? ""}`),
  ];
  const matched = findBestMatchingThread(
    existing,
    tokens,
    [],
    committedFactIds,
  );
  if (!matched) return existing;
  const updated: EmergentThread = {
    ...matched,
    provenance: matched.provenance === "play" ? "mixed" : matched.provenance,
    topicTokens: pushBoundedUnique(
      matched.topicTokens,
      tokens,
      MAX_THREAD_TOKENS,
    ),
    linkedFactIds: pushBoundedUnique(
      matched.linkedFactIds,
      committedFactIds,
      MAX_THREAD_FACTS,
    ),
  };
  return existing.map((t) => (t.id === matched.id ? updated : t));
}

export function setFocusedEmergentThread(
  session: AdventureSession,
  threadId: string | null,
): AdventureSession {
  if (
    threadId !== null &&
    !(session.emergentThreads ?? []).some((t) => t.id === threadId)
  ) {
    return session;
  }
  return { ...session, focusedEmergentThreadId: threadId };
}

export function updateEmergentThreadStatus(
  session: AdventureSession,
  threadId: string,
  status: EmergentThreadStatus,
): AdventureSession {
  const threads = session.emergentThreads ?? [];
  if (!threads.some((t) => t.id === threadId)) return session;
  const nextThreads = threads.map((t) =>
    t.id === threadId ? { ...t, status } : t,
  );
  const clearFocus =
    status !== "open" && session.focusedEmergentThreadId === threadId;
  return {
    ...session,
    emergentThreads: nextThreads,
    ...(clearFocus ? { focusedEmergentThreadId: null } : {}),
  };
}

export function linkEmergentThreadToScenario(
  session: AdventureSession,
  threadId: string,
  scenarioId: string,
): AdventureSession {
  const threads = session.emergentThreads ?? [];
  const hasScenario = (session.scenarioCollection?.items ?? []).some(
    (item) => item.id === scenarioId,
  );
  if (!hasScenario || !threads.some((t) => t.id === threadId)) return session;
  return {
    ...session,
    emergentThreads: threads.map((t) =>
      t.id === threadId ? { ...t, linkedScenarioId: scenarioId } : t,
    ),
  };
}

/**
 * Selects the emergent thread actively pursued by `effectiveAction` (or
 * rehydrated on reload when no unrelated free-play pivot is occurring).
 */
export function selectPursuedEmergentThread(
  session: AdventureSession,
  effectiveAction?: string,
): EmergentThread | undefined {
  const openThreads = (session.emergentThreads ?? []).filter(
    (t) => t.status === "open",
  );
  if (openThreads.length === 0) return undefined;

  if (effectiveAction) {
    const actionTokens = [...threadTopicWords(effectiveAction)];
    const matched = findBestMatchingThread(openThreads, actionTokens, [], []);
    if (matched) return matched;
    if (EXPLORE_PIVOT_RE.test(effectiveAction.trim())) return undefined;
    if (!session.focusedEmergentThreadId) return undefined;
    return openThreads.find((t) => t.id === session.focusedEmergentThreadId);
  }

  if (session.focusedEmergentThreadId) {
    const focused = openThreads.find(
      (t) => t.id === session.focusedEmergentThreadId,
    );
    if (focused) return focused;
  }
  return openThreads.at(-1);
}

/** Spoiler-safe player projection stripping `gmOnlyDevelopments`. */
export function projectPlayerEmergentThreads(session: AdventureSession) {
  return (session.emergentThreads ?? []).map(
    ({ gmOnlyDevelopments: _gmOnly, ...playerSafe }) => playerSafe,
  );
}
