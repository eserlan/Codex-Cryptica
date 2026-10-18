import { getDB } from "../utils/idb";
import type { RollResult } from "dice-engine";
import { appEventBus, type AppEventBus } from "@codex/events";
import { JOURNAL_EVENTS, buildCaptureFromRoll } from "session-journal-engine";
import {
  type Clock,
  type IdGenerator,
  systemClock,
  systemIdGenerator,
} from "$lib/utils/runtime-deps";

/**
 * A roll or draw sourced from a random table or card deck (#2247).
 *
 * Additive: `dice_history` is keyed by id with no index over this field, so
 * carrying it needs no IndexedDB version bump.
 */
export interface RandomSourceRollPayload {
  sourceId: string;
  sourceName: string;
  kind: "table" | "deck";
  finalText: string;
  /** Which sub-table produced which fragment, for the resolution chain view. */
  chain?: unknown[];
  drawnCards?: Array<{
    cardId: string;
    title: string;
    reversed: boolean;
    imagePath?: string;
    body?: string;
  }>;
  spreadPositions?: Array<{ label: string; cardId: string }>;
}

export interface ContextualRollResult extends RollResult {
  id: string;
  context: "chat" | "modal" | "table";
  label?: string;
  /** Present when the entry came from a table roll or deck draw. */
  source?: RandomSourceRollPayload;
}

export class DiceHistoryStore {
  history = $state<ContextualRollResult[]>([]);
  private _initStarted = false;
  private idGenerator: IdGenerator;
  private bus: AppEventBus;
  private clock: Clock;

  constructor(
    idGenerator: IdGenerator = systemIdGenerator,
    bus: AppEventBus = appEventBus,
    clock: Clock = systemClock,
  ) {
    this.idGenerator = idGenerator;
    this.bus = bus;
    this.clock = clock;
    // Auto-initialize on the client so persisted history is available
    if (typeof window !== "undefined") {
      void this.init();
    }
  }

  async init(force = false) {
    if (this._initStarted && !force) {
      return;
    }
    this._initStarted = true;

    try {
      const db = await getDB();
      const all = await db.getAll("dice_history");
      const sorted = all.sort((a, b) => a.timestamp - b.timestamp);

      // Only set from DB if no in-memory history exists yet, to avoid clobbering
      if (this.history.length === 0 && sorted.length > 0) {
        this.history = sorted;
      }
    } catch (e) {
      console.error("[DiceHistory] Failed to load history:", e);
    }
  }

  async addResult(
    result: RollResult,
    context: "chat" | "modal" | "table",
    metadata?: { label?: string; source?: RandomSourceRollPayload },
  ) {
    const id = this.idGenerator.uuid();
    const contextual: ContextualRollResult = {
      ...result,
      id,
      context,
      ...metadata,
    };

    this.history.push(contextual);
    this.publishJournalCapture(contextual);

    // Persist
    const db = await getDB();
    await db.put("dice_history", contextual);

    // Limit history size (last 100 rolls)
    if (this.history.length > 100) {
      const removed = this.history.shift();
      if (removed) {
        await db.delete("dice_history", removed.id);
      }
    }
  }

  /**
   * Every roll, table result and deck draw passes through here, so this is
   * the one place that tells the Session Journal about them (#3408). The
   * event is local to this tab: it never sets `metadata.sync` (FR-031). A
   * failure here must never reach the roll itself (FR-030).
   */
  private publishJournalCapture(roll: ContextualRollResult): void {
    try {
      const payload = buildCaptureFromRoll(roll);
      if (!payload) return;
      this.bus.emit({
        type: JOURNAL_EVENTS.CAPTURE,
        domain: "journal",
        payload,
        metadata: { timestamp: this.clock.now() },
      });
    } catch (error) {
      console.error("[DiceHistory] Could not publish journal capture:", error);
    }
  }

  chatHistory = $derived(this.history.filter((r) => r.context === "chat"));
  /**
   * The die roller's log, which carries table rolls and deck draws alongside
   * ordinary rolls: the roller is where a GM looks for what they just got, and
   * splitting the two would hide half the answer (#2247, FR-018).
   */
  modalHistory = $derived(
    this.history.filter((r) => r.context === "modal" || r.context === "table"),
  );

  /** Clears one context, several, or — with no argument — the whole history. */
  async clearHistory(
    context?:
      ContextualRollResult["context"] | ContextualRollResult["context"][],
  ) {
    const db = await getDB();
    if (!context) {
      this.history = [];
      await db.clear("dice_history");
    } else {
      const contexts = new Set(Array.isArray(context) ? context : [context]);
      const toRemove: ContextualRollResult[] = [];
      const newHistory: ContextualRollResult[] = [];

      for (const r of this.history) {
        if (contexts.has(r.context)) {
          toRemove.push(r);
        } else {
          newHistory.push(r);
        }
      }

      this.history = newHistory;

      const tx = db.transaction("dice_history", "readwrite");
      for (const r of toRemove) {
        await tx.store.delete(r.id);
      }
      await tx.done;
    }
  }
}

export const diceHistory = new DiceHistoryStore();
