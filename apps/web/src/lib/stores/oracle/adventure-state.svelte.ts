import {
  createPlayerTranscript,
  buildAdventureRecap,
  getRollHistory,
  type AdventureSession,
} from "@codex/adventure-engine";
import type { AdventureControlLease } from "#lib/services/adventure/adventure-control-lease.js";
import type { TurnRejectionDiagnostic } from "#lib/services/adventure/adventure-review-capture.js";
import type { AdventureStartFailure } from "#lib/services/adventure/adventure-start-failure.js";

/** Reactive view state shared by the adventure workflows. */
export class AdventureState {
  session = $state.raw<AdventureSession | null>(null);
  phase = $state<
    | "idle"
    | "starting"
    | "ready"
    | "generating"
    | "awaiting-roll"
    | "ready-to-resolve"
    | "offline"
    | "error"
    | "package-unavailable"
  >("idle");
  draft = $state("");
  /** Composer input mode: canonical Play action vs out-of-character Ask GM clarification. */
  composerMode = $state<"play" | "ooc">("play");
  /** Unsent Ask GM question draft, preserved separately from the Play action draft. */
  oocDraft = $state("");
  /** True while an out-of-character Ask GM clarification request is in flight. */
  oocGenerating = $state(false);
  /** True while a pending roll outcome is being persisted. */
  rollMutationPending = $state(false);
  /** Error message for the most recent OOC clarification attempt, if any. */
  oocErrorMessage = $state<string | null>(null);
  /** Uncommitted player-visible narration, cleared on failure or cancellation. */
  streamedNarration = $state("");
  errorMessage = $state<string | null>(null);
  /** Details of the most recent engine-refused Play turn (never committed to session.turns). */
  lastTurnRejection = $state<TurnRejectionDiagnostic | null>(null);
  /**
   * Typed cause of the last start/opening failure. UI maps it to fixed,
   * user-safe copy instead of showing `errorMessage` text verbatim.
   */
  errorCause = $state<AdventureStartFailure | null>(null);
  /**
   * Shared re-entry guard for start(). It lives in the manager because the
   * start forms can unmount mid-start and lose any local guard.
   */
  starting = $state(false);
  lastRollResult = $state<string | null>(null);
  /** Set while the pinned package is missing or changed; Retry or Leave recovers. */
  packageUnavailable = $state<{
    otherVersionAvailable: boolean | null;
  } | null>(null);
  readOnly = $state(false);
  lease = $state<AdventureControlLease | null>(null);

  get transcript() {
    return this.session ? createPlayerTranscript(this.session) : null;
  }

  get suggestedActions() {
    if (!this.session) return [];
    return (
      this.session.pendingRoll?.suggestedActions ??
      this.session.turns.at(-1)?.suggestedActions ??
      []
    );
  }

  /** Deterministic, client-side recap — never draws on hidden state (FR-006). */
  get recap() {
    return this.session ? buildAdventureRecap(this.session) : null;
  }

  /** Turns with a resolved roll, in commit order (FR-012). */
  get rollHistory() {
    return this.session ? getRollHistory(this.session) : [];
  }

  /** Out-of-character Ask GM exchanges persisted on the session. */
  get oocExchanges() {
    return this.session?.oocExchanges ?? [];
  }
}
