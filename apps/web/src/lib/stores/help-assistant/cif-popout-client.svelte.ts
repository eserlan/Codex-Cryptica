import type { GuidanceAction } from "help-engine";
import {
  parseToPopout,
  type CifChannel,
  type CifSnapshot,
  type CifToHost,
  type HelpAssistantView,
} from "$lib/services/help-assistant/cif-popout-protocol";
import type { HelpMessage, HelpStatus } from "./help-assistant.svelte";

/** How long to wait for the main window to say whether a question was sent. */
const ASK_TIMEOUT_MS = 5000;

/**
 * Pop-out-window side: shows the main window's conversation and forwards what
 * the user types. It holds no AI client and no screen context of its own.
 */
export class CifPopoutClient implements HelpAssistantView {
  /** The main window answered, so there is a conversation to show. */
  connected = $state(false);
  status = $state<HelpStatus>("idle");
  messages = $state<HelpMessage[]>([]);
  offer = $state.raw<GuidanceAction | null>(null);
  notice = $state<string | null>(null);
  quickPrompts = $state<readonly string[]>([]);
  isPending = $state(false);

  private nextId = 1;
  private waiting = new Map<number, (started: boolean) => void>();

  constructor(private readonly channel: CifChannel) {}

  /** The window is always showing Cif. */
  readonly isOpen = true;

  start(): void {
    this.channel.onmessage = (event) => this.receive(event.data);
    this.send({ type: "hello" });
  }

  stop(): void {
    this.send({ type: "bye" });
    this.channel.close();
  }

  private send(message: CifToHost): void {
    this.channel.postMessage(message);
  }

  private receive(data: unknown): void {
    const message = parseToPopout(data);
    if (!message) return;
    switch (message.type) {
      case "host-ready":
        this.send({ type: "hello" });
        return;
      case "host-closing":
        this.connected = false;
        this.settleAll(false);
        return;
      case "snapshot":
        this.apply(message.snapshot);
        return;
      case "ask-result":
        this.waiting.get(message.id)?.(message.started);
        return;
    }
  }

  private apply(snapshot: CifSnapshot): void {
    this.connected = true;
    this.status = snapshot.status;
    this.messages = snapshot.messages;
    this.offer = snapshot.offer;
    this.notice = snapshot.notice;
    this.quickPrompts = snapshot.quickPrompts;
    this.isPending = snapshot.isPending;
  }

  private settleAll(started: boolean): void {
    for (const resolve of this.waiting.values()) resolve(started);
    this.waiting.clear();
  }

  ask(question: string): Promise<boolean> {
    if (!this.connected) return Promise.resolve(false);
    const id = this.nextId++;
    return new Promise<boolean>((resolve) => {
      const finish = (started: boolean) => {
        clearTimeout(timer);
        this.waiting.delete(id);
        resolve(started);
      };
      const timer = setTimeout(() => finish(false), ASK_TIMEOUT_MS);
      this.waiting.set(id, finish);
      this.send({ type: "ask", id, text: question });
    });
  }

  reset(): void {
    this.send({ type: "reset" });
  }

  cancel(): void {
    this.send({ type: "cancel" });
  }

  dismissOffer(): void {
    this.send({ type: "dismiss-offer" });
  }

  accept(): void {
    this.send({ type: "accept" });
  }

  openArticle(helpId: string): void {
    this.send({ type: "open-article", helpId });
  }

  openLibrary(): void {
    this.send({ type: "open-library" });
  }
}
