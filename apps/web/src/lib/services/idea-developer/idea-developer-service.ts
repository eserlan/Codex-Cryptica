import {
  MAX_IDEA_LENGTH,
  canContinue,
  countDoneTurns,
  type Conversation,
  type Development,
  type FollowUpKind,
  type ModeId,
  type Turn,
} from "generator-engine";
import {
  conversationRecovery,
  type ConversationRecovery,
} from "./conversation-recovery";
import {
  turnRunner,
  type TurnFailure,
  type TurnOutcome,
  type TurnRunner,
} from "./turn-runner";
import { hubSync, type HubSync } from "./hub-sync";
import {
  ideaDeveloperUsageLimiter,
  type IdeaDeveloperUsageLimiter,
} from "./usage-limiter";

/**
 * Thin coordinator for the Idea Developer (#3228): checks the input, the turn
 * cap and the per-browser limit, hands the turn to the runner, and calls the
 * recovery and Session Hub modules. Each of those owns its own logic.
 */

export interface StartParams {
  idea: string;
  mode: ModeId;
  signal?: AbortSignal;
}

export type StartResult =
  | {
      status: "ok";
      development: Development;
      interactionId: string;
      ideaText: string;
      hubDraftId?: string;
    }
  | {
      status: "needs-rpg-idea";
      message?: string;
      interactionId: string;
      ideaText: string;
    }
  | { status: "rejected"; reason: "empty" | "too-long"; message: string }
  | {
      status: "limited";
      reason: "cooldown" | "period";
      retryAt: number;
      message: string;
    }
  | { status: "cancelled" }
  | { status: "failed"; ideaText: string; failure: TurnFailure };

export interface ContinueParams {
  conversation: Conversation;
  kind: FollowUpKind;
  text: string;
  /** The mode for this turn: the current mode, or the new one for a switch. */
  mode: ModeId;
  signal?: AbortSignal;
}

export type ContinueResult =
  | {
      status: "ok";
      development: Development;
      interactionId: string;
      turn: Turn;
    }
  | { status: "capped"; message: string }
  | { status: "rejected"; reason: "empty" | "too-long"; message: string }
  | {
      status: "limited";
      reason: "cooldown" | "period";
      retryAt: number;
      message: string;
    }
  | { status: "cancelled" }
  | { status: "failed"; failure: TurnFailure };

const LIMITED_MESSAGE =
  "You've made a lot of requests. Try again in a little while.";
const CAPPED_MESSAGE =
  "This conversation has reached its limit. Start a new one, or copy the result to keep it.";
const TOO_LONG_MESSAGE = `That is too long. Keep it under ${MAX_IDEA_LENGTH} characters and try again.`;
const EMPTY_MESSAGES: Record<FollowUpKind, string> = {
  "answer-questions": "Write your answers first, even short ones.",
  "change-part": "Say what you want changed first.",
  "switch-mode": "",
};

type Rejected = Extract<StartResult, { status: "rejected" }>;

/** Why this text cannot be sent, or null if it can. */
function textProblem(text: string, emptyMessage: string): Rejected | null {
  if (!text)
    return { status: "rejected", reason: "empty", message: emptyMessage };
  if (text.length > MAX_IDEA_LENGTH) {
    return {
      status: "rejected",
      reason: "too-long",
      message: TOO_LONG_MESSAGE,
    };
  }
  return null;
}

/** A mode switch carries no text, so it has nothing to check. */
function followUpProblem(kind: FollowUpKind, text: string): Rejected | null {
  return kind === "switch-mode"
    ? null
    : textProblem(text, EMPTY_MESSAGES[kind]);
}

export class IdeaDeveloperService {
  constructor(
    private readonly runner: Pick<
      TurnRunner,
      "runFirstTurn" | "runFollowUpTurn"
    > = turnRunner,
    private readonly limiter: Pick<
      IdeaDeveloperUsageLimiter,
      "check" | "record"
    > = ideaDeveloperUsageLimiter,
    private readonly hub: Pick<HubSync, "add" | "update"> = hubSync,
    private readonly recovery: Pick<
      ConversationRecovery,
      "recover"
    > = conversationRecovery,
  ) {}

  async start(params: StartParams): Promise<StartResult> {
    const ideaText = params.idea.trim();
    const problem = textProblem(
      ideaText,
      "Write an idea first, even a rough one.",
    );
    if (problem) return problem;

    const limited = this.gate();
    if (limited) return limited;

    const outcome = await this.runner.runFirstTurn({
      idea: ideaText,
      mode: params.mode,
      signal: params.signal,
    });
    return this.settleStart(outcome, ideaText);
  }

  /**
   * A turn after the first: answer the questions, ask for a change, or switch
   * mode. Only the new input is sent; the provider holds the earlier turns.
   */
  async continue(params: ContinueParams): Promise<ContinueResult> {
    const { conversation, kind } = params;
    const text = kind === "switch-mode" ? "" : params.text.trim();

    if (!canContinue(conversation.turns)) {
      return { status: "capped", message: CAPPED_MESSAGE };
    }
    const problem = followUpProblem(kind, text);
    if (problem) return problem;
    const limited = this.gate();
    if (limited) return limited;

    const outcome = await this.sendFollowUp(params, text);
    return this.settleFollowUp(outcome, params, text);
  }

  /** Checks the per-browser limit and, if allowed, counts this turn. */
  private gate(): Extract<StartResult, { status: "limited" }> | null {
    const check = this.limiter.check();
    if (!check.allowed) {
      return {
        status: "limited",
        reason: check.reason,
        retryAt: check.retryAt,
        message: LIMITED_MESSAGE,
      };
    }
    this.limiter.record();
    return null;
  }

  private settleStart(outcome: TurnOutcome, ideaText: string): StartResult {
    switch (outcome.kind) {
      case "development":
        return {
          status: "ok",
          development: outcome.development,
          interactionId: outcome.interactionId,
          ideaText,
          hubDraftId: this.addToHub(outcome.development, ideaText),
        };
      case "needs-rpg-idea":
        return {
          status: "needs-rpg-idea",
          message: outcome.message,
          interactionId: outcome.interactionId,
          ideaText,
        };
      case "cancelled":
        return { status: "cancelled" };
      case "failed":
        return { status: "failed", ideaText, failure: outcome.failure };
    }
  }

  /** Sends the turn; if the provider dropped the conversation, rebuilds it once. */
  private async sendFollowUp(
    params: ContinueParams,
    text: string,
  ): Promise<TurnOutcome> {
    const { conversation } = params;
    const turnParams = {
      kind: params.kind,
      text,
      mode: params.mode,
      turnIndex: countDoneTurns(conversation.turns),
      signal: params.signal,
    };
    const outcome = await this.runner.runFollowUpTurn({
      ...turnParams,
      previousInteractionId: conversation.previousInteractionId ?? "",
    });
    const expired =
      outcome.kind === "failed" && outcome.failure.code === "expired";
    return expired
      ? this.recovery.recover({ ...turnParams, conversation })
      : outcome;
  }

  private settleFollowUp(
    outcome: TurnOutcome,
    params: ContinueParams,
    text: string,
  ): ContinueResult {
    switch (outcome.kind) {
      case "development":
        this.updateHub(params.conversation, outcome.development);
        return {
          status: "ok",
          development: outcome.development,
          interactionId: outcome.interactionId,
          turn: {
            kind: params.kind,
            mode: params.mode,
            text,
            status: "done",
          },
        };
      case "needs-rpg-idea":
        return {
          status: "failed",
          failure: {
            code: "invalid-output",
            message: "That didn't read as a change to your idea. Try again.",
          },
        };
      case "cancelled":
        return { status: "cancelled" };
      case "failed":
        return { status: "failed", failure: outcome.failure };
    }
  }

  /** The hub is a convenience: a failure never stops the development showing. */
  private addToHub(
    development: Development,
    ideaText: string,
  ): string | undefined {
    try {
      return this.hub.add(development, ideaText);
    } catch {
      return undefined;
    }
  }

  private updateHub(
    conversation: Conversation,
    development: Development,
  ): void {
    if (!conversation.hubDraftId) return;
    try {
      this.hub.update(
        conversation.hubDraftId,
        development,
        conversation.ideaText,
      );
    } catch {
      // The hub is a convenience; the development is still shown.
    }
  }
}

export const ideaDeveloperService = new IdeaDeveloperService();
