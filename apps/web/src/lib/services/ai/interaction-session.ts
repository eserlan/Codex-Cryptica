/**
 * Per-conversation state for the Gemini Interactions API flow.
 *
 * Holds, per conversation, the last `previous_interaction_id` and a
 * {@link LoreDeltaTracker}. State is in-memory only: on reload conversations
 * restart and lore re-syncs (see ADR 018). The proxy path consults this to send
 * only new/changed lore and to thread server-side conversation state.
 */
import {
  LoreDeltaTracker,
  type LoreEntry,
  type LorePartition,
} from "./lore-delta-tracker";
import { appEventBus } from "@codex/events";

/**
 * Feature flag for the Interactions API path. Off by default — rollout is
 * staged (plan Phase 6.1). When false, oracle chat uses the stateless flow.
 */
export let interactionsEnabled = false;

/** Toggle the Interactions API path (used by rollout flag / tests). */
export function setInteractionsEnabled(value: boolean): void {
  interactionsEnabled = value;
  if (value) registerLoreInvalidation();
}

export interface InteractionSession {
  previousInteractionId: string | null;
  tracker: LoreDeltaTracker;
}

const sessions = new Map<string, InteractionSession>();

export function getSession(conversationId: string): InteractionSession {
  let s = sessions.get(conversationId);
  if (!s) {
    s = { previousInteractionId: null, tracker: new LoreDeltaTracker() };
    sessions.set(conversationId, s);
  }
  return s;
}

/** Drop a conversation's server-side state (expiry/replay or explicit reset). */
export function resetSession(conversationId: string): void {
  const s = sessions.get(conversationId);
  if (s) {
    s.previousInteractionId = null;
    s.tracker.reset();
  }
}

/** Clear all sessions (e.g. on vault switch). */
export function clearAllSessions(): void {
  sessions.clear();
}

/**
 * Evict a single record across every conversation so it is re-sent next turn.
 * Driven by vault change events (Phase 5.1) as a proactive complement to the
 * per-turn body hashing.
 */
export function evictEntity(entityId: string): void {
  for (const s of sessions.values()) s.tracker.evict(entityId);
}

/**
 * Subscribe to vault change events so server-side lore is invalidated promptly:
 * updated/deleted entities and changed connections are evicted; a vault switch
 * or delete drops all sessions (restart-on-major-change, Phase 5.1/5.2).
 *
 * Idempotent and best-effort — safe to call at module load. Returns an
 * unsubscribe function.
 */
let invalidationUnsub: (() => void) | null = null;
export function registerLoreInvalidation(): () => void {
  if (invalidationUnsub) return invalidationUnsub;
  try {
    invalidationUnsub = appEventBus.subscribe("vault:*", (event: any) => {
      switch (event.type) {
        case "VAULT:ENTITY_UPDATED":
          if (event.payload?.id) evictEntity(event.payload.id);
          break;
        case "VAULT:ENTITY_DELETED":
          if (event.payload?.entityId) evictEntity(event.payload.entityId);
          break;
        case "VAULT:CONNECTION_ADDED":
        case "VAULT:CONNECTION_UPDATED":
        case "VAULT:CONNECTION_REMOVED":
          if (event.payload?.sourceId) evictEntity(event.payload.sourceId);
          if (event.payload?.targetId) evictEntity(event.payload.targetId);
          break;
        case "VAULT:SYNC_CHUNK_READY":
          for (const id of event.payload?.newOrChangedIds ?? [])
            evictEntity(id);
          break;
        case "VAULT:VAULT_SWITCHED":
        case "VAULT:VAULT_DELETED":
          clearAllSessions();
          break;
      }
    });
  } catch {
    invalidationUnsub = () => {};
  }
  return invalidationUnsub;
}

const TITLE_RE = /^---\s*(?:\[ACTIVE FILE\]\s*)?File:\s*(.+?)\s*---/m;

/** Best-effort extraction of a record's title from its snippet header. */
function titleOf(entry: LoreEntry): string | null {
  if (entry.id === "__style__") return null;
  const m = TITLE_RE.exec(entry.snippet);
  return m ? m[1] : null;
}

/**
 * Build the `input` for an interaction turn: the user query, the new/changed
 * lore snippets, and a lightweight relevance hint naming unchanged-but-relevant
 * records (whose bodies the server already holds).
 */
export function buildInteractionInput(
  query: string,
  partition: LorePartition,
): string {
  const blocks: string[] = [];

  if (partition.newOrChanged.length > 0) {
    blocks.push(
      "[VAULT LORE CONTEXT]\n" +
        partition.newOrChanged.map((e) => e.snippet).join("\n\n"),
    );
  }

  const hintTitles = partition.unchanged
    .map(titleOf)
    .filter((t): t is string => !!t);
  if (hintTitles.length > 0) {
    blocks.push(
      `[RELEVANT EARLIER RECORDS] ${hintTitles.join(", ")} (already provided above).`,
    );
  }

  blocks.push(`[USER QUERY]\n${query}`);
  return blocks.join("\n\n");
}
