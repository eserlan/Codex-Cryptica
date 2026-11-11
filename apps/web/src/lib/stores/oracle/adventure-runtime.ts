import {
  genreForTheme,
  worldStyleForTheme,
} from "#lib/services/adventure/world-style.js";
import { themeStore } from "#lib/stores/theme.svelte.js";
import { AdventureGroundingService } from "#lib/services/adventure/adventure-grounding-service.js";
import type { AdventureSession, CommitMetadata } from "@codex/adventure-engine";
import type { AdventureManagerDependencies } from "./adventure-dependencies";
import type { AdventureState } from "./adventure-state.svelte";
import { AdventureBackground } from "./adventure-background";
import { AdventureScenarios } from "./adventure-scenarios";
import { AdventureSummarizer } from "./adventure-summary";

/** Shared generation lifetime and persistence boundary for all workflows. */
export class AdventureRuntime {
  activeRestoreRequest = 0;
  generationController: AbortController | null = null;
  readonly background: AdventureBackground;
  readonly scenarios: AdventureScenarios;
  readonly summarizer: AdventureSummarizer;
  constructor(
    readonly state: AdventureState,
    readonly deps: Required<AdventureManagerDependencies>,
  ) {
    const grounding = new AdventureGroundingService(
      deps.context,
      (session) => this.verifySession(session),
      () => worldStyleForTheme(themeStore.worldThemeId),
    );
    deps.generation = grounding.wrap(deps.generation);
    this.background = new AdventureBackground(deps.idGenerator, grounding, () =>
      genreForTheme(themeStore.worldThemeId),
    );
    this.summarizer = new AdventureSummarizer(state, deps);
    this.scenarios = new AdventureScenarios(state, deps, (session) =>
      this.verifySession(session),
    );
  }

  async verifyControl(): Promise<void> {
    if (
      !this.state.lease ||
      !(await this.deps.authority.verify(this.state.lease))
    ) {
      throw new Error("control-lost");
    }
  }

  private assertCurrentSession(session: AdventureSession): void {
    const current = this.state.session;
    if (
      this.state.readOnly ||
      !current ||
      current.id !== session.id ||
      current.vaultId !== session.vaultId ||
      current.revision !== session.revision
    )
      throw new Error("stale-adventure-context");
  }

  private async verifySession(session: AdventureSession): Promise<void> {
    this.assertCurrentSession(session);
    await this.verifyControl();
    this.assertCurrentSession(session);
  }

  narrationPreview(sessionId: string, signal?: AbortSignal) {
    return (text: string) => {
      if (signal?.aborted || this.state.session?.id !== sessionId) return;
      if (this.state.phase !== "generating") return;
      this.state.streamedNarration = text;
    };
  }

  newTurnMetadata(playerAction: string): CommitMetadata {
    return {
      turnId: this.deps.idGenerator(),
      inputId: this.deps.idGenerator(),
      playerAction,
      now: this.deps.now(),
    };
  }

  rollMetadata(inputId: string): CommitMetadata {
    return {
      turnId: this.deps.idGenerator(),
      inputId,
      now: this.deps.now(),
    };
  }

  async saveTurn(
    previous: AdventureSession,
    next: AdventureSession,
  ): Promise<AdventureSession> {
    await this.verifySession(previous);
    const saved = await this.deps.repository.save(previous.revision, next);
    if (!saved.ok) throw saved.error;
    this.assertCurrentSession(previous);
    // A provider reply is provisional until the OPFS write has succeeded.
    // A failed acknowledgement cannot undo a saved turn; discard the remote
    // optimization and reconstruct from saved local state on the next action.
    try {
      await this.deps.confirmGenerationInteraction(
        saved.session.id,
        saved.session.revision,
      );
    } catch {
      await this.deps
        .clearGenerationInteraction(saved.session.id)
        .catch(() => {});
    }
    // Fold older turns into the story notes while the player reads.
    this.summarizer.schedule(saved.session);
    return saved.session;
  }

  startTurnGeneration(): AbortSignal {
    this.generationController?.abort();
    this.generationController = new AbortController();
    this.state.phase = "generating";
    this.state.streamedNarration = "";
    this.state.errorMessage = null;
    return this.generationController.signal;
  }

  endTurnGeneration(signal: AbortSignal): void {
    if (this.generationController?.signal === signal) {
      this.generationController = null;
    }
  }

  recordTurnGenerationError(
    cause: unknown,
    signal: AbortSignal,
    retryPhase: "ready" | "ready-to-resolve",
  ): void {
    if (signal.aborted) return;
    this.state.streamedNarration = "";
    const message = cause instanceof Error ? cause.message : String(cause);
    const cancelled =
      (cause instanceof DOMException && cause.name === "AbortError") ||
      message === "cancelled";
    this.state.errorMessage = message;
    this.state.phase =
      retryPhase === "ready" && message === "offline"
        ? "offline"
        : cancelled
          ? retryPhase
          : "error";
  }
  async runTurnGeneration(
    generate: (signal: AbortSignal) => Promise<void>,
    retryPhase: "ready" | "ready-to-resolve",
  ): Promise<void> {
    const signal = this.startTurnGeneration();
    try {
      await generate(signal);
    } catch (cause) {
      // Discard any uncommitted remote response after a rejected patch,
      // cancelled generation, lost lease or failed local save.
      // An older cancelled turn may settle after a newer one has started.
      // Never clear the newer turn's provider context from that stale catch.
      if (
        !signal.aborted &&
        this.generationController?.signal === signal &&
        this.state.session
      ) {
        await this.deps
          .clearGenerationInteraction(this.state.session.id)
          .catch(() => {});
      }
      this.recordTurnGenerationError(cause, signal, retryPhase);
    } finally {
      this.endTurnGeneration(signal);
    }
  }
}
