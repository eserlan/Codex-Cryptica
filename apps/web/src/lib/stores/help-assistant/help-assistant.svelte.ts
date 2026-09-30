import {
  MAX_QUESTION_CHARS,
  validateAction,
  type GuidanceAction,
  type HelpAnswer,
  type HelpContext,
  type HelpTurn,
} from "help-engine";
import type {
  AskInput,
  HelpAskResult,
  HelpClientError,
} from "$lib/services/help-assistant/help-client";
import {
  fallbackMessage,
  type HelpFallback,
} from "$lib/services/help-assistant/help-fallback";

export type HelpStatus =
  "idle" | "pending" | "answered" | "no-match" | "out-of-scope" | "fallback";

export interface HelpMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  answer?: HelpAnswer;
  fallback?: HelpFallback;
  /** The user moved to another screen before this answer arrived. */
  staleScreen?: boolean;
}

export interface HelpAssistantDeps {
  client: { ask: (input: AskInput) => Promise<HelpAskResult> };
  context: { readonly current: HelpContext; readonly signature: string };
  fallback: (error: HelpClientError, context: HelpContext) => HelpFallback;
  /** IDs of in-app help articles, so an offered `openHelp` can be checked. */
  helpIds: () => ReadonlySet<string>;
}

/** Messages kept on screen: four exchanges. Only the last four are ever sent. */
const MAX_MESSAGES = 8;

/**
 * Panel state and the short help conversation. The conversation lives in
 * memory for this session only: it is never written to the vault, browser
 * storage, or anywhere else, and is gone on reset or reload.
 */
export class HelpAssistantStore {
  isOpen = $state(false);
  status = $state<HelpStatus>("idle");
  messages = $state<HelpMessage[]>([]);
  /** A validated guide waiting for the user to accept or dismiss it. */
  offer = $state.raw<GuidanceAction | null>(null);
  /** A plain-language note about the last attempt, such as a length limit. */
  notice = $state<string | null>(null);

  private controller: AbortController | null = null;
  private run = 0;
  private nextId = 1;

  constructor(private readonly deps: HelpAssistantDeps) {}

  get isPending(): boolean {
    return this.status === "pending";
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  /** Clears the conversation and cancels anything in flight. */
  reset(): void {
    this.cancel();
    this.run++;
    this.messages = [];
    this.offer = null;
    this.notice = null;
    this.status = "idle";
  }

  cancel(): void {
    this.controller?.abort();
  }

  dismissOffer(): void {
    this.offer = null;
  }

  private history(): HelpTurn[] {
    return this.messages
      .filter((m) => m.role === "user" || m.answer)
      .map((m) => ({ role: m.role, text: m.answer?.answer ?? m.text }));
  }

  private push(message: Omit<HelpMessage, "id">): void {
    this.messages = [...this.messages, { ...message, id: this.nextId++ }].slice(
      -MAX_MESSAGES,
    );
  }

  /** Returns true when a request was actually started. */
  async ask(question: string): Promise<boolean> {
    const text = question.trim();
    if (!text || this.isPending) return false;
    if (text.length > MAX_QUESTION_CHARS) {
      this.notice = fallbackMessage({
        kind: "bad-request",
        code: "QUESTION_TOO_LONG",
      });
      return false;
    }

    const history = this.history();
    const askedContext = this.deps.context.current;
    const askedSignature = this.deps.context.signature;
    const run = ++this.run;
    const controller = new AbortController();
    this.controller = controller;

    this.notice = null;
    this.offer = null;
    this.push({ role: "user", text });
    this.status = "pending";

    const result = await this.deps.client.ask({
      question: text,
      history,
      context: askedContext,
      signal: controller.signal,
    });

    // A reset (or a newer question) while this was in flight owns the state now.
    if (run !== this.run) return true;
    this.controller = null;

    if (result.ok) {
      const stale = this.deps.context.signature !== askedSignature;
      this.push({
        role: "assistant",
        text: result.answer.answer,
        answer: result.answer,
        staleScreen: stale || undefined,
      });
      this.status = result.answer.outcome;
      // Guidance for a screen the user has already left would point at nothing.
      this.offer = stale
        ? null
        : validateAction(result.answer.action, this.deps.context.current, {
            helpIds: this.deps.helpIds(),
          });
      return true;
    }

    if (result.error.kind === "aborted") {
      // The user cancelled: take the unanswered question back off the page.
      this.messages = this.messages.slice(0, -1);
      this.status = "idle";
      return true;
    }

    const fallback = this.deps.fallback(
      result.error,
      this.deps.context.current,
    );
    this.push({ role: "assistant", text: fallback.message, fallback });
    this.status = "fallback";
    return true;
  }
}
