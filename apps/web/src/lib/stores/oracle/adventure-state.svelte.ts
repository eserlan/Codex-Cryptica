import {
  createPlayerTranscript,
  buildAdventureRecap,
  getRollHistory,
  type AdventureSession,
} from "@codex/adventure-engine";
import type { AdventureControlLease } from "#lib/services/adventure/adventure-control-lease.js";
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
  >("idle");
  draft = $state("");
  /** Uncommitted player-visible narration, cleared on failure or cancellation. */
  streamedNarration = $state("");
  errorMessage = $state<string | null>(null);
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
}
