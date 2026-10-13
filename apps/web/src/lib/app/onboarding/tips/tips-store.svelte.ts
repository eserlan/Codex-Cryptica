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
import type { StorageLike } from "$lib/utils/runtime-deps";
import type { TipContext } from "./tips-context";

export type { TipContext } from "./tips-context";

export const TIPS_KEY = "codex-cif-tips";
export const TIPS_SESSION_KEY = "codex-cif-tips-session";

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
 * Owns the "Show tips from Cif" preference, the one-time question and the one
 * tip on screen (spec 176). Nothing here runs on a timer or reads the vault.
 */
export class TipsStore {
  record = $state<TipsRecord>(emptyTipsRecord());
  /** The tip the chip is showing, or null. */
  current = $state<Tip | null>(null);
  /** Screen on which a tip waited for a blocker to clear (research D3). */
  private pendingArea: HelpArea | null = null;

  constructor(private readonly deps: TipsStoreDeps) {
    this.record = this.read();
    this.syncAi();
  }

  /** The switch is on and AI is available. */
  get enabled(): boolean {
    return this.record.enabled && this.deps.aiAvailable();
  }

  /** The one-time question shows once guided setup ends, never again after an answer (FR-006). */
  get shouldAskOptIn(): boolean {
    if (this.record.optInAsked || this.record.enabled) return false;
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
    const ctx = this.deps.context();

    // A tip is only ever for the screen it was shown on, and never stays up
    // while something blocks it (FR-014). A hidden tip still uses this session's slot.
    if (
      this.current &&
      (this.current.area !== ctx.area || anyBlocker(ctx.blockers))
    ) {
      this.current = null;
    }
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
    // Without a readable session marker a second tip could appear; show none.
    if (!this.markShown()) {
      this.pendingArea = null;
      return;
    }
    this.pendingArea = null;
    this.current = decision.tip;
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

  private write(): void {
    try {
      this.deps.storage.setItem(TIPS_KEY, serializeTipsRecord(this.record));
    } catch {
      // Storage unavailable: tips behave as off for the rest of this visit (FR-031).
    }
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
    try {
      this.deps.sessionStorage.setItem(TIPS_SESSION_KEY, "1");
      return true;
    } catch {
      return false;
    }
  }
}
