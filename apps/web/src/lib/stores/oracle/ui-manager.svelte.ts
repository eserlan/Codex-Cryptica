import type { IOracleStore } from "./types";

export class OracleUiManager {
  isOpen = $state(false);
  isModal = $state(false);
  _thinkingCount = $state(0);
  visualizingEntityId = $state<string | null>(null);
  visualizingMessageId = $state<string | null>(null);
  /** A question a solo shortcut has prefilled; the chat takes it once. */
  pendingPrompt = $state<string | null>(null);

  constructor(private store: IOracleStore) {}

  get isThinking() {
    return this._thinkingCount > 0;
  }

  updateThinking(delta: number) {
    this._thinkingCount = Math.max(0, this._thinkingCount + delta);
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      void this.store.init();
    }
  }

  toggleModal() {
    this.isModal = !this.isModal;
    if (!this.isOpen) {
      this.open(this.isModal);
    }
  }

  open(modal = false) {
    this.isOpen = true;
    this.isModal = modal;
    void this.store.init();
  }

  close() {
    this.isOpen = false;
    this.isModal = false;
  }

  /** Prefills the chat input. Empty text clears it. Nothing is sent. */
  setPendingPrompt(text: string) {
    const trimmed = text.trim();
    this.pendingPrompt = trimmed.length > 0 ? trimmed : null;
  }

  /** Returns the pending prompt and clears it, so the chat takes it once. */
  takePendingPrompt(): string | null {
    const prompt = this.pendingPrompt;
    this.pendingPrompt = null;
    return prompt;
  }

  isVisualizingEntity(entityId: string | null | undefined) {
    return Boolean(entityId && this.visualizingEntityId === entityId);
  }

  isVisualizingMessage(messageId: string | null | undefined) {
    return Boolean(messageId && this.visualizingMessageId === messageId);
  }
}
