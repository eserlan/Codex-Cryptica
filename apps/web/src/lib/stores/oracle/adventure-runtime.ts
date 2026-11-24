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
  authorisedPackageRevelationScope,
  detectHiddenTextLeakage,
  detectPackageTextLeakage,
  type AdventureSession,
  type AdventureTurnProposal,
  type CommitMetadata,
  type GenerationMetadata,
  type GenerationResetReason,
  type GenerationThreadMode,
  type LocalSaveOperation,
} from "@codex/adventure-engine";
import type { AdventureGenerationInfo } from "@codex/ai-engine";
import type { AdventureManagerDependencies } from "./adventure-dependencies";
import type { AdventureState } from "./adventure-state.svelte";
import { AdventureBackground } from "./adventure-background";
import { AdventureScenarios } from "./adventure-scenarios";
import { AdventurePlaceLinker } from "./adventure-places";
import { AdventureSummarizer } from "./adventure-summary";
import {
  AdventureTurnRejectedError,
  turnErrorCopy,
} from "./adventure-turn-retry";
import { AdventureArtworkSession } from "#lib/services/adventure/artwork/adventure-artwork-session.js";
import { assignCommittedPlaceArtwork } from "#lib/services/adventure/artwork/committed-place-artwork.js";
import { artworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";

/**
 * #5112: builds the committed-turn generation descriptor from the actual
 * transport decision recorded on the generation result. Fields this layer
 * cannot observe stay absent (`unknown`), never guessed.
 */
// fallow-ignore-next-line complexity
function addThreadDiagnostics(
  metadata: GenerationMetadata,
  info: AdventureGenerationInfo | undefined,
  extras: {
    threadMode?: GenerationThreadMode;
    resetReason?: GenerationResetReason;
  },
): void {
  metadata.threadMode =
    extras.threadMode ??
    (info?.transport === "stateless"
      ? "new"
      : extras.resetReason || info?.resetReason
        ? "reset"
        : info?.threadMode);
  const resetReason =
    info?.transport === "stateless"
      ? undefined
      : (extras.resetReason ?? info?.resetReason);
  if (resetReason) metadata.resetReason = resetReason;
  if (info?.directorDelivery) metadata.directorDelivery = info.directorDelivery;
}

// fallow-ignore-next-line complexity
function addPromptDiagnostics(
  metadata: GenerationMetadata,
  info: AdventureGenerationInfo | undefined,
  extras: {
    requestChars?: number;
    sourceCounts?: Record<string, number>;
    scenarioIds?: string[];
  },
): void {
  const requestChars = extras.requestChars ?? info?.requestChars;
  const sourceCounts = extras.sourceCounts ?? info?.sourceCounts;
  const scenarioIds = extras.scenarioIds ?? info?.scenarioIds;
  if (requestChars !== undefined) metadata.requestChars = requestChars;
  if (sourceCounts) metadata.sourceCounts = sourceCounts;
  if (scenarioIds) metadata.scenarioIds = scenarioIds;
}

export function generationDescriptorFor(
  proposal:
    | (AdventureTurnProposal & { generationInfo?: AdventureGenerationInfo })
    | undefined,
  extras: {
    modelKey?: string;
    requestChars?: number;
    sourceCounts?: Record<string, number>;
    scenarioIds?: string[];
    threadMode?: GenerationThreadMode;
    resetReason?: GenerationResetReason;
  } = {},
): GenerationMetadata | undefined {
  const info = proposal?.generationInfo;
  if (!info && !extras.resetReason && !extras.threadMode) return undefined;
  const metadata: GenerationMetadata = {};
  const modelKey = extras.modelKey ?? info?.modelKey;
  if (modelKey) metadata.modelKey = modelKey;
  if (info?.reasoningEffort) metadata.reasoningEffort = info.reasoningEffort;
  if (info?.transport) metadata.transport = info.transport;
  addThreadDiagnostics(metadata, info, extras);
  addPromptDiagnostics(metadata, info, extras);
  return metadata;
}

/**
 * #5112: the proposal declares a move to a different package scene, which is
 * exactly when `saveTurn` discards retained provider history.
 */
export function sceneBoundaryResetReason(
  session: AdventureSession,
  proposal: AdventureTurnProposal,
  sourcePackage?: Parameters<typeof packageProgressIndex>[0],
): GenerationResetReason | undefined {
  const sceneId =
    proposal.kind === "complete"
      ? proposal.visiblePatch.packageSceneId
      : undefined;
  if (
    sceneId !== undefined &&
    sourcePackage !== undefined &&
    packageProgressIndex(sourcePackage).packageSceneIds.includes(sceneId) &&
    sceneId !== session.packageProgress?.sceneId
  ) {
    return "scene-boundary";
  }
  return undefined;
}

/** Shared generation lifetime and persistence boundary for all workflows. */
export class AdventureRuntime {
  activeRestoreRequest = 0;
  generationController: AbortController | null = null;
  oocController: AbortController | null = null;
  private lastLocalSave: {
    sessionId: string;
    revision: number;
    op: LocalSaveOperation;
  } | null = null;
  readonly grounding: AdventureGroundingService;
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
    this.grounding = grounding;
    deps.generation = grounding.wrap(deps.generation);
    this.background = new AdventureBackground(deps.idGenerator, grounding, () =>
      genreForTheme(themeStore.worldThemeId),
    );
    this.summarizer = new AdventureSummarizer(state, deps);
    this.placeLinker = new AdventurePlaceLinker(deps);
    this.artwork = new AdventureArtworkSession(state, {
      verify: (lease) => deps.authority.verify(lease),
      save: async (revision, session) => {
        const res = await deps.repository.save(revision, session);
        if (res.ok) {
          await this.reconcileLocalSave("artwork-save", res.session, true);
        }
        return res;
      },
    });
    this.scenarios = new AdventureScenarios(
      state,
      deps,
      (session) => this.verifySession(session),
      (saved) => this.reconcileLocalSave("scenario-update", saved, true),
    );
  }

  /**
   * Records a local persistence operation and, when it does not invalidate
   * retained provider history, advances `confirmGenerationInteraction` to the
   * saved revision so subsequent Play turns stay `continued`.
   */
  async reconcileLocalSave(
    op: LocalSaveOperation,
    saved: AdventureSession,
    reconcileInteraction = true,
  ): Promise<void> {
    this.lastLocalSave = {
      sessionId: saved.id,
      revision: saved.revision,
      op,
    };
    if (!reconcileInteraction) return;
    try {
      await this.deps.confirmGenerationInteraction(saved.id, saved.revision);
    } catch {
      await this.deps.clearGenerationInteraction(saved.id).catch(() => {});
    }
  }

  revisionMismatchCauseFor(
    session: AdventureSession | null,
    resetReason: GenerationResetReason | undefined,
  ): LocalSaveOperation | undefined {
    if (resetReason !== "revision-mismatch" || !session) return undefined;
    if (!this.lastLocalSave || this.lastLocalSave.sessionId !== session.id) {
      return "unknown";
    }
    return this.lastLocalSave.revision === session.revision
      ? this.lastLocalSave.op
      : "external-or-concurrent";
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
    const session = this.state.session;
    const guardMeta = session?.id === sessionId ? this.packageMetadata() : {};
    let suppressed = false;
    return (text: string) => {
      if (signal?.aborted || this.state.session?.id !== sessionId) return;
      if (this.state.phase !== "generating" || suppressed) return;
      const currentSession = this.state.session;
      if (
        detectHiddenTextLeakage(currentSession, text).length > 0 ||
        detectPackageTextLeakage(text, guardMeta, currentSession).length > 0
      ) {
        suppressed = true;
        this.state.streamedNarration = "";
        return;
      }
      this.state.streamedNarration = text;
    };
  }

  /** Package guards, scene IDs and progress-ledger indexes for the cached package. */
  packageMetadata(): Pick<
    CommitMetadata,
    | "packageSceneIds"
    | "packageRecordIds"
    | "packageGmOnlyText"
    | "packageSecretTexts"
    | "packageRecordKinds"
    | "packageSceneBranches"
    | "packageActorIds"
  > {
    const session = this.state.session;
    const pkg = session && this.deps.packages.peek(session);
    if (!pkg) return {};
    const scope = authorisedPackageRevelationScope(session.packageProgress);
    return {
      ...packageProgressIndex(pkg),
      packageSceneIds: pkg.scenes.map((scene) => scene.id),
      packageRecordIds: adventureJsonHiddenRecordIds(pkg),
      packageGmOnlyText: adventureJsonGmOnlyText(pkg, scope),
      packageSecretTexts: Object.fromEntries(
        pkg.secrets.map((secret) => [secret.id, secret.text]),
      ),
    };
  }

  /**
   * Persists an OOC exchange update and reconciles the retained Play
   * interaction revision for the `+1` local save without writing OOC turns
   * into remote provider history, artwork reveals, or story-so-far summaries.
   */
  async saveOocExchange(
    previous: AdventureSession,
    next: AdventureSession,
  ): Promise<AdventureSession> {
    await this.verifySession(previous);
    const saved = await this.deps.repository.save(previous.revision, next);
    if (!saved.ok) throw saved.error;
    this.assertCurrentSession(previous);
    this.lastLocalSave = {
      sessionId: saved.session.id,
      revision: saved.session.revision,
      op: "turn-commit",
    };
    this.state.session = saved.session;
    this.lastLocalSave = {
      sessionId: saved.session.id,
      revision: saved.session.revision,
      op: "ooc-exchange",
    };
    await this.deps.confirmGenerationInteraction(
      saved.session.id,
      saved.session.revision,
    );
    return saved.session;
  }

  private withMismatchCause(
    generation?: GenerationMetadata,
  ): GenerationMetadata | undefined {
    if (
      !generation ||
      generation.resetReason !== "revision-mismatch" ||
      generation.revisionMismatchCause
    ) {
      return generation;
    }
    const cause =
      this.revisionMismatchCauseFor(this.state.session, "revision-mismatch") ??
      "unknown";
    return { ...generation, revisionMismatchCause: cause };
  }

  newTurnMetadata(
    playerAction: string,
    generation?: GenerationMetadata,
  ): CommitMetadata {
    const enriched = this.withMismatchCause(generation);
    return {
      turnId: this.deps.idGenerator(),
      inputId: this.deps.idGenerator(),
      playerAction,
      now: this.deps.now(),
      ...this.packageMetadata(),
      ...(enriched ? { generation: enriched } : {}),
    };
  }

  rollMetadata(
    inputId: string,
    generation?: GenerationMetadata,
  ): CommitMetadata {
    const enriched = this.withMismatchCause(generation);
    return {
      turnId: this.deps.idGenerator(),
      inputId,
      now: this.deps.now(),
      ...this.packageMetadata(),
      ...(enriched ? { generation: enriched } : {}),
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
    this.lastLocalSave = {
      sessionId: saved.session.id,
      revision: saved.session.revision,
      op: "turn-commit",
    };
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
    this.state.lastTurnRejection = null;
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

  private toTurnRejection(cause: unknown) {
    if (!(cause instanceof AdventureTurnRejectedError)) return null;
    return {
      reason: cause.reason,
      ...(cause.diagnostic ? { diagnostic: cause.diagnostic } : {}),
      revision: this.state.session?.revision ?? 0,
      recordedAt: this.deps.now(),
    };
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
    const turnRejection = this.toTurnRejection(cause);
    if (turnRejection) this.state.lastTurnRejection = turnRejection;
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
