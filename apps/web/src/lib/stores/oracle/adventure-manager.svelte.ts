import {
  applyCompletedTurn,
  applyRollRequest,
  createPlayerTranscript,
  dismissPendingRoll,
  recordPendingRollOutcome,
  resolveRecordedRoll,
  type AdventureSession,
  type CommitMetadata,
  type PlayerCharacter,
  type SuppliedRollOutcome,
} from "@codex/adventure-engine";
import type { AdventureTurnGenerationService } from "@codex/ai-engine";
import {
  adventureControlAuthority,
  type AdventureControlAuthority,
  type AdventureControlLease,
} from "$lib/services/adventure/adventure-control-lease";
import {
  adventureControlCoordinator,
  type AdventureControlCoordinator,
} from "$lib/services/adventure/adventure-control-coordinator";
import {
  adventureSessionRepository,
  type AdventureSessionRepository,
} from "$lib/services/adventure/adventure-session-repository";
import {
  adventureContextService,
  type AdventureContextService,
} from "$lib/services/adventure/adventure-context-service";
import { adventureTurnGenerationService } from "@codex/ai-engine";
import { oracleBridge } from "$lib/cloud-bridge/oracle-bridge";
import { diceEngine as defaultDiceEngine, diceParser } from "dice-engine";

export interface AdventureManagerDependencies {
  repository?: AdventureSessionRepository;
  generation?: Pick<AdventureTurnGenerationService, "generate">;
  clearGenerationInteraction?: (sessionId: string) => Promise<void>;
  context?: AdventureContextService;
  authority?: AdventureControlAuthority;
  coordinator?: AdventureControlCoordinator;
  now?: () => string;
  dice?: Pick<typeof defaultDiceEngine, "evaluate">;
}

function newId(): string {
  return crypto.randomUUID();
}

function validateRollExpression(proposal: {
  kind: string;
  dice?: { expression: string };
}): void {
  if (proposal.kind === "roll-required" && proposal.dice) {
    diceParser.parse(proposal.dice.expression);
  }
}

function initialSession(input: {
  vaultId: string;
  title: string;
  premise: string;
  playerCharacter: PlayerCharacter;
  sourceRecords?: AdventureSession["sourceRecords"];
  now: string;
}): AdventureSession {
  return {
    schemaVersion: 1,
    id: newId(),
    vaultId: input.vaultId,
    title: input.title,
    status: "active",
    createdAt: input.now,
    updatedAt: input.now,
    lastPlayedAt: input.now,
    revision: 0,
    playerCharacter: input.playerCharacter,
    premise: input.premise,
    sourceRecords: input.sourceRecords ?? [],
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: { secrets: [], gmThreads: [] },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
  };
}

export class AdventureManager {
  session = $state.raw<AdventureSession | null>(null);
  phase = $state<
    | "idle"
    | "starting"
    | "ready"
    | "generating"
    | "awaiting-roll"
    | "ready-to-resolve"
    | "offline"
    | "error"
  >("idle");
  draft = $state("");
  errorMessage = $state<string | null>(null);
  lastRollResult = $state<string | null>(null);
  readOnly = $state(false);
  lease = $state<AdventureControlLease | null>(null);

  get transcript() {
    return this.session ? createPlayerTranscript(this.session) : null;
  }

  get suggestedActions() {
    if (!this.session) return [];
    return (
      this.session.pendingRoll?.suggestedActions ??
      this.session.turns.at(-1)?.suggestedActions ??
      []
    );
  }

  private readonly deps: Required<AdventureManagerDependencies>;
  private generationController: AbortController | null = null;

  private async verifyControl(): Promise<void> {
    if (!this.lease || !(await this.deps.authority.verify(this.lease))) {
      throw new Error("control-lost");
    }
  }

  constructor(deps: AdventureManagerDependencies = {}) {
    this.deps = {
      repository: deps.repository ?? adventureSessionRepository,
      generation: deps.generation ?? {
        generate: (request: any, options?: any) => {
          if (oracleBridge.isReady) {
            // AbortSignal is not structured-cloneable and must not cross Comlink.
            const { signal: _signal, ...workerOptions } = options ?? {};
            return oracleBridge.generateAdventureTurn(
              request,
              workerOptions,
            ) as any;
          }
          return adventureTurnGenerationService.generate(request, options);
        },
      },
      clearGenerationInteraction:
        deps.clearGenerationInteraction ??
        ((sessionId) =>
          oracleBridge.isReady
            ? oracleBridge.clearAdventureInteraction(sessionId)
            : Promise.resolve(
                adventureTurnGenerationService.clearInteraction(sessionId),
              )),
      context: deps.context ?? adventureContextService,
      authority: deps.authority ?? adventureControlAuthority,
      coordinator: deps.coordinator ?? adventureControlCoordinator,
      now: deps.now ?? (() => new Date().toISOString()),
      dice: deps.dice ?? defaultDiceEngine,
    };
  }

  async start(input: {
    vaultId: string;
    title: string;
    premise: string;
    playerCharacter: PlayerCharacter;
    sourceRecords?: AdventureSession["sourceRecords"];
  }): Promise<AdventureSession> {
    if (!input.premise.trim() || !input.title.trim())
      throw new Error("premise-and-title-required");
    this.phase = "starting";
    this.errorMessage = null;
    const current = await this.deps.repository.list(input.vaultId);
    if (current.effectiveActiveId) {
      const existing = await this.deps.repository.load(
        input.vaultId,
        current.effectiveActiveId,
      );
      const isIncompleteStart =
        existing.condition !== "unreadable" &&
        existing.session.status === "active" &&
        existing.session.turns.length === 0;
      if (isIncompleteStart) {
        const recovery = await this.deps.authority.acquire({
          vaultId: input.vaultId,
          sessionId: existing.session.id,
        });
        if (recovery.ok) {
          const archived = await this.deps.repository.archive(
            input.vaultId,
            existing.session.id,
            existing.session.revision,
          );
          await this.deps.authority.release(recovery.lease);
          if (!archived.ok) {
            this.phase = "error";
            this.errorMessage = archived.error.message;
            throw archived.error;
          }
        } else {
          this.phase = "ready";
          throw new Error("active-adventure-exists");
        }
      } else {
        this.phase = "ready";
        throw new Error("active-adventure-exists");
      }
    }
    const session = initialSession({ ...input, now: this.deps.now() });
    const saved = await this.deps.repository.save(null, session);
    if (!saved.ok) {
      this.phase = "error";
      this.errorMessage = saved.error.message;
      throw saved.error;
    }
    this.session = saved.session;
    const acquired = await this.deps.authority.acquire({
      vaultId: input.vaultId,
      sessionId: saved.session.id,
    });
    if (acquired.ok) {
      this.lease = acquired.lease;
      this.deps.coordinator.start(acquired.lease);
    } else {
      this.readOnly = true;
    }
    this.phase = "ready";
    if (
      !this.readOnly &&
      (typeof navigator === "undefined" || navigator.onLine)
    ) {
      await this.generateOpening(saved.session);
    } else if (!this.readOnly) {
      this.phase = "offline";
    }
    return this.session ?? saved.session;
  }

  private async generateOpening(session: AdventureSession): Promise<void> {
    if (!this.lease || !(await this.deps.authority.verify(this.lease))) return;
    this.phase = "generating";
    try {
      const anchors = await this.deps.context.resolveAnchors(session);
      const relevant = await this.deps.context.resolveOpeningRelevant(session);
      const proposal = await this.deps.generation.generate({
        session,
        phase: "opening",
        anchors,
        relevant,
      });
      validateRollExpression(proposal);
      const meta: CommitMetadata = {
        turnId: newId(),
        inputId: newId(),
        playerAction: "",
        now: this.deps.now(),
      };
      const result =
        proposal.kind === "roll-required"
          ? applyRollRequest(session, proposal, meta)
          : applyCompletedTurn(session, proposal, meta);
      if (!result.ok)
        throw new Error(result.errors[0]?.message ?? "opening-rejected");
      await this.verifyControl();
      const saved = await this.deps.repository.save(
        session.revision,
        result.value,
      );
      if (!saved.ok) throw saved.error;
      this.session = saved.session;
      this.phase = saved.session.pendingRoll ? "awaiting-roll" : "ready";
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const archived = await this.deps.repository.archive(
        session.vaultId,
        session.id,
        session.revision,
      );
      if (archived.ok) {
        void this.deps.clearGenerationInteraction(session.id);
        this.session = null;
        this.readOnly = false;
        await this.deps.coordinator.stop();
        this.lease = null;
      } else {
        this.errorMessage = `${message}; failed to clean up the incomplete adventure: ${archived.error.message}`;
      }
      this.errorMessage ??= message;
      this.phase = this.errorMessage === "offline" ? "offline" : "error";
    }
  }

  async open(vaultId: string, sessionId: string): Promise<void> {
    const loaded = await this.deps.repository.load(vaultId, sessionId);
    if (loaded.condition === "unreadable") throw loaded.error;
    this.session = loaded.session;
    this.readOnly =
      loaded.condition === "duplicate-active-conflict" ||
      loaded.session.status === "archived";
    if (!this.readOnly && loaded.session.status === "active") {
      const acquired = await this.deps.authority.acquire({
        vaultId,
        sessionId,
      });
      if (!acquired.ok) {
        this.readOnly = true;
      } else {
        this.lease = acquired.lease;
        this.deps.coordinator.start(acquired.lease);
      }
    }
    this.phase = loaded.session.pendingRoll?.suppliedOutcome
      ? "ready-to-resolve"
      : loaded.session.pendingRoll
        ? "awaiting-roll"
        : "ready";
    if (
      !this.readOnly &&
      loaded.session.pendingRoll?.suppliedOutcome &&
      this.lease
    ) {
      await this.resolveRoll();
    }
  }

  async openActive(vaultId: string): Promise<boolean> {
    if (this.session?.vaultId === vaultId && this.session.status === "active") {
      return true;
    }
    if (this.session && this.session.vaultId !== vaultId) {
      await this.destroy();
      this.session = null;
      this.readOnly = false;
      this.draft = "";
      this.errorMessage = null;
      this.lastRollResult = null;
      this.phase = "idle";
    }
    const { effectiveActiveId } = await this.deps.repository.list(vaultId);
    if (!effectiveActiveId) return false;
    await this.open(vaultId, effectiveActiveId);
    return true;
  }

  async submitAction(action = this.draft, preserveDraft = true): Promise<void> {
    if (
      !this.session ||
      this.readOnly ||
      !action.trim() ||
      this.phase === "generating"
    )
      return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (preserveDraft) this.draft = action;
      this.phase = "offline";
      return;
    }
    const session = this.session;
    if (preserveDraft) this.draft = action;
    this.phase = "generating";
    this.errorMessage = null;
    this.generationController?.abort();
    this.generationController = new AbortController();
    const signal = this.generationController.signal;
    try {
      await this.verifyControl();
      const anchors = await this.deps.context.resolveAnchors(session);
      const relevant = await this.deps.context.resolveActionRelevant(
        session,
        action,
      );
      const proposal = await this.deps.generation.generate(
        { session, phase: "action", playerAction: action, anchors, relevant },
        { signal },
      );
      validateRollExpression(proposal);
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const meta: CommitMetadata = {
        turnId: newId(),
        inputId: newId(),
        playerAction: action,
        now: this.deps.now(),
      };
      const result =
        proposal.kind === "roll-required"
          ? applyRollRequest(session, proposal, meta)
          : applyCompletedTurn(session, proposal, meta);
      if (!result.ok)
        throw new Error(result.errors[0]?.message ?? "turn-rejected");
      await this.verifyControl();
      const saved = await this.deps.repository.save(
        session.revision,
        result.value,
      );
      if (!saved.ok) throw saved.error;
      this.session = saved.session;
      this.draft = "";
      this.phase = saved.session.pendingRoll ? "awaiting-roll" : "ready";
    } catch (cause) {
      if (signal.aborted) return;
      this.errorMessage =
        cause instanceof Error ? cause.message : String(cause);
      const cancelled =
        cause instanceof DOMException && cause.name === "AbortError";
      this.phase =
        this.errorMessage === "offline"
          ? "offline"
          : cancelled || this.errorMessage === "cancelled"
            ? "ready"
            : "error";
    } finally {
      if (this.generationController?.signal === signal)
        this.generationController = null;
    }
  }

  async submitSuggestedAction(action: string): Promise<void> {
    await this.submitAction(action, false);
  }

  async recordRollOutcome(outcome: SuppliedRollOutcome): Promise<void> {
    if (!this.session?.pendingRoll || this.readOnly) return;
    try {
      await this.verifyControl();
      const result = recordPendingRollOutcome(
        this.session,
        this.session.pendingRoll.inputId,
        outcome,
        {
          turnId: newId(),
          inputId: this.session.pendingRoll.inputId,
          now: this.deps.now(),
        },
      );
      if (!result.ok)
        throw new Error(result.errors[0]?.message ?? "invalid-roll");
      await this.verifyControl();
      const saved = await this.deps.repository.save(
        this.session.revision,
        result.value,
      );
      if (!saved.ok) throw saved.error;
      this.session = saved.session;
      this.errorMessage = null;
      this.phase = "ready-to-resolve";
      await this.resolveRoll();
    } catch (cause) {
      this.errorMessage =
        cause instanceof Error
          ? cause.message
          : "Unable to record the roll outcome.";
    }
  }

  async rollCodexDice(): Promise<void> {
    const expression = this.session?.pendingRoll?.dice?.expression;
    if (!expression || this.session?.pendingRoll?.suppliedOutcome) return;
    let result: ReturnType<typeof this.deps.dice.evaluate>;
    try {
      result = this.deps.dice.evaluate(expression);
    } catch (cause) {
      this.errorMessage =
        cause instanceof Error
          ? `Invalid roll expression: ${cause.message}`
          : "Invalid roll expression.";
      return;
    }
    this.lastRollResult = `${expression} = ${result.total}`;
    await this.recordRollOutcome({
      kind: "numeric",
      value: result.total,
      label: `${expression} = ${result.total}`,
    });
  }

  async resolveRoll(): Promise<void> {
    const pendingRoll = this.session?.pendingRoll;
    if (!pendingRoll?.suppliedOutcome || this.readOnly || !this.session) return;
    this.phase = "generating";
    const session = this.session;
    this.generationController?.abort();
    this.generationController = new AbortController();
    const signal = this.generationController.signal;
    try {
      const anchors = await this.deps.context.resolveAnchors(session);
      const proposal = await this.deps.generation.generate(
        {
          session,
          phase: "roll-resolution",
          rollResolution: pendingRoll.suppliedOutcome,
          anchors,
          relevant: [],
        },
        { signal },
      );
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      if (proposal.kind !== "complete")
        throw new Error("roll-resolution-requires-complete-turn");
      const result = resolveRecordedRoll(session, proposal, {
        turnId: newId(),
        inputId: newId(),
        now: this.deps.now(),
        playerAction: pendingRoll.playerAction,
      });
      if (!result.ok)
        throw new Error(result.errors[0]?.message ?? "roll-rejected");
      await this.verifyControl();
      const saved = await this.deps.repository.save(
        session.revision,
        result.value,
      );
      if (!saved.ok) throw saved.error;
      this.session = saved.session;
      this.phase = "ready";
    } catch (cause) {
      if (signal.aborted) return;
      this.errorMessage =
        cause instanceof Error ? cause.message : String(cause);
      const cancelled =
        cause instanceof DOMException && cause.name === "AbortError";
      this.phase =
        cancelled || this.errorMessage === "cancelled"
          ? "ready-to-resolve"
          : "error";
    } finally {
      if (this.generationController?.signal === signal)
        this.generationController = null;
    }
  }

  cancel(): void {
    if (this.phase !== "generating") return;
    this.generationController?.abort();
    if (this.session)
      void this.deps.clearGenerationInteraction(this.session.id);
    this.generationController = null;
    this.errorMessage = null;
    this.phase = this.session?.pendingRoll?.suppliedOutcome
      ? "ready-to-resolve"
      : "ready";
  }

  async dismissRoll(): Promise<void> {
    if (!this.session?.pendingRoll || this.readOnly) return;
    const result = dismissPendingRoll(
      this.session,
      this.session.pendingRoll.inputId,
      {
        turnId: newId(),
        inputId: this.session.pendingRoll.inputId,
        now: this.deps.now(),
      },
    );
    if (!result.ok)
      throw new Error(result.errors[0]?.message ?? "invalid-roll");
    const saved = await this.deps.repository.save(
      this.session.revision,
      result.value,
    );
    if (!saved.ok) throw saved.error;
    this.session = saved.session;
    this.phase = "ready";
  }

  async end(): Promise<void> {
    if (!this.session || this.readOnly) return;
    const result = await this.deps.repository.archive(
      this.session.vaultId,
      this.session.id,
      this.session.revision,
    );
    if (!result.ok) throw result.error;
    this.session = result.session;
    void this.deps.clearGenerationInteraction(result.session.id);
    this.readOnly = true;
    await this.deps.coordinator.stop();
    this.lease = null;
    this.phase = "ready";
  }

  async destroy(): Promise<void> {
    this.generationController?.abort();
    this.generationController = null;
    await this.deps.coordinator.stop();
    this.lease = null;
  }
}

export const adventureManager = new AdventureManager();
