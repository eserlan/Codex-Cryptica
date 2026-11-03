import type { AdventureSession } from "@codex/adventure-engine";
import { proposedSession, validateRollExpression } from "./adventure-session";
import { abortReason } from "./adventure-generation.svelte";

import type { AdventureRuntime } from "./adventure-runtime";

export class AdventureActions {
  private readonly state;
  constructor(private readonly runtime: AdventureRuntime) {
    this.state = runtime.state;
  }

  private canSubmitAction(action: string): boolean {
    return Boolean(
      this.state.session &&
      !this.state.readOnly &&
      action.trim() &&
      this.state.phase !== "generating",
    );
  }

  private async saveGeneratedAction(
    session: AdventureSession,
    action: string,
    signal: AbortSignal,
  ): Promise<void> {
    const { prepared, proposal } = await this.generateActionProposal(
      session,
      action,
      signal,
    );
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    validateRollExpression(proposal);
    const next = proposedSession(
      prepared,
      proposal,
      this.runtime.newTurnMetadata(action),
      "turn-rejected",
    );
    const saved = await this.runtime.saveTurn(session, next);
    this.state.session = saved;
    this.state.streamedNarration = "";
    this.state.draft = "";
    this.state.phase = saved.pendingRoll ? "awaiting-roll" : "ready";
  }

  private async generateActionProposal(
    session: AdventureSession,
    action: string,
    signal: AbortSignal,
  ) {
    await this.runtime.verifyControl();
    const anchors = await this.runtime.deps.context.resolveAnchors(session);
    const relevant = await this.runtime.deps.context.resolveActionRelevant(
      session,
      action,
    );
    // Older World Entry sessions began without background situations.
    // Seed on their next committed action too, without mutating the persisted
    // session until the same optimistic-concurrency save succeeds.
    const prepared = await this.runtime.background.prepare(session, signal);
    if (signal.aborted) throw abortReason(signal);
    const proposal = await this.runtime.deps.generation.generate(
      {
        session: prepared,
        phase: "action",
        playerAction: action,
        anchors,
        relevant,
        onNarration: this.runtime.narrationPreview(session.id, signal),
      },
      { signal },
    );
    return { prepared, proposal };
  }

  async submitAction(
    action = this.state.draft,
    preserveDraft = true,
  ): Promise<void> {
    if (!this.canSubmitAction(action)) return;
    if (preserveDraft) this.state.draft = action;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.state.phase = "offline";
      return;
    }
    const session = this.state.session!;
    await this.runtime.runTurnGeneration(
      (signal) => this.saveGeneratedAction(session, action, signal),
      "ready",
    );
  }

  async submitSuggestedAction(action: string): Promise<void> {
    // Treat a suggestion like a typed action. Keep the selected choice in the
    // composer until it commits so offline errors, cancellations and provider
    // failures leave the player with an editable, retryable action.
    await this.submitAction(action);
  }
}
