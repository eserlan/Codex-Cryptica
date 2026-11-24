import { MAX_SERIALIZED_STATE_CHARS } from "./session-budget";

/**
 * Target ceiling for `baseState` before the GM-only Director brief is added,
 * leaving headroom under `MAX_SERIALIZED_STATE_CHARS` (48k).
 */
export const HOT_COMPACTION_TARGET_CHARS = 38_000;
const HOT_FACT_RECENT_FULL = 16;
const HOT_FACT_BRIEF_CHARS = 160;
const HOT_SCENARIO_RECENT_EVENTS = 8;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clipText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

function compactColdPlayerScenario(item: unknown): unknown {
  if (!isRecord(item) || !Array.isArray(item.events)) return item;
  const status = item.status;
  if (status !== "resolved" && status !== "abandoned") {
    if (item.events.length > HOT_SCENARIO_RECENT_EVENTS) {
      return {
        ...item,
        events: item.events.slice(-HOT_SCENARIO_RECENT_EVENTS),
        earlierEventsOmitted: item.events.length - HOT_SCENARIO_RECENT_EVENTS,
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
    ...(item.knowledge !== undefined ? { knowledge: item.knowledge } : {}),
    focused: false,
    ...(item.stage !== undefined ? { stage: item.stage } : {}),
    revealedSecretIds: item.revealedSecretIds,
    hiddenEventCount: hiddenEvents.length,
    ...(latestHiddenEvent ? { latestHiddenEvent } : {}),
  };
}

function compactGmScenario(item: unknown): unknown {
  if (!isRecord(item) || !Array.isArray(item.hiddenEvents)) return item;
  const isCold = item.status === "resolved" || item.status === "abandoned";
  if (isCold && item.focused !== true) {
    return summarizeColdGmScenario(item, item.hiddenEvents);
  }
  if (item.hiddenEvents.length <= HOT_SCENARIO_RECENT_EVENTS) return item;
  return {
    ...item,
    hiddenEvents: item.hiddenEvents.slice(-HOT_SCENARIO_RECENT_EVENTS),
    earlierHiddenEventsOmitted:
      item.hiddenEvents.length - HOT_SCENARIO_RECENT_EVENTS,
  };
}

function compactRevealedSecrets(gmState: unknown): unknown {
  if (!isRecord(gmState)) return gmState;
  const secrets = Array.isArray(gmState.secrets) ? gmState.secrets : undefined;
  if (!secrets) return gmState;
  return {
    ...gmState,
    secrets: secrets.map((secret) => {
      if (!isRecord(secret) || secret.status !== "revealed") return secret;
      return {
        id: secret.id,
        status: "revealed",
        ...(secret.revealedOnTurnId !== undefined
          ? { revealedOnTurnId: secret.revealedOnTurnId }
          : {}),
      };
    }),
  };
}

function compactFactList(facts: unknown): unknown {
  if (!Array.isArray(facts) || facts.length <= HOT_FACT_RECENT_FULL) {
    return facts;
  }
  const cutoff = facts.length - HOT_FACT_RECENT_FULL;
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
        text: clipText(entry.text, HOT_FACT_BRIEF_CHARS),
      });
    } else {
      seen.add(normalized);
      compacted.push(entry);
    }
  }
  return compacted;
}

function compactVisibleState(visible: unknown): unknown {
  if (!isRecord(visible)) return visible;
  return {
    ...visible,
    ...(Array.isArray(visible.knownFacts)
      ? { knownFacts: compactFactList(visible.knownFacts) }
      : {}),
    ...(Array.isArray(visible.activeCharacters)
      ? { activeCharacters: compactFactList(visible.activeCharacters) }
      : {}),
    ...(Array.isArray(visible.objectives)
      ? { objectives: compactFactList(visible.objectives) }
      : {}),
    ...(Array.isArray(visible.relationships)
      ? { relationships: compactFactList(visible.relationships) }
      : {}),
  };
}

/**
 * Deterministically and idempotently compacts a projected prompt `baseState`
 * when it exceeds `triggerChars` (default `MAX_SERIALIZED_STATE_CHARS`),
 * reducing it toward `targetChars` without mutating the durable `AdventureSession`.
 * Preserves active secrets, current facts, and provenance IDs.
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

  let next: JsonRecord = { ...baseState };

  // Step 1: Compact cold scenarios and cap active scenario hidden events.
  if (
    isRecord(next.playerScenarios) &&
    Array.isArray(next.playerScenarios.items)
  ) {
    next = {
      ...next,
      playerScenarios: {
        ...next.playerScenarios,
        items: next.playerScenarios.items.map(compactColdPlayerScenario),
      },
    };
  }
  if (Array.isArray(next["GM-ONLY scenarios"])) {
    next = {
      ...next,
      "GM-ONLY scenarios": next["GM-ONLY scenarios"].map(compactGmScenario),
    };
  }
  if (JSON.stringify(next).length <= targetChars) {
    return next as T;
  }

  // Step 2: Compact already-revealed secrets in GM-ONLY state (keep active hidden secrets in full).
  if ("GM-ONLY state" in next) {
    next = {
      ...next,
      "GM-ONLY state": compactRevealedSecrets(next["GM-ONLY state"]),
    };
  }
  if (JSON.stringify(next).length <= targetChars) {
    return next as T;
  }

  // Step 3: Deduplicate and clip older visible-state facts while keeping recent items in full.
  if ("playerVisibleState" in next) {
    next = {
      ...next,
      playerVisibleState: compactVisibleState(next.playerVisibleState),
    };
  }

  return next as T;
}
