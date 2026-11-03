import {
  recordPendingRollOutcome,
  resolveRecordedRoll,
  dismissPendingRoll,
  type AdventureSession,
  type SuppliedRollOutcome,
} from "@codex/adventure-engine";
import { acceptedSession } from "./adventure-session";

import type { AdventureRuntime } from "./adventure-runtime";

export class AdventureRolls {
  private readonly state;
  constructor(private readonly runtime: AdventureRuntime) {
    this.state = runtime.state;
  }

  private async persistRecordedOutcome(
    session: AdventureSession,
    outcome: SuppliedRollOutcome,
  ): Promise<void> {
    const pendingRoll = session.pendingRoll;
    if (!pendingRoll) return;
    await this.runtime.verifyControl();
    const result = recordPendingRollOutcome(
      session,
      pendingRoll.inputId,
      outcome,
      this.runtime.rollMetadata(pendingRoll.inputId),
    );
    const next = acceptedSession(result, "invalid-roll");
    this.state.session = await this.runtime.saveTurn(session, next);
    this.state.errorMessage = null;
    this.state.phase = "ready-to-resolve";
    await this.resolveRoll();
  }

  async recordRollOutcome(outcome: SuppliedRollOutcome): Promise<void> {
    if (!this.state.session?.pendingRoll || this.state.readOnly) return;
    try {
      await this.persistRecordedOutcome(this.state.session, outcome);
    } catch (cause) {
      this.state.errorMessage =
        cause instanceof Error
          ? cause.message
          : "Unable to record the roll outcome.";
    }
  }

  async rollCodexDice(): Promise<void> {
    const expression = this.state.session?.pendingRoll?.dice?.expression;
    if (!expression || this.state.session?.pendingRoll?.suppliedOutcome) return;
    let result: ReturnType<typeof this.runtime.deps.dice.evaluate>;
    try {
      result = this.runtime.deps.dice.evaluate(expression);
    } catch (cause) {
      this.state.errorMessage =
        cause instanceof Error
          ? `Invalid roll expression: ${cause.message}`
          : "Invalid roll expression.";
      return;
    }
    this.state.lastRollResult = `${expression} = ${result.total}`;
    await this.recordRollOutcome({
      kind: "numeric",
      value: result.total,
      label: `${expression} = ${result.total}`,
      // The dice as actually rolled, persisted with the outcome so the roll
      // history can show them later without re-deriving anything (#3443).
      parts: result.parts,
    });
  }

  private async saveRollResolutionTurn(
    session: AdventureSession,
    signal: AbortSignal,
  ): Promise<void> {
    const pendingRoll = session.pendingRoll;
    if (!pendingRoll?.suppliedOutcome) return;
    const proposal = await this.generateRollResolution(session, signal);
    const result = resolveRecordedRoll(
      session,
      proposal,
      this.runtime.newTurnMetadata(pendingRoll.playerAction),
    );
    const next = acceptedSession(result, "roll-rejected");
    this.state.session = await this.runtime.saveTurn(session, next);
    this.state.streamedNarration = "";
    this.state.phase = "ready";
  }

  private async generateRollResolution(
    session: AdventureSession,
    signal: AbortSignal,
  ) {
    const pendingRoll = session.pendingRoll!;
    const proposal = await this.runtime.deps.generation.generate(
      {
        session,
        phase: "roll-resolution",
        rollResolution: pendingRoll.suppliedOutcome,
        anchors: [],
        relevant: [],
        onNarration: this.runtime.narrationPreview(session.id, signal),
      },
      { signal },
    );
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    if (proposal.kind !== "complete") {
      throw new Error("roll-resolution-requires-complete-turn");
    }
    return proposal;
  }

  async resolveRoll(): Promise<void> {
    if (
      !this.state.session?.pendingRoll?.suppliedOutcome ||
      this.state.readOnly ||
      this.state.phase === "generating"
    ) {
      return;
    }
    const session = this.state.session;
    await this.runtime.runTurnGeneration(
      (signal) => this.saveRollResolutionTurn(session, signal),
      "ready-to-resolve",
    );
  }

  cancel(): void {
    if (this.state.phase !== "generating") return;
    this.runtime.generationController?.abort();
    this.state.streamedNarration = "";
    if (this.state.session)
      void this.runtime.deps.clearGenerationInteraction(this.state.session.id);
    this.runtime.generationController = null;
    this.state.errorMessage = null;
    this.state.phase = this.state.session?.pendingRoll?.suppliedOutcome
      ? "ready-to-resolve"
      : "ready";
  }

  async dismissRoll(): Promise<void> {
    if (!this.state.session?.pendingRoll || this.state.readOnly) return;
    const session = this.state.session;
    const pendingRoll = session.pendingRoll!;
    const result = dismissPendingRoll(
      session,
      pendingRoll.inputId,
      this.runtime.rollMetadata(pendingRoll.inputId),
    );
    const next = acceptedSession(result, "invalid-roll");
    this.state.session = await this.runtime.saveTurn(session, next);
    this.state.phase = "ready";
  }
}
