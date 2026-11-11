import {
  attachStorySummary,
  buildStorySummaryRequest,
  type AdventureSession,
  type StorySummaryResult,
} from "@codex/adventure-engine";
import type { AdventureManagerDependencies } from "./adventure-dependencies";
import type { AdventureState } from "./adventure-state.svelte";

/**
 * Keeps the rolling story notes up to date in the background. A finished summary
 * waits in memory and is attached to the session the next turn is generated from,
 * so it is saved by that turn's own save: no extra revision is created, the
 * provider conversation is not reset, and a failure never touches the adventure.
 */
export class AdventureSummarizer {
  private ready: { sessionId: string; result: StorySummaryResult } | null =
    null;
  private inFlight = false;

  constructor(
    private readonly state: AdventureState,
    private readonly deps: Pick<
      Required<AdventureManagerDependencies>,
      "summary" | "now"
    >,
  ) {}

  /** The session with any finished notes attached; unchanged when there are none or they are stale. */
  attach(session: AdventureSession): AdventureSession {
    const ready = this.ready;
    if (!ready) return session;
    this.ready = null;
    if (ready.sessionId !== session.id) return session;
    const attached = attachStorySummary(session, ready.result, this.deps.now());
    return attached.ok ? attached.value : session;
  }

  /** Start a summary call if one is due. Never throws and never blocks play. */
  schedule(session: AdventureSession): void {
    if (this.inFlight || this.state.readOnly) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const request = buildStorySummaryRequest(session);
    if (!request) return;
    this.inFlight = true;
    void this.deps.summary
      .summarize(request)
      .then((result) => {
        // The session may have been switched or ended while the call ran.
        if (this.state.session?.id === session.id) {
          this.ready = { sessionId: session.id, result };
        }
      })
      .catch(() => {
        // Optional and retried at the next trigger; the player never sees it.
      })
      .finally(() => {
        this.inFlight = false;
      });
  }
}
