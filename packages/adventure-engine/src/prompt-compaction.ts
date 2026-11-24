import { MAX_SERIALIZED_STATE_CHARS } from "./session-budget";

/**
 * Target ceiling for `baseState` before the GM-only Director brief is added,
 * leaving headroom under `MAX_SERIALIZED_STATE_CHARS` (48k).
 */
export const HOT_COMPACTION_TARGET_CHARS = 38_000;
const HOT_FACT_RECENT_FULL = 16;
const HOT_FACT_TIGHT_FULL = 8;
const HOT_FACT_BRIEF_CHARS = 160;
const HOT_FACT_TIGHT_CHARS = 100;
const HOT_SCENARIO_RECENT_EVENTS = 8;
const HOT_SCENARIO_TIGHT_EVENTS = 4;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clipText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

function compactColdPlayerScenario(
  item: unknown,
  recentEvents = HOT_SCENARIO_RECENT_EVENTS,
): unknown {
  if (!isRecord(item) || !Array.isArray(item.events)) return item;
  const status = item.status;
  if (status !== "resolved" && status !== "abandoned") {
    if (item.events.length > recentEvents) {
      return {
        ...item,
        events: item.events.slice(-recentEvents),
        earlierEventsOmitted: item.events.length - recentEvents,
      };
    }
    return item;
  }
  const latest = item.events.at(-1);
  return {
    id: item.id,
    status,
    ...(item.knowledge !== undefined ? { knowledge: item.knowledge } : {}),
    ...(typeof item.playerVisible === "string"
      ? { playerVisible: clipText(item.playerVisible, HOT_FACT_BRIEF_CHARS) }
      : {}),
    eventCount: item.events.length,
    ...(latest ? { latestEvent: latest } : {}),
  };
}

function summarizeColdGmScenario(
  item: JsonRecord,
  hiddenEvents: unknown[],
): JsonRecord {
  const latestHiddenEvent = hiddenEvents.at(-1);
  return {
    id: item.id,
    status: item.status,
    ...(item.anchorRefs !== undefined ? { anchorRefs: item.anchorRefs } : {}),
    ...(item.knowledge !== undefined ? { knowledge: item.knowledge } : {}),
    focused: false,
    ...(item.stage !== undefined ? { stage: item.stage } : {}),
    ...(item.origin !== undefined ? { origin: item.origin } : {}),
    ...(item.baselineTruth !== undefined
      ? { baselineTruth: item.baselineTruth }
      : {}),
    ...(item.secretBindings !== undefined
      ? { secretBindings: item.secretBindings }
      : {}),
    revealedSecretIds: item.revealedSecretIds,
    hiddenEventCount: hiddenEvents.length,
    ...(latestHiddenEvent ? { latestHiddenEvent } : {}),
  };
}

function compactGmScenario(
  item: unknown,
  recentEvents = HOT_SCENARIO_RECENT_EVENTS,
): unknown {
  if (!isRecord(item) || !Array.isArray(item.hiddenEvents)) return item;
  const isCold = item.status === "resolved" || item.status === "abandoned";
  if (isCold && item.focused !== true) {
    return summarizeColdGmScenario(item, item.hiddenEvents);
  }
  if (item.hiddenEvents.length <= recentEvents) return item;
  return {
    ...item,
    hiddenEvents: item.hiddenEvents.slice(-recentEvents),
    earlierHiddenEventsOmitted: item.hiddenEvents.length - recentEvents,
  };
}

function collectVisibleTextSet(visible: unknown): {
  texts: Set<string>;
  sourceRecordIds: Set<string>;
} {
  const texts = new Set<string>();
  const sourceRecordIds = new Set<string>();
  if (!isRecord(visible)) return { texts, sourceRecordIds };

  const recordFact = (entry: unknown) => {
    if (!isRecord(entry)) return;
    if (typeof entry.text === "string" && entry.text.trim().length > 0) {
      texts.add(entry.text.trim().toLowerCase());
    }
    if (typeof entry.sourceRecordId === "string") {
      sourceRecordIds.add(entry.sourceRecordId);
    }
  };

  recordFact(visible.location);
  recordFact(visible.situation);
  for (const key of [
    "knownFacts",
    "activeCharacters",
    "objectives",
    "relationships",
  ] as const) {
    const list = visible[key];
    if (Array.isArray(list)) {
      for (const entry of list) recordFact(entry);
    }
  }
  return { texts, sourceRecordIds };
}

function compactRevealedSecrets(
  gmState: unknown,
  visibleCopy: { texts: Set<string>; sourceRecordIds: Set<string> },
  maxTextChars?: number,
): unknown {
  if (!isRecord(gmState)) return gmState;
  const secrets = Array.isArray(gmState.secrets) ? gmState.secrets : undefined;
  if (!secrets) return gmState;
  return {
    ...gmState,
    secrets: secrets.map((secret) => {
      if (!isRecord(secret) || secret.status !== "revealed") return secret;
      const hasVisibleCopy =
        (typeof secret.id === "string" &&
          visibleCopy.sourceRecordIds.has(secret.id)) ||
        (typeof secret.text === "string" &&
          visibleCopy.texts.has(secret.text.trim().toLowerCase()));
      const retainedText =
        !hasVisibleCopy && typeof secret.text === "string"
          ? maxTextChars !== undefined
            ? clipText(secret.text, maxTextChars)
            : secret.text
          : undefined;
      return {
        id: secret.id,
        status: "revealed",
        ...(secret.revealedOnTurnId !== undefined
          ? { revealedOnTurnId: secret.revealedOnTurnId }
          : {}),
        ...(retainedText !== undefined ? { text: retainedText } : {}),
      };
    }),
  };
}

function compactFactList(
  facts: unknown,
  recentFull = HOT_FACT_RECENT_FULL,
  briefChars = HOT_FACT_BRIEF_CHARS,
): unknown {
  if (!Array.isArray(facts) || facts.length <= recentFull) {
    return facts;
  }
  const cutoff = facts.length - recentFull;
  const seen = new Set<string>();
  const compacted: unknown[] = [];
  for (let i = 0; i < facts.length; i += 1) {
    const entry = facts[i];
    if (!isRecord(entry) || typeof entry.text !== "string") {
      compacted.push(entry);
      continue;
    }
    const normalized = entry.text.trim().toLowerCase();
    if (i < cutoff) {
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      compacted.push({
        ...entry,
        text: clipText(entry.text, briefChars),
      });
    } else {
      seen.add(normalized);
      compacted.push(entry);
    }
  }
  return compacted;
}

function compactVisibleState(
  visible: unknown,
  recentFull = HOT_FACT_RECENT_FULL,
  briefChars = HOT_FACT_BRIEF_CHARS,
): unknown {
  if (!isRecord(visible)) return visible;
  return {
    ...visible,
    ...(Array.isArray(visible.knownFacts)
      ? {
          knownFacts: compactFactList(
            visible.knownFacts,
            recentFull,
            briefChars,
          ),
        }
      : {}),
    ...(Array.isArray(visible.activeCharacters)
      ? {
          activeCharacters: compactFactList(
            visible.activeCharacters,
            recentFull,
            briefChars,
          ),
        }
      : {}),
    ...(Array.isArray(visible.objectives)
      ? {
          objectives: compactFactList(
            visible.objectives,
            recentFull,
            briefChars,
          ),
        }
      : {}),
    ...(Array.isArray(visible.relationships)
      ? {
          relationships: compactFactList(
            visible.relationships,
            recentFull,
            briefChars,
          ),
        }
      : {}),
  };
}

function compactProvisionalFacts(
  facts: unknown,
  recentFull = HOT_FACT_RECENT_FULL,
  briefChars = HOT_FACT_BRIEF_CHARS,
): unknown {
  if (!Array.isArray(facts)) return facts;
  const activeIndices: number[] = [];
  for (let i = 0; i < facts.length; i += 1) {
    const entry = facts[i];
    if (
      !isRecord(entry) ||
      typeof entry.supersededById !== "string" ||
      entry.supersededById.length === 0
    ) {
      activeIndices.push(i);
    }
  }
  const activeCutoff = Math.max(0, activeIndices.length - recentFull);
  const fullActiveSet = new Set(activeIndices.slice(activeCutoff));

  return facts.map((entry, index) => {
    if (!isRecord(entry)) return entry;
    if (
      typeof entry.supersededById === "string" &&
      entry.supersededById.length > 0
    ) {
      return {
        id: entry.id,
        kind: entry.kind,
        ...(typeof entry.name === "string"
          ? { name: clipText(entry.name, briefChars) }
          : {}),
        supersededById: entry.supersededById,
        ...(entry.visibility !== undefined
          ? { visibility: entry.visibility }
          : {}),
        ...(entry.provenance !== undefined
          ? { provenance: entry.provenance }
          : {}),
        ...(entry.introducedOnTurnId !== undefined
          ? { introducedOnTurnId: entry.introducedOnTurnId }
          : {}),
        ...(entry.sourceOocExchangeId !== undefined
          ? { sourceOocExchangeId: entry.sourceOocExchangeId }
          : {}),
        ...(entry.scenarioId !== undefined
          ? { scenarioId: entry.scenarioId }
          : {}),
      };
    }
    if (fullActiveSet.has(index)) {
      return entry;
    }
    return {
      ...entry,
      ...(typeof entry.name === "string"
        ? { name: clipText(entry.name, briefChars) }
        : {}),
      ...(typeof entry.summary === "string"
        ? { summary: clipText(entry.summary, briefChars) }
        : {}),
    };
  });
}

function applyScenarioCompaction(
  state: JsonRecord,
  recentEvents: number,
): JsonRecord {
  let next = state;
  if (
    isRecord(next.playerScenarios) &&
    Array.isArray(next.playerScenarios.items)
  ) {
    next = {
      ...next,
      playerScenarios: {
        ...next.playerScenarios,
        items: next.playerScenarios.items.map((item) =>
          compactColdPlayerScenario(item, recentEvents),
        ),
      },
    };
  }
  if (Array.isArray(next["GM-ONLY scenarios"])) {
    next = {
      ...next,
      "GM-ONLY scenarios": next["GM-ONLY scenarios"].map((item) =>
        compactGmScenario(item, recentEvents),
      ),
    };
  }
  return next;
}

/**
 * Deterministically and idempotently compacts a projected prompt `baseState`
 * when it exceeds `triggerChars` (default `MAX_SERIALIZED_STATE_CHARS`),
 * reducing it toward `targetChars` without mutating the durable `AdventureSession`.
 * Preserves active secrets, scenario baselineTruth/bindings, revealed secret text
 * (unless an equivalent visible copy is present), and provisional-fact provenance IDs.
 */
export function compactHotPromptState<T extends JsonRecord>(
  baseState: T,
  targetChars = Math.min(
    HOT_COMPACTION_TARGET_CHARS,
    MAX_SERIALIZED_STATE_CHARS,
  ),
  triggerChars = MAX_SERIALIZED_STATE_CHARS,
): T {
  if (JSON.stringify(baseState).length <= triggerChars) {
    return baseState;
  }

  // Step 1: Compact cold scenarios (preserving baselineTruth & secretBindings) and cap active scenario events.
  let next: JsonRecord = applyScenarioCompaction(
    { ...baseState },
    HOT_SCENARIO_RECENT_EVENTS,
  );
  if (JSON.stringify(next).length <= targetChars) {
    return next as T;
  }

  // Step 2: Strip revealCondition on already-revealed secrets (and omit text only when verified in playerVisibleState).
  if ("GM-ONLY state" in next) {
    next = {
      ...next,
      "GM-ONLY state": compactRevealedSecrets(
        next["GM-ONLY state"],
        collectVisibleTextSet(next.playerVisibleState),
      ),
    };
  }
  if (JSON.stringify(next).length <= targetChars) {
    return next as T;
  }

  // Step 3: Compact older visible-state facts and provisional facts (superseded + older active).
  if ("playerVisibleState" in next) {
    next = {
      ...next,
      playerVisibleState: compactVisibleState(next.playerVisibleState),
    };
  }
  if (Array.isArray(next.provisionalFacts)) {
    next = {
      ...next,
      provisionalFacts: compactProvisionalFacts(next.provisionalFacts),
    };
  }
  if ("GM-ONLY state" in next) {
    // Re-sync revealed secret text against the compacted playerVisibleState so clipped facts don't drop secret text.
    next = {
      ...next,
      "GM-ONLY state": compactRevealedSecrets(
        baseState["GM-ONLY state"],
        collectVisibleTextSet(next.playerVisibleState),
      ),
    };
  }
  if (JSON.stringify(next).length <= targetChars) {
    return next as T;
  }

  // Step 4: Tighter hot-window fallback when both visible facts, provisional facts, and revealed secrets are large.
  next = applyScenarioCompaction(next, HOT_SCENARIO_TIGHT_EVENTS);
  if ("playerVisibleState" in next) {
    next = {
      ...next,
      playerVisibleState: compactVisibleState(
        next.playerVisibleState,
        HOT_FACT_TIGHT_FULL,
        HOT_FACT_TIGHT_CHARS,
      ),
    };
  }
  if (Array.isArray(next.provisionalFacts)) {
    next = {
      ...next,
      provisionalFacts: compactProvisionalFacts(
        next.provisionalFacts,
        HOT_FACT_TIGHT_FULL,
        HOT_FACT_TIGHT_CHARS,
      ),
    };
  }
  if (JSON.stringify(next).length <= targetChars) {
    return next as T;
  }
  if ("GM-ONLY state" in next) {
    next = {
      ...next,
      "GM-ONLY state": compactRevealedSecrets(
        next["GM-ONLY state"],
        collectVisibleTextSet(next.playerVisibleState),
        HOT_FACT_BRIEF_CHARS,
      ),
    };
  }

  return next as T;
}
