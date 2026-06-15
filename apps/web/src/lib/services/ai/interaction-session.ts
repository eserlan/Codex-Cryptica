/**
 * Per-conversation state manager for the Gemini Interactions API flow.
 *
 * Holds, per conversation, the last `previous_interaction_id` and a
 * {@link LoreDeltaTracker}. State is in-memory only: on reload conversations
 * restart and lore re-syncs (see ADR 018). The proxy path consults this to send
 * only new/changed lore and to thread server-side conversation state.
 *
 * Constructor-injected event bus (Constitution VIII) for testability; pure delta
 * logic lives in `@codex/oracle-engine` (Constitution I).
 */
import { LoreDeltaTracker } from "@codex/oracle-engine";

/** Minimal event-bus surface this manager depends on (for DI / mocking). */
export interface InvalidationBus {
  subscribe(
    filter: string,
    listener: (event: { type: string; payload?: any }) => void,
    name?: string,
  ): () => void;
}

export interface InteractionSession {
  previousInteractionId: string | null;
  tracker: LoreDeltaTracker;
}

export class InteractionSessionManager {
  /**
   * Whether the Interactions API path is enabled. Off by default — rollout is
   * staged (plan Phase 6.1). Read on the main thread and forwarded into the
   * worker via generateResponse options (the worker has its own module scope).
   */
  enabled = false;

  private sessions = new Map<string, InteractionSession>();
  private invalidationUnsub: (() => void) | null = null;

  constructor(private bus?: InvalidationBus) {}

  /** Toggle the Interactions API path; wires lore invalidation when enabling. */
  setEnabled(value: boolean): void {
    this.enabled = value;
    if (value) this.registerInvalidation();
  }

  getSession(conversationId: string): InteractionSession {
    let s = this.sessions.get(conversationId);
    if (!s) {
      s = { previousInteractionId: null, tracker: new LoreDeltaTracker() };
      this.sessions.set(conversationId, s);
    }
    return s;
  }

  /** Drop a conversation's server-side state (expiry/replay or explicit reset). */
  resetSession(conversationId: string): void {
    const s = this.sessions.get(conversationId);
    if (s) {
      s.previousInteractionId = null;
      s.tracker.reset();
    }
  }

  /** Clear all sessions (e.g. on vault switch). */
  clearAllSessions(): void {
    this.sessions.clear();
  }

  /**
   * Evict a single record across every conversation so it is re-sent next turn.
   * Driven by vault change events (Phase 5.1) as a proactive complement to the
   * per-turn body hashing.
   */
  evictEntity(entityId: string): void {
    for (const s of this.sessions.values()) s.tracker.evict(entityId);
  }

  /**
   * Subscribe to vault change events so server-side lore is invalidated promptly:
   * updated/deleted entities and changed connections are evicted; a vault switch
   * or delete drops all sessions (restart-on-major-change, Phase 5.1/5.2).
   * Idempotent and best-effort.
   *
   * NOTE: this only helps on the main thread. When oracle generation runs in a
   * Web Worker, vault events are emitted on the main thread while the worker's
   * sessions live in worker scope, so the worker's subscription never fires.
   * Correctness there relies on per-turn body hashing, which already re-detects
   * changed lore; this subscription is a main-thread optimization.
   */
  registerInvalidation(): () => void {
    if (this.invalidationUnsub) return this.invalidationUnsub;
    if (!this.bus) {
      this.invalidationUnsub = () => {};
      return this.invalidationUnsub;
    }
    try {
      this.invalidationUnsub = this.bus.subscribe(
        "vault:*",
        (event) => {
          switch (event.type) {
            case "VAULT:ENTITY_UPDATED":
              if (event.payload?.id) this.evictEntity(event.payload.id);
              break;
            case "VAULT:ENTITY_DELETED":
              if (event.payload?.entityId)
                this.evictEntity(event.payload.entityId);
              break;
            case "VAULT:CONNECTION_ADDED":
            case "VAULT:CONNECTION_UPDATED":
            case "VAULT:CONNECTION_REMOVED":
              if (event.payload?.sourceId)
                this.evictEntity(event.payload.sourceId);
              if (event.payload?.targetId)
                this.evictEntity(event.payload.targetId);
              break;
            case "VAULT:SYNC_CHUNK_READY":
              for (const id of event.payload?.newOrChangedIds ?? [])
                this.evictEntity(id);
              break;
            case "VAULT:VAULT_SWITCHED":
            case "VAULT:VAULT_DELETED":
              this.clearAllSessions();
              break;
          }
        },
        "interactions-lore-invalidation",
      );
    } catch {
      this.invalidationUnsub = () => {};
    }
    return this.invalidationUnsub;
  }

  /** Tear down the event subscription (tests / lifecycle). */
  destroy(): void {
    this.invalidationUnsub?.();
    this.invalidationUnsub = null;
  }
}

// Default production singleton, wired to the app event bus. Tests construct
// their own instance with a mock bus.
import { appEventBus } from "@codex/events";
export const interactionSessions = new InteractionSessionManager(
  appEventBus as unknown as InvalidationBus,
);
