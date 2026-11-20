import {
  genreForTheme,
  worldStyleForTheme,
} from "#lib/services/adventure/world-style.js";
import { themeStore } from "#lib/stores/theme.svelte.js";
import { AdventureGroundingService } from "#lib/services/adventure/adventure-grounding-service.js";
import {
  packageProgressIndex,
  adventureJsonGmOnlyText,
  adventureJsonHiddenRecordIds,
  type AdventureSession,
  type CommitMetadata,
} from "@codex/adventure-engine";
import type { AdventureManagerDependencies } from "./adventure-dependencies";
import type { AdventureState } from "./adventure-state.svelte";
import { AdventureBackground } from "./adventure-background";
import { AdventureScenarios } from "./adventure-scenarios";
import { AdventurePlaceLinker } from "./adventure-places";
import { AdventureSummarizer } from "./adventure-summary";
import { turnErrorCopy } from "./adventure-turn-retry";
import { AdventureArtworkSession } from "#lib/services/adventure/artwork/adventure-artwork-session.js";
import { assignCommittedPlaceArtwork } from "#lib/services/adventure/artwork/committed-place-artwork.js";
import { artworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";

/** Shared generation lifetime and persistence boundary for all workflows. */
export class AdventureRuntime {
  activeRestoreRequest = 0;
  generationController: AbortController | null = null;
  readonly background: AdventureBackground;
  readonly scenarios: AdventureScenarios;
  readonly summarizer: AdventureSummarizer;
  readonly placeLinker: AdventurePlaceLinker;
  readonly artwork: AdventureArtworkSession;
  constructor(
    readonly state: AdventureState,
    readonly deps: Required<AdventureManagerDependencies>,
  ) {
    const grounding = new AdventureGroundingService(
      deps.context,
      (session) => this.verifyGenerationSession(session),
      () => worldStyleForTheme(themeStore.worldThemeId),
      deps.packages,
    );
    deps.generation = grounding.wrap(deps.generation);
    this.background = new AdventureBackground(deps.idGenerator, grounding, () =>
      genreForTheme(themeStore.worldThemeId),
    );
    this.summarizer = new AdventureSummarizer(state, deps);
    this.placeLinker = new AdventurePlaceLinker(deps);
    this.artwork = new AdventureArtworkSession(state, {
      verify: (lease) => deps.authority.verify(lease),
      save: (revision, session) => deps.repository.save(revision, session),
    });
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

  private async verifyGenerationSession(
    session: AdventureSession,
  ): Promise<void> {
    await this.verifySession(session);
    if (!session.sourcePackage) return;
    const pin = await this.deps.packages.verifyPin(session);
    if (pin.status === "available") return;
    await this.enterPackageUnavailable(pin.otherVersionAvailable);
    throw new Error("adventure-package-unavailable");
  }

  narrationPreview(sessionId: string, signal?: AbortSignal) {
    return (text: string) => {
      if (signal?.aborted || this.state.session?.id !== sessionId) return;
      if (this.state.phase !== "generating") return;
      this.state.streamedNarration = text;
    };
  }

  /** Package guards, scene IDs and progress-ledger indexes for the cached package. */
  private packageMetadata(): Pick<
    CommitMetadata,
    | "packageSceneIds"
    | "packageRecordIds"
    | "packageGmOnlyText"
    | "packageRecordKinds"
    | "packageSceneBranches"
    | "packageActorIds"
  > {
    const session = this.state.session;
    const pkg = session && this.deps.packages.peek(session);
    if (!pkg) return {};
    return {
      ...packageProgressIndex(pkg),
      packageSceneIds: pkg.scenes.map((scene) => scene.id),
      packageRecordIds: adventureJsonHiddenRecordIds(pkg),
      packageGmOnlyText: adventureJsonGmOnlyText(pkg),
    };
  }

  newTurnMetadata(playerAction: string): CommitMetadata {
    return {
      turnId: this.deps.idGenerator(),
      inputId: this.deps.idGenerator(),
      playerAction,
      now: this.deps.now(),
      ...this.packageMetadata(),
    };
  }

  rollMetadata(inputId: string): CommitMetadata {
    return {
      turnId: this.deps.idGenerator(),
      inputId,
      now: this.deps.now(),
      ...this.packageMetadata(),
    };
  }

  async saveTurn(
    previous: AdventureSession,
    next: AdventureSession,
  ): Promise<AdventureSession> {
    const summaryLifecycle = this.summarizer.lifecycleToken();
    await this.verifySession(previous);
    let candidate = next;
    try {
      candidate = assignCommittedPlaceArtwork(
        previous,
        next,
        this.deps.artworkCatalogue(),
        themeStore.worldThemeId,
        artworkPreferences.enabled,
      );
    } catch {
      // Artwork is supplementary and cannot reject a valid narrative turn.
    }
    const saved = await this.deps.repository.save(previous.revision, candidate);
    if (!saved.ok) throw saved.error;
    this.assertCurrentSession(previous);
    // A provider reply is provisional until the OPFS write has succeeded.
    // A failed acknowledgement cannot undo a saved turn; discard the remote
    // optimization and reconstruct from saved local state on the next action.
    // Also discard retained provider history when the package scene changes so
    // GM-only context from the previous scene does not persist on the provider.
    const sceneChanged =
      previous.packageProgress?.sceneId !==
      saved.session.packageProgress?.sceneId;
    if (sceneChanged) {
      await this.deps
        .clearGenerationInteraction(saved.session.id)
        .catch(() => {});
    } else {
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
    }
    // Fold older turns into the story notes while the player reads.
    this.summarizer.schedule(saved.session, summaryLifecycle);
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
    this.state.errorMessage = turnErrorCopy(cause, message);
    this.state.phase =
      retryPhase === "ready" && message === "offline"
        ? "offline"
        : cancelled
          ? retryPhase
          : "error";
  }

  private async handleTurnGenerationFailure(
    cause: unknown,
    signal: AbortSignal,
    retryPhase: "ready" | "ready-to-resolve",
  ): Promise<void> {
    const isCurrentGeneration =
      !signal.aborted && this.generationController?.signal === signal;
    if (isCurrentGeneration && this.state.session) {
      await this.deps
        .clearGenerationInteraction(this.state.session.id)
        .catch(() => {});
    }
    if (
      cause instanceof Error &&
      cause.message === "adventure-package-unavailable" &&
      this.state.phase === "package-unavailable"
    )
      return;
    this.recordTurnGenerationError(cause, signal, retryPhase);
  }

  /**
   * Re-checks a package session's pin. On failure, enters the recoverable
   * `package-unavailable` state (when the signal is still current) and returns
   * false so the caller makes no model call.
   */
  async packageStillAvailable(signal: AbortSignal): Promise<boolean> {
    const session = this.state.session;
    if (!session?.sourcePackage) return true;
    const check = await this.deps.packages.verifyPin(session);
    if (check.status === "available") return true;
    if (!signal.aborted && this.generationController?.signal === signal) {
      await this.enterPackageUnavailable(check.otherVersionAvailable);
    }
    return false;
  }

  async enterPackageUnavailable(
    otherVersionAvailable: boolean | null,
  ): Promise<void> {
    this.state.phase = "package-unavailable";
    this.state.errorCause = "package-unavailable";
    this.state.packageUnavailable = { otherVersionAvailable };
    this.state.readOnly = true;
    this.state.streamedNarration = "";
    this.state.errorMessage = null;
    await this.deps.coordinator.stop();
    if (this.state.lease) {
      await this.deps.authority.release(this.state.lease);
      this.state.lease = null;
    }
  }

  async runTurnGeneration(
    generate: (signal: AbortSignal) => Promise<void>,
    retryPhase: "ready" | "ready-to-resolve",
  ): Promise<void> {
    const signal = this.startTurnGeneration();
    try {
      if (!(await this.packageStillAvailable(signal))) return;
      await generate(signal);
    } catch (cause) {
      // Discard any uncommitted remote response after a rejected patch,
      // cancelled generation, lost lease or failed local save.
      // An older cancelled turn may settle after a newer one has started.
      // Never clear the newer turn's provider context from that stale catch.
      await this.handleTurnGenerationFailure(cause, signal, retryPhase);
    } finally {
      this.endTurnGeneration(signal);
    }
  }
}
