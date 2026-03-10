import { getDB } from "../utils/idb";
import type { RollResult } from "dice-engine";

export interface ContextualRollResult extends RollResult {
  id: string;
  context: "chat" | "modal";
}

class DiceHistoryStore {
  history = $state<ContextualRollResult[]>([]);
  private _initStarted = false;

  constructor() {
    // Auto-initialize on the client so persisted history is available
    if (typeof window !== "undefined") {
      void this.init();
    }
  }

  async init() {
    if (this._initStarted) {
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

  async addResult(result: RollResult, context: "chat" | "modal") {
    const id = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15);
    const contextual: ContextualRollResult = {
      ...result,
      id,
      context,
    };

    this.history.push(contextual);

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

  chatHistory = $derived(this.history.filter((r) => r.context === "chat"));
  modalHistory = $derived(this.history.filter((r) => r.context === "modal"));

  async clearHistory(context?: "chat" | "modal") {
    const db = await getDB();
    if (!context) {
      this.history = [];
      await db.clear("dice_history");
    } else {
      const toRemove = this.history.filter((r) => r.context === context);
      this.history = this.history.filter((r) => r.context !== context);
      for (const r of toRemove) {
        await db.delete("dice_history", r.id);
      }
    }
  }
}

export const diceHistory = new DiceHistoryStore();
