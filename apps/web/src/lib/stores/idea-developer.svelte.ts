import {
  DEFAULT_MODE,
  canContinue,
  countDoneTurns,
  type Conversation,
  type FollowUpKind,
  type ModeId,
} from "generator-engine";
import {
  ideaDeveloperTracker,
  type IdeaDeveloperTracker,
} from "$lib/services/analytics/idea-developer-tracking";
import { hubSync, type HubSync } from "$lib/services/idea-developer/hub-sync";
import {
  ideaDeveloperService,
  type ContinueResult,
  type IdeaDeveloperService,
  type StartResult,
} from "$lib/services/idea-developer/idea-developer-service";
import {
  noticeFor,
  type IdeaDeveloperNotice,
} from "$lib/services/idea-developer/notices";
import {
  parseStoredSession,
  serialiseSession,
} from "$lib/services/idea-developer/session-storage";
import {
  browserSessionStorage,
  type StorageLike,
} from "$lib/utils/runtime-deps";

/**
 * State for the public Idea Developer tool (#3228).
 *
 * Holds the idea being typed, the current conversation, and what the last
 * action produced. The session lives in `sessionStorage`, so a reload or back
 * navigation restores it and closing the tab clears it (FR-030). Nothing here
 * touches a server; the service does the request.
 */

export const IDEA_DEVELOPER_SESSION_KEY = "idea-developer-session";

export type { IdeaDeveloperNotice };

export type IdeaDeveloperStatus =
  "empty" | "editing" | "submitting" | "active" | "failed";

type Started = Extract<StartResult, { status: "ok" }>;
type Continued = Extract<ContinueResult, { status: "ok" }>;

/** A request was sent unless it was refused before sending. */
function wasSent(result: StartResult | ContinueResult): boolean {
  return result.status !== "rejected" && result.status !== "limited";
}

export class IdeaDeveloperStore {
  status = $state<IdeaDeveloperStatus>("empty");
  ideaDraft = $state("");
  mode = $state<ModeId>(DEFAULT_MODE);
  conversation = $state<Conversation | null>(null);
  notice = $state<IdeaDeveloperNotice | null>(null);
  /** Text typed for the next turn: answers to the questions, or a requested change. */
  followUpText = $state("");
  /** True while a turn after the first is running. */
  turnRunning = $state(false);

  private controller: AbortController | null = null;
  /**
   * Bumped whenever the tool is cleared. A turn that finishes after that is for
   * a conversation the user has already discarded, so its result is ignored.
   */
  private generation = 0;

  constructor(
    private readonly service: Pick<
      IdeaDeveloperService,
      "start" | "continue"
    > = ideaDeveloperService,
    private readonly storage: StorageLike = browserSessionStorage,
    private readonly hub: Pick<HubSync, "remove" | "exists"> = hubSync,
    private readonly tracker: Pick<
      IdeaDeveloperTracker,
      "submitted" | "turnSubmitted" | "resultShown"
    > = ideaDeveloperTracker,
  ) {
    if (typeof window !== "undefined" || storage !== browserSessionStorage) {
      this.restore();
    }
  }

  setIdea(text: string): void {
    this.ideaDraft = text;
    if (this.status === "submitting" || this.status === "active") return;
    this.notice = null;
    this.status = text.trim() ? "editing" : "empty";
  }

  setMode(mode: ModeId): void {
    this.mode = mode;
    this.save();
  }

  setFollowUp(text: string): void {
    this.followUpText = text;
  }

  /** The mode the conversation is currently in: that of its latest turn. */
  get conversationMode(): ModeId {
    const turns = this.conversation?.turns ?? [];
    const last = [...turns].reverse().find((turn) => turn.status === "done");
    return last?.mode ?? this.mode;
  }

  /** Whether the turn cap has been reached for this conversation. */
  get capped(): boolean {
    return !!this.conversation && !canContinue(this.conversation.turns);
  }

  async submit(): Promise<void> {
    if (this.status === "submitting") return;
    const generation = this.generation;
    const controller = new AbortController();
    this.controller = controller;
    this.notice = null;
    this.status = "submitting";

    const result = await this.startTurn(controller.signal);
    if (generation !== this.generation) return;
    this.controller = null;

    if (wasSent(result)) this.tracker.submitted({ mode: this.mode });
    this.applyStart(result);
    this.save();
  }

  /**
   * A turn after the first: answer the questions, ask for a change, or switch
   * mode. The conversation is only changed if the turn completes.
   */
  async continueConversation(kind: FollowUpKind, mode?: ModeId): Promise<void> {
    const conversation = this.conversation;
    if (!conversation || this.turnRunning) return;
    if (this.capped) {
      this.notice = noticeFor({ status: "capped", message: CAPPED_MESSAGE });
      return;
    }

    const generation = this.generation;
    const turnMode = mode ?? this.conversationMode;
    const turnIndex = countDoneTurns(conversation.turns);
    const controller = new AbortController();
    this.controller = controller;
    this.notice = null;
    this.turnRunning = true;

    const result = await this.followUpTurn(
      conversation,
      kind,
      turnMode,
      controller.signal,
    );
    if (generation !== this.generation) return;
    this.controller = null;

    if (wasSent(result) && result.status !== "capped") {
      this.tracker.turnSubmitted({ turnKind: kind, turnIndex, mode: turnMode });
    }
    this.applyContinue(result, conversation, turnIndex);
    this.turnRunning = false;
    this.save();
  }

  /** Cancels a running turn; the typed idea is kept. */
  cancel(): void {
    this.controller?.abort();
  }

  /** Removes everything this tab has kept and returns to an empty tool. */
  clear(): void {
    this.generation++;
    this.controller?.abort();
    this.controller = null;
    this.removeHubDraft();
    this.status = "empty";
    this.ideaDraft = "";
    this.conversation = null;
    this.notice = null;
    this.followUpText = "";
    this.turnRunning = false;
    try {
      this.storage.removeItem(IDEA_DEVELOPER_SESSION_KEY);
    } catch {
      // Storage unavailable; nothing was kept.
    }
  }

  /**
   * If the user removed this conversation's draft in the Session Hub, drop the
   * tab's own copy too, so nothing is left that the user cannot remove.
   */
  reconcileHub(): void {
    const id = this.conversation?.hubDraftId;
    if (!id || this.hub.exists(id)) return;
    this.clear();
  }

  /** Calls the service; an unexpected error becomes a plain failure, never a stuck state. */
  private async startTurn(signal: AbortSignal): Promise<StartResult> {
    try {
      return await this.service.start({
        idea: this.ideaDraft,
        mode: this.mode,
        signal,
      });
    } catch {
      return {
        status: "failed",
        ideaText: this.ideaDraft,
        failure: { code: "unknown", message: UNEXPECTED_MESSAGE },
      };
    }
  }

  private async followUpTurn(
    conversation: Conversation,
    kind: FollowUpKind,
    mode: ModeId,
    signal: AbortSignal,
  ): Promise<ContinueResult> {
    try {
      return await this.service.continue({
        conversation: $state.snapshot(conversation),
        kind,
        text: kind === "switch-mode" ? "" : this.followUpText,
        mode,
        signal,
      });
    } catch {
      return {
        status: "failed",
        failure: { code: "unknown", message: UNEXPECTED_MESSAGE },
      };
    }
  }

  private applyStart(result: StartResult): void {
    if (result.status === "ok") {
      this.tracker.resultShown(resultShown(result, 0));
      this.conversation = firstConversation(result, this.mode);
      this.status = "active";
    } else if (result.status === "cancelled") {
      this.status = this.ideaDraft.trim() ? "editing" : "empty";
    } else {
      this.notice = noticeFor(result);
      this.status = "failed";
    }
  }

  private applyContinue(
    result: ContinueResult,
    conversation: Conversation,
    turnIndex: number,
  ): void {
    if (result.status === "ok") {
      this.tracker.resultShown(resultShown(result, turnIndex));
      this.conversation = extendConversation(conversation, result);
      this.followUpText = "";
    } else if (result.status !== "cancelled") {
      this.notice = noticeFor(result);
    }
  }

  private removeHubDraft(): void {
    const id = this.conversation?.hubDraftId;
    if (!id) return;
    try {
      this.hub.remove(id);
    } catch {
      // The hub is a convenience; clearing continues.
    }
  }

  private save(): void {
    try {
      this.storage.setItem(
        IDEA_DEVELOPER_SESSION_KEY,
        serialiseSession({
          ideaDraft: this.ideaDraft,
          mode: this.mode,
          conversation: this.conversation
            ? $state.snapshot(this.conversation)
            : null,
        }),
      );
    } catch {
      // Storage unavailable; the tool still works for this page view.
    }
  }

  private restore(): void {
    let stored;
    try {
      stored = parseStoredSession(
        this.storage.getItem(IDEA_DEVELOPER_SESSION_KEY),
      );
    } catch {
      return;
    }
    if (!stored) return;

    this.ideaDraft = stored.ideaDraft;
    if (stored.mode) this.mode = stored.mode;
    this.conversation = stored.conversation;
    this.status = stored.conversation
      ? "active"
      : stored.ideaDraft.trim()
        ? "editing"
        : "empty";
  }
}

const UNEXPECTED_MESSAGE =
  "Something went wrong. Your idea is still here. Try again.";

const CAPPED_MESSAGE =
  "This conversation has reached its limit. Start a new one, or copy the result to keep it.";

function resultShown(result: Started | Continued, turnIndex: number) {
  return {
    mode: result.development.mode,
    turnIndex,
    suggestionCount: result.development.generatorSuggestions.length,
  };
}

function firstConversation(result: Started, mode: ModeId): Conversation {
  return {
    ideaText: result.ideaText,
    turns: [{ kind: "idea", mode, text: result.ideaText, status: "done" }],
    previousInteractionId: result.interactionId,
    latest: result.development,
    hubDraftId: result.hubDraftId,
  };
}

function extendConversation(
  conversation: Conversation,
  result: Continued,
): Conversation {
  return {
    ...conversation,
    turns: [...conversation.turns, result.turn],
    previousInteractionId: result.interactionId,
    latest: result.development,
  };
}

export const ideaDeveloperStore = new IdeaDeveloperStore();
