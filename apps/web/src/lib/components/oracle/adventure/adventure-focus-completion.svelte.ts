import {
  selectAdventureContinuationCandidates,
  selectPendingAdventureCompletion,
  type AdventureContinuationCandidate,
} from "@codex/adventure-engine";
import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";

/** Completion choices and their shared in-flight guard belong to this view. */
export class AdventureFocusCompletion {
  private dismissedIds = $state<string[]>([]);
  busy = $state(false);

  private rawPending = $derived.by(() => {
    const manager = this.getManager();
    if (
      !manager.session ||
      manager.phase === "generating" ||
      manager.streamedNarration ||
      manager.session.pendingRoll
    ) {
      return null;
    }
    return selectPendingAdventureCompletion(manager.session);
  });

  readonly pending = $derived.by(() => {
    const pending = this.rawPending;
    return pending && !this.dismissedIds.includes(pending.eventId)
      ? pending
      : null;
  });

  readonly continuations = $derived.by(() => {
    const pending = this.pending;
    const session = this.getManager().session;
    return pending && session
      ? selectAdventureContinuationCandidates(session, {
          sourceOutcomeId: pending.eventId,
        })
      : null;
  });

  constructor(
    private readonly getManager: () => AdventureManager,
    private readonly restoreFocus: () => void,
    private readonly notifications: Pick<
      typeof notificationStore,
      "notify"
    > = notificationStore,
  ) {}

  continueExploring(eventId: string): Promise<void> {
    return this.run(() => this.dismiss(eventId));
  }

  findAnother(eventId: string): Promise<void> {
    return this.leave(
      eventId,
      "close",
      "Unable to leave this adventure right now. Please try again.",
    );
  }

  finish(eventId: string): Promise<void> {
    return this.leave(
      eventId,
      "end",
      "Unable to archive this adventure right now. You can retry or continue exploring.",
    );
  }

  launch(
    eventId: string,
    candidate: AdventureContinuationCandidate,
  ): Promise<void> {
    return this.run(async () => {
      await this.getManager().launchContinuation(candidate);
      await this.dismiss(eventId);
    }, "Unable to launch that story right now. Please try again.");
  }

  private leave(
    eventId: string,
    action: "close" | "end",
    errorMessage: string,
  ): Promise<void> {
    return this.run(async () => {
      await this.dismiss(eventId, false);
      await this.getManager()[action]();
    }, errorMessage);
  }

  private async dismiss(eventId: string, restoreFocus = true): Promise<void> {
    const manager = this.getManager();
    if (!manager.readOnly) {
      try {
        await manager.acknowledgeCompletion(eventId);
      } catch {
        this.notifications.notify(
          "Dismissed for this view, but the acknowledgement could not be saved.",
          "error",
        );
      }
    }
    if (!this.dismissedIds.includes(eventId)) {
      this.dismissedIds = [...this.dismissedIds, eventId];
    }
    if (restoreFocus) this.restoreFocus();
  }

  private async run(
    action: () => Promise<void>,
    errorMessage?: string,
  ): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await action();
    } catch (error) {
      if (!errorMessage) throw error;
      this.notifications.notify(errorMessage, "error");
    } finally {
      this.busy = false;
    }
  }
}
