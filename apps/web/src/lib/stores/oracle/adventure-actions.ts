import {
  guardAdventureOocAnswer,
  MAX_TEXT_CHARS,
  isInWorldActionQuestion,
  OOC_REDIRECT_TO_PLAY_REPLY,
  upsertAdventureOocExchange,
  type AdventureOocExchange,
  type AdventureSession,
} from "@codex/adventure-engine";
import { proposedSession, validateRollExpression } from "./adventure-session";
import { generateAcceptedTurn } from "./adventure-turn-retry";
import { abortReason } from "./adventure-generation.svelte";

import type { AdventureRuntime } from "./adventure-runtime";

function getOocFailureMessage(cause: unknown, signal: AbortSignal): string {
  if (signal.aborted) return "Question cancelled.";
  if (cause instanceof Error) return cause.message;
  return String(cause);
}

function isCurrentOocRequest(
  current: AdventureSession | null,
  initialSession: AdventureSession,
  readOnly: boolean,
  activeSignal: AbortSignal | undefined,
  signal: AbortSignal,
): current is AdventureSession {
  return Boolean(
    current &&
    current.id === initialSession.id &&
    current.vaultId === initialSession.vaultId &&
    !readOnly &&
    activeSignal === signal,
  );
}

function hasPendingOocExchange(
  session: AdventureSession,
  exchangeId: string,
): boolean {
  return Boolean(
    session.oocExchanges?.some(
      (item) => item.id === exchangeId && item.status === "pending",
    ),
  );
}

export class AdventureActions {
  private readonly state;
  constructor(private readonly runtime: AdventureRuntime) {
    this.state = runtime.state;
  }

  setComposerMode(mode: "play" | "ooc"): void {
    this.state.composerMode = mode;
    this.state.oocErrorMessage = null;
  }

  private canSubmitAction(action: string): boolean {
    return Boolean(
      this.state.session &&
      !this.state.readOnly &&
      action.trim() &&
      this.state.phase !== "generating" &&
      !this.state.oocGenerating,
    );
  }

  private canSubmitOoc(question: string): boolean {
    return Boolean(
      this.state.session &&
      !this.state.readOnly &&
      question.trim() &&
      !this.state.rollMutationPending &&
      this.state.phase !== "generating" &&
      !this.state.oocGenerating,
    );
  }

  private async saveGeneratedAction(
    session: AdventureSession,
    action: string,
    signal: AbortSignal,
  ): Promise<void> {
    const next = await generateAcceptedTurn({
      generate: (correction) =>
        this.generateActionProposal(session, action, signal, correction),
      apply: ({ prepared, proposal }) => {
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
        validateRollExpression(proposal);
        return proposedSession(
          prepared,
          proposal,
          this.runtime.newTurnMetadata(action),
          "turn-rejected",
        );
      },
      signal,
      resetProviderContext: () =>
        this.runtime.deps.clearGenerationInteraction(session.id),
    });
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
    correction?: string,
  ) {
    await this.runtime.verifyControl();
    // Older World Entry sessions began without background situations.
    // Seed on their next committed action too, without mutating the persisted
    // session until the same optimistic-concurrency save succeeds.
    const prepared = await this.runtime.placeLinker.link(
      this.runtime.summarizer.attach(
        await this.runtime.background.prepare(session, signal),
      ),
    );
    if (signal.aborted) throw abortReason(signal);
    const proposal = await this.runtime.deps.generation.generate(
      {
        session: prepared,
        phase: "action",
        playerAction: action,
        anchors: [],
        relevant: [],
        ...(correction ? { correction } : {}),
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
    this.state.composerMode = "play";
    await this.submitAction(action);
  }

  async submitOocQuestion(
    question = this.state.oocDraft,
    preserveDraft = true,
  ): Promise<void> {
    if (!this.canSubmitOoc(question)) return;
    const trimmed = question.trim();
    if (preserveDraft) this.state.oocDraft = question;
    if (trimmed.length > MAX_TEXT_CHARS) {
      this.state.oocErrorMessage = `Question must be ${MAX_TEXT_CHARS} characters or fewer.`;
      return;
    }
    await this.runOocExchange({
      id: this.runtime.deps.idGenerator(),
      question: trimmed,
      afterTurnCount: this.state.session!.turns.length,
      createdAt: this.runtime.deps.now(),
      clearDraftOnSuccess: true,
    });
  }

  async retryOocQuestion(exchangeId: string): Promise<void> {
    const session = this.state.session;
    if (
      !session ||
      this.state.readOnly ||
      this.state.phase === "generating" ||
      this.state.oocGenerating
    ) {
      return;
    }
    const existing = session.oocExchanges?.find(
      (item) => item.id === exchangeId,
    );
    if (!existing) return;
    await this.runOocExchange({
      id: existing.id,
      question: existing.question,
      afterTurnCount: existing.afterTurnCount,
      createdAt: existing.createdAt,
      clearDraftOnSuccess: false,
    });
  }

  private async runOocExchange(params: {
    id: string;
    question: string;
    afterTurnCount: number;
    createdAt: string;
    clearDraftOnSuccess: boolean;
  }): Promise<void> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.state.oocErrorMessage = "offline";
      return;
    }
    const initialSession = this.state.session!;
    this.runtime.oocController?.abort();
    const controller = new AbortController();
    this.runtime.oocController = controller;
    const signal = controller.signal;
    this.state.oocGenerating = true;
    this.state.oocErrorMessage = null;

    try {
      await this.executeOocExchange(initialSession, params, signal);
    } catch (cause) {
      await this.recordFailedOocExchange(initialSession, params, cause, signal);
    } finally {
      if (this.runtime.oocController === controller) {
        this.runtime.oocController = null;
        this.state.oocGenerating = false;
      }
    }
  }

  private async executeOocExchange(
    initialSession: AdventureSession,
    params: {
      id: string;
      question: string;
      afterTurnCount: number;
      createdAt: string;
      clearDraftOnSuccess: boolean;
    },
    signal: AbortSignal,
  ): Promise<void> {
    if (!(await this.runtime.packageStillAvailable(signal))) return;
    const now = this.runtime.deps.now();
    const pendingExchange: AdventureOocExchange = {
      id: params.id,
      kind: "ooc",
      question: params.question,
      status: "pending",
      afterTurnCount: params.afterTurnCount,
      createdAt: params.createdAt,
      updatedAt: now,
    };
    const withPending = await this.runtime.saveOocExchange(
      initialSession,
      upsertAdventureOocExchange(initialSession, pendingExchange, now),
    );
    const finalAnswer = await this.resolveOocAnswer(
      withPending,
      params.question,
      signal,
    );
    const answeredAt = this.runtime.deps.now();
    const answeredExchange: AdventureOocExchange = {
      ...pendingExchange,
      answer: finalAnswer,
      status: "answered",
      updatedAt: answeredAt,
    };
    await this.runtime.saveOocExchange(
      withPending,
      upsertAdventureOocExchange(withPending, answeredExchange, answeredAt),
    );
    if (params.clearDraftOnSuccess) {
      this.state.oocDraft = "";
    }
  }

  private async resolveOocAnswer(
    session: AdventureSession,
    question: string,
    signal: AbortSignal,
  ): Promise<string> {
    if (signal.aborted) throw abortReason(signal);
    if (isInWorldActionQuestion(question)) {
      return OOC_REDIRECT_TO_PLAY_REPLY;
    }
    const request = await this.runtime.grounding.prepareOoc(
      session,
      question,
      signal,
    );
    if (signal.aborted) throw abortReason(signal);
    const response = await this.runtime.deps.ooc.ask(request, { signal });
    if (signal.aborted) throw abortReason(signal);
    return guardAdventureOocAnswer(
      response.answer,
      session,
      this.runtime.packageMetadata(),
    ).answer;
  }

  private async recordFailedOocExchange(
    initialSession: AdventureSession,
    params: {
      id: string;
      question: string;
      afterTurnCount: number;
      createdAt: string;
    },
    cause: unknown,
    signal: AbortSignal,
  ): Promise<void> {
    const message = getOocFailureMessage(cause, signal);
    const current = this.state.session;
    if (
      !isCurrentOocRequest(
        current,
        initialSession,
        this.state.readOnly,
        this.runtime.oocController?.signal,
        signal,
      )
    ) {
      return;
    }
    this.state.oocErrorMessage = message;
    if (signal.aborted && !hasPendingOocExchange(current, params.id)) return;
    const failedAt = this.runtime.deps.now();
    const failedExchange: AdventureOocExchange = {
      id: params.id,
      kind: "ooc",
      question: params.question,
      status: "failed",
      errorMessage: message.slice(0, 600),
      afterTurnCount: params.afterTurnCount,
      createdAt: params.createdAt,
      updatedAt: failedAt,
    };
    await this.runtime
      .saveOocExchange(
        current,
        upsertAdventureOocExchange(current, failedExchange, failedAt),
      )
      .catch(() => {});
  }
}
