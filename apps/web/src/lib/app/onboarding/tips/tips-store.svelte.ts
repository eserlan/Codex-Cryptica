import {
  actOnTip,
  decideTip,
  dismissTip,
  emptyTipsRecord,
  markOptInAsked,
  parseTipsRecord,
  serializeTipsRecord,
  setTipsEnabled,
  type Tip,
  type TipBlockers,
  type TipsRecord,
} from "onboarding-journey-engine";
import type { HelpArea } from "help-engine";
import type { StorageLike } from "#lib/utils/runtime-deps.js";
import type { TipContext } from "./tips-context";

export type { TipContext } from "./tips-context";

export const TIPS_KEY = "codex-cif-tips";
export const TIPS_SESSION_KEY = "codex-cif-tips-session";
/** Briefly written and removed to confirm a save would land; never kept. */
const TIPS_PROBE_KEY = "codex-cif-tips-probe";

export interface TipsStoreDeps {
  /** Device storage for the preference and history (`codex-cif-tips`). */
  storage: StorageLike;
  /** Browser-session storage for the one-tip-per-session marker. */
  sessionStorage: StorageLike;
  aiAvailable: () => boolean;
  context: () => TipContext;
  /** Opens Cif with a verified prompt. The only path that sends a request. */
  askCif: (prompt: string) => void;
}

const anyBlocker = (b: TipBlockers) => Object.values(b).some(Boolean);

/**
 * Writes a value and reads it back. The browser wrapper (`browserStorage`)
 * swallows storage errors, so a failed write is only visible as a missing value.
 */
function persist(storage: StorageLike, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return storage.getItem(key) === value;
  } catch {
    return false;
  }
}

/**
 * Owns the "Show tips from Cif" preference, the one-time question and the one
 * tip on screen (spec 176). Nothing here runs on a timer or reads the vault.
 */
export class TipsStore {
  record = $state<TipsRecord>(emptyTipsRecord());
  /** The tip the chip is showing, or null. */
  current = $state<Tip | null>(null);
  /** Screen on which a tip waited for a blocker to clear (research D3). */
  private pendingArea: HelpArea | null = null;
  /**
   * A save failed this visit: nothing about tips can be kept, so they stay off
   * until the next visit rather than show tips whose dismissal would be lost (FR-031).
   */
  private storageFailed = $state(false);

  constructor(private readonly deps: TipsStoreDeps) {
    this.record = this.read();
    this.syncAi();
  }

  /** The switch is on, AI is available, and the choice can be saved. */
  get enabled(): boolean {
    return (
      this.record.enabled && this.deps.aiAvailable() && !this.storageFailed
    );
  }

  /** The one-time question shows once guided setup ends, never again after an answer (FR-006). */
  get shouldAskOptIn(): boolean {
    if (this.record.optInAsked || this.record.enabled) return false;
    // An answer that cannot be saved would be asked for again on every visit.
    if (this.storageFailed) return false;
    if (!this.deps.aiAvailable()) return false;
    const ctx = this.deps.context();
    return (
      ctx.goalInvitation === "goal" &&
      ctx.setupEnded &&
      !anyBlocker(ctx.blockers)
    );
  }

  load(): void {
    this.record = this.read();
    this.syncAi();
  }

  setEnabled(on: boolean): void {
    this.record = setTipsEnabled(this.record, on);
    if (!on) this.current = null;
    this.write();
  }

  /** Yes turns tips on; either answer, or closing the card, means never asked again. */
  answerOptIn(yes: boolean): void {
    this.record = markOptInAsked(this.record);
    if (yes) this.record = setTipsEnabled(this.record, true);
    this.write();
  }

  closeOptIn(): void {
    this.answerOptIn(false);
  }

  /** Decides what the chip shows for the screen the person is on now. */
  evaluate(): void {
    this.syncAi();
    // Focus changes call this on every move; with tips off, do not read the screen.
    if (!this.enabled) {
      this.clearTip();
      return;
    }
    const ctx = this.deps.context();
    this.dropStaleTip(ctx);
    if (this.current) return;

    const decision = decideTip({
      record: this.record,
      aiAvailable: this.deps.aiAvailable(),
      goal: ctx.goal,
      goalInvitation: ctx.goalInvitation,
      setupEnded: ctx.setupEnded,
      area: ctx.area,
      shownThisSession: this.shownThisSession(),
      blockers: ctx.blockers,
      unavailableAreas: ctx.unavailableAreas,
    });
    if (decision.kind === "none") {
      this.pendingArea = decision.reason === "blocked" ? ctx.area : null;
      return;
    }
    this.show(decision.tip);
  }

  /**
   * A tip is only ever for the screen it was shown on, and never stays up while
   * something blocks it (FR-014). A hidden tip still uses this session's slot.
   */
  private dropStaleTip(ctx: TipContext): void {
    if (
      this.current &&
      (this.current.area !== ctx.area || anyBlocker(ctx.blockers))
    ) {
      this.current = null;
    }
  }

  /**
   * Shows a tip only when its dismissal can be saved and the visit marked;
   * otherwise it could return after a reload or repeat on every screen.
   */
  private show(tip: Tip): void {
    this.pendingArea = null;
    if (!this.canSave() || !this.markShown()) return;
    this.current = tip;
  }

  private clearTip(): void {
    this.current = null;
    this.pendingArea = null;
  }

  /** Called when a blocker clears; only a tip waiting on this same screen may show. */
  reevaluate(): void {
    if (this.pendingArea === null) return;
    if (this.pendingArea !== this.deps.context().area) {
      this.pendingArea = null;
      return;
    }
    this.evaluate();
  }

  dismiss(): void {
    if (!this.current) return;
    this.record = dismissTip(this.record, this.current);
    this.current = null;
    this.write();
  }

  /** Tapping the chip asks Cif the tip's verified question; nothing is sent before this. */
  act(): void {
    const tip = this.current;
    if (!tip) return;
    this.record = actOnTip(this.record, tip);
    this.current = null;
    this.write();
    this.deps.askCif(tip.prompt);
  }

  /** Turns the switch off when AI becomes unavailable, so turning AI back on never re-enables tips (FR-004). */
  private syncAi(): void {
    if (this.record.enabled && !this.deps.aiAvailable()) {
      this.record = setTipsEnabled(this.record, false);
      this.current = null;
      this.write();
    }
  }

  private read(): TipsRecord {
    try {
      return parseTipsRecord(this.deps.storage.getItem(TIPS_KEY));
    } catch {
      return emptyTipsRecord();
    }
  }

  /**
   * Confirms a save would land before a tip shows. Saving an unchanged record
   * cannot reveal a dropped write, so a probe key is written, read and removed.
   */
  private canSave(): boolean {
    const ok = persist(this.deps.storage, TIPS_PROBE_KEY, "1");
    try {
      this.deps.storage.removeItem(TIPS_PROBE_KEY);
    } catch {
      // Removal is tidy-up only.
    }
    if (!ok) this.latchStorageFailed();
    return ok;
  }

  private latchStorageFailed(): void {
    this.storageFailed = true;
    this.clearTip();
  }

  /** Saves the record; a failed save turns tips off for this visit (FR-031). */
  private write(): boolean {
    if (
      persist(this.deps.storage, TIPS_KEY, serializeTipsRecord(this.record))
    ) {
      return true;
    }
    this.latchStorageFailed();
    return false;
  }

  /** Unreadable session storage counts as "a tip already showed" (FR-031). */
  private shownThisSession(): boolean {
    try {
      return this.deps.sessionStorage.getItem(TIPS_SESSION_KEY) === "1";
    } catch {
      return true;
    }
  }

  private markShown(): boolean {
    return persist(this.deps.sessionStorage, TIPS_SESSION_KEY, "1");
  }
}
