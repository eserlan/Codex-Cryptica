import type { AdventureSession, CommitMetadata } from "@codex/adventure-engine";
import type { AdventureManagerDependencies } from "./adventure-dependencies";
import type { AdventureState } from "./adventure-state.svelte";
import { AdventureBackground } from "./adventure-background";

/** Shared generation lifetime and persistence boundary for all workflows. */
export class AdventureRuntime {
  activeRestoreRequest = 0;
  generationController: AbortController | null = null;
  readonly background: AdventureBackground;
  constructor(
    readonly state: AdventureState,
    readonly deps: Required<AdventureManagerDependencies>,
  ) {
    this.background = new AdventureBackground(deps.idGenerator);
  }

  async verifyControl(): Promise<void> {
    if (
      !this.state.lease ||
      !(await this.deps.authority.verify(this.state.lease))
    ) {
      throw new Error("control-lost");
    }
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
    await this.verifyControl();
    const saved = await this.deps.repository.save(previous.revision, next);
    if (!saved.ok) throw saved.error;
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
      this.recordTurnGenerationError(cause, signal, retryPhase);
    } finally {
      this.endTurnGeneration(signal);
    }
  }
}
