import { AdventureGroundingError } from "#lib/services/adventure/adventure-grounding-service.js";
import {
  parseAdventureSession,
  type AdventureSession,
  type PlayerCharacter,
  type ScenarioState,
  type WorldEntryContext,
  type applyCompletedTurn,
  type applyRollRequest,
} from "@codex/adventure-engine";
import type { AdventureStartFailure } from "#lib/services/adventure/adventure-start-failure.js";
import {
  initialSession,
  proposedSession,
  validateRollExpression,
} from "./adventure-session";

import type { AdventureRuntime } from "./adventure-runtime";

function storageFailure(cause: unknown): AdventureStartFailure | null {
  const name =
    cause !== null && typeof cause === "object" && "name" in cause
      ? String((cause as { name: unknown }).name)
      : "";
  if (name === "QuotaExceededError") return "storage-full";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "storage-permission";
  return null;
}

/** Tags an opening failure with the stage it happened in. */
class OpeningStageError extends Error {
  constructor(
    readonly failure: AdventureStartFailure,
    readonly original: unknown,
  ) {
    super(original instanceof Error ? original.message : String(original));
    this.name = "OpeningStageError";
  }
}

function classifyOpeningFailure(cause: unknown): AdventureStartFailure {
  if (cause instanceof OpeningStageError) return cause.failure;
  const message = cause instanceof Error ? cause.message : String(cause);
  if (message === "offline") return "offline";
  if (message === "control-lost") return "control-lost";
  return storageFailure(cause) ?? "opening-failed";
}

export class AdventureOpening {
  private readonly state;
  constructor(private readonly runtime: AdventureRuntime) {
    this.state = runtime.state;
  }

  async start(input: {
    vaultId: string;
    title: string;
    premise: string;
    playerCharacter: PlayerCharacter;
    sourceRecords?: AdventureSession["sourceRecords"];
    scenarioSeed?: ScenarioState;
    worldEntry?: WorldEntryContext;
  }): Promise<AdventureSession> {
    if (!input.premise.trim() || !input.title.trim()) {
      throw new Error("premise-and-title-required");
    }
    // Validate with the reader's schema before archiving anything or writing,
    // so an invalid seed can never be saved and then fail to load.
    if (this.state.starting) throw new Error("start-in-progress");
    const created = this.validatedNewSession(input);
    this.state.starting = true;
    try {
      this.runtime.activeRestoreRequest += 1;
      this.state.phase = "starting";
      this.state.errorMessage = null;
      this.state.errorCause = null;
      const saved = await this.persistNewAdventure(created);
      await this.takeControlOfNewAdventure(saved);
      await this.startOpeningIfOnline(saved);
      return this.state.session ?? saved;
    } finally {
      this.state.starting = false;
    }
  }

  async retryOpening(): Promise<void> {
    const session = this.state.session;
    if (
      !session ||
      session.turns.length ||
      session.pendingRoll ||
      this.state.readOnly ||
      this.state.phase === "generating"
    )
      return;
    this.state.errorMessage = null;
    await this.startOpeningIfOnline(session);
  }

  private validatedNewSession(input: {
    vaultId: string;
    title: string;
    premise: string;
    playerCharacter: PlayerCharacter;
    sourceRecords?: AdventureSession["sourceRecords"];
    scenarioSeed?: ScenarioState;
    worldEntry?: WorldEntryContext;
  }): AdventureSession {
    try {
      return parseAdventureSession(
        initialSession({
          ...input,
          now: this.runtime.deps.now(),
          idGenerator: this.runtime.deps.idGenerator,
        }),
      );
    } catch {
      throw new Error("invalid-adventure-setup");
    }
  }

  private async persistNewAdventure(
    created: AdventureSession,
  ): Promise<AdventureSession> {
    const saved = await this.runtime.deps.repository.save(null, created);
    if (!saved.ok) {
      this.state.phase = "error";
      this.state.errorMessage = saved.error.message;
      this.state.errorCause = "save-failed";
      throw saved.error;
    }
    this.state.session = saved.session;
    return saved.session;
  }

  private async takeControlOfNewAdventure(session: AdventureSession) {
    const acquired = await this.runtime.deps.authority.acquire({
      vaultId: session.vaultId,
      sessionId: session.id,
    });
    this.state.readOnly = !acquired.ok;
    if (acquired.ok) {
      this.state.lease = acquired.lease;
      this.runtime.deps.coordinator.start(acquired.lease);
    }
    this.state.phase = "ready";
  }

  private async startOpeningIfOnline(session: AdventureSession) {
    if (this.state.readOnly) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.state.phase = "offline";
      return;
    }
    await this.generateOpening(session);
  }

  private async generateOpening(session: AdventureSession): Promise<void> {
    if (
      !this.state.lease ||
      !(await this.runtime.deps.authority.verify(this.state.lease))
    )
      return;
    const signal = this.runtime.startTurnGeneration();
    try {
      await this.persistOpeningTurn(session, signal);
    } catch (cause) {
      if (!signal.aborted) await this.handleFailedOpening(session, cause);
    } finally {
      this.runtime.endTurnGeneration(signal);
    }
  }

  private async persistOpeningTurn(
    session: AdventureSession,
    signal: AbortSignal,
  ): Promise<void> {
    const { prepared, proposal } = await this.generateOpeningProposal(
      session,
      signal,
    );
    signal.throwIfAborted();
    if (this.state.session?.id !== session.id) return;
    const saved = await this.saveOpening(
      session,
      this.openingSession(prepared, proposal),
    );
    if (this.state.session?.id !== session.id) return;
    this.state.session = saved;
    this.state.streamedNarration = "";
    this.state.phase = saved.pendingRoll ? "awaiting-roll" : "ready";
  }

  private async generateOpeningProposal(
    session: AdventureSession,
    signal: AbortSignal,
  ) {
    // Commit the background together with the opening turn, not as a
    // half-created separate save if Oracle fails.
    const prepared = await this.runtime.background.prepare(session, signal);
    const proposal = await this.runtime.deps.generation.generate({
      session: prepared,
      phase: "opening",
      anchors: [],
      relevant: [],
      signal,
      onNarration: this.runtime.narrationPreview(session.id, signal),
    });
    return { prepared, proposal };
  }

  /** Applies the opening proposal; any rejection is an `opening-rejected`. */
  private openingSession(
    session: AdventureSession,
    proposal:
      | Parameters<typeof applyCompletedTurn>[1]
      | Parameters<typeof applyRollRequest>[1],
  ): AdventureSession {
    try {
      validateRollExpression(proposal);
      return proposedSession(
        session,
        proposal,
        this.runtime.newTurnMetadata(""),
        "opening-rejected",
      );
    } catch (cause) {
      throw new OpeningStageError("opening-rejected", cause);
    }
  }

  /** Saves the opening, classifying lease loss and storage failures. */
  private async saveOpening(
    session: AdventureSession,
    next: AdventureSession,
  ): Promise<AdventureSession> {
    try {
      return await this.runtime.saveTurn(session, next);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      throw new OpeningStageError(
        message === "control-lost"
          ? "control-lost"
          : (storageFailure(cause) ?? "save-failed"),
        cause,
      );
    }
  }

  private async handleFailedOpening(
    session: AdventureSession,
    cause: unknown,
  ): Promise<void> {
    if (cause instanceof AdventureGroundingError) {
      this.retainIncompleteOpening(session, cause);
      return;
    }
    await this.archiveFailedOpening(session, cause);
  }

  private retainIncompleteOpening(
    session: AdventureSession,
    cause: AdventureGroundingError,
  ): void {
    if (this.state.session?.id !== session.id) return;
    this.state.errorMessage = cause.message;
    this.state.streamedNarration = "";
    this.state.errorCause = "opening-failed";
    this.state.phase = "error";
  }

  private async archiveFailedOpening(
    session: AdventureSession,
    cause: unknown,
  ): Promise<void> {
    const message = cause instanceof Error ? cause.message : String(cause);
    const failure = classifyOpeningFailure(cause);
    this.state.streamedNarration = "";
    const archived = await this.runtime.deps.repository.archive(
      session.vaultId,
      session.id,
      session.revision,
    );
    if (this.state.session?.id !== session.id) {
      if (archived.ok)
        void this.runtime.deps.clearGenerationInteraction(session.id);
      return;
    }
    if (archived.ok) {
      void this.runtime.deps.clearGenerationInteraction(session.id);
      this.state.session = null;
      this.state.readOnly = false;
      await this.runtime.deps.coordinator.stop();
      this.state.lease = null;
    } else {
      this.state.errorMessage = `${message}; failed to clean up the incomplete adventure: ${archived.error.message}`;
    }
    this.state.errorMessage ??= message;
    this.state.errorCause = archived.ok ? failure : "cleanup-failed";
    this.state.phase =
      this.state.errorMessage === "offline" ? "offline" : "error";
  }
}
