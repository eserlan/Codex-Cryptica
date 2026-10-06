import type { GuidanceAction } from "help-engine";
import {
  parseToHost,
  type CifChannel,
  type CifSnapshot,
  type CifToHost,
  type CifToPopout,
  type HelpAssistantView,
} from "$lib/services/help-assistant/cif-popout-protocol";

export interface PopoutWindow {
  closed: boolean;
  focus(): void;
}

export interface CifPopoutHostDeps {
  assistant: HelpAssistantView & { close(): void };
  /** Runs a guide the user accepted in the pop-out, in this window. */
  accept: (action: GuidanceAction) => Promise<void>;
  openArticle: (helpId: string) => void;
  openLibrary: () => void;
  createChannel: () => CifChannel | null;
  openWindow: () => PopoutWindow | null;
}

/**
 * Main-window side of the Cif pop-out. The assistant stays here, so the screen
 * context, the AI request and the conversation are exactly what they are when
 * Cif is docked. The pop-out sends commands; this class runs them.
 */
export class CifPopoutHost {
  /** A pop-out window is open and showing the conversation. */
  connected = $state(false);
  /** Whether this browser can pop Cif out at all. */
  supported = $state(false);
  private channel: CifChannel | null = null;
  private win: PopoutWindow | null = null;

  constructor(private readonly deps: CifPopoutHostDeps) {}

  start(): void {
    if (this.channel) return;
    this.channel = this.deps.createChannel();
    if (!this.channel) return;
    this.supported = true;
    this.channel.onmessage = (event) => void this.receive(event.data);
    // A pop-out left open across a reload of this window reconnects itself.
    this.post({ type: "host-ready" });
  }

  stop(): void {
    this.post({ type: "host-closing" });
    this.channel?.close();
    this.channel = null;
    this.supported = false;
    this.connected = false;
    this.win = null;
  }

  /** Opens the pop-out, or brings an open one to the front. */
  open(): void {
    if (this.win && !this.win.closed) {
      this.win.focus();
      return;
    }
    this.win = this.deps.openWindow();
  }

  /** Sends the current conversation. Call inside an effect to follow changes. */
  publish(): void {
    const a = this.deps.assistant;
    // Read before the early return so an effect keeps tracking while closed.
    const snapshot: CifSnapshot = {
      status: a.status,
      messages: $state.snapshot(a.messages) as CifSnapshot["messages"],
      offer: a.offer ? ($state.snapshot(a.offer) as GuidanceAction) : null,
      notice: a.notice,
      quickPrompts: [...a.quickPrompts],
      isPending: a.isPending,
    };
    if (this.connected) this.post({ type: "snapshot", snapshot });
  }

  private post(message: CifToPopout): void {
    this.channel?.postMessage(message);
  }

  private async receive(data: unknown): Promise<void> {
    const message = parseToHost(data);
    if (!message) return;
    const a = this.deps.assistant;

    switch (message.type) {
      case "hello":
        this.connected = true;
        // One Cif at a time: the docked panel steps aside for the window.
        a.close();
        this.publish();
        return;
      case "bye":
        this.connected = false;
        return;
      case "ask":
        return this.ask(message.id, message.text);
      case "accept":
        // Run what this window is offering, never an action sent over the wire.
        if (a.offer) await this.deps.accept(a.offer);
        return;
      default:
        this.command(message);
    }
  }

  private async ask(id: number, text: string): Promise<void> {
    const a = this.deps.assistant;
    const wasPending = a.isPending;
    const request = a.ask(text);
    // `ask` sets pending synchronously before its first await. Acknowledge that
    // the question was accepted now; waiting for the AI response can take
    // longer than the pop-out client's acknowledgement timeout.
    const started = !wasPending && a.isPending;
    this.post({
      type: "ask-result",
      id,
      started,
    });
    await request;
  }

  private command(
    message: Extract<
      CifToHost,
      {
        type:
          | "reset"
          | "cancel"
          | "dismiss-offer"
          | "open-article"
          | "open-library";
      }
    >,
  ): void {
    const a = this.deps.assistant;
    switch (message.type) {
      case "reset":
        return a.reset();
      case "cancel":
        return a.cancel();
      case "dismiss-offer":
        return a.dismissOffer();
      case "open-article":
        return this.deps.openArticle(message.helpId);
      case "open-library":
        return this.deps.openLibrary();
    }
  }
}
