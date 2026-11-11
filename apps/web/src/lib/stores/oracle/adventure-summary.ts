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
  private request: AbortController | null = null;
  private generation = 0;

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

  /** Abort and invalidate work when its session leaves the active view. */
  cancel(): void {
    this.generation += 1;
    this.request?.abort();
    this.request = null;
    this.ready = null;
  }

  /** Start a summary call if one is due. Never throws and never blocks play. */
  schedule(session: AdventureSession): void {
    if (this.request || this.state.readOnly) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const request = buildStorySummaryRequest(session);
    if (!request) return;
    const controller = new AbortController();
    const generation = ++this.generation;
    this.request = controller;
    void this.deps.summary
      .summarize(request, { signal: controller.signal })
      .then((result) => {
        // Lifecycle invalidation also rejects a late result after reopening the same session.
        if (
          this.request === controller &&
          this.generation === generation &&
          this.state.session?.id === session.id
        ) {
          this.ready = { sessionId: session.id, result };
        }
      })
      .catch(() => {
        // Optional and retried at the next trigger; the player never sees it.
      })
      .finally(() => {
        if (this.request === controller) this.request = null;
      });
  }
}
