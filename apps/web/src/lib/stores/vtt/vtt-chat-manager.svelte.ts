import type { ChatMessagePayload, VTTMessage } from "../../../types/vtt";
import { diceEngine, type RollResult } from "dice-engine";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { systemClock } from "$lib/utils/runtime-deps";

export interface VTTChatDependencies {
  emit: (message: VTTMessage) => void;
  getMyPeerId: () => string | null;
  persistDraft: () => void;
}

export class VTTChatManager {
  chatMessages = $state<ChatMessagePayload[]>([]);

  constructor(private deps: VTTChatDependencies) {}

  reset() {
    this.chatMessages = [];
  }

  setMessages(messages: ChatMessagePayload[]) {
    this.chatMessages = messages;
  }

  private createChatRoll(
    formula: string,
    result: Pick<RollResult, "total" | "parts">,
  ) {
    return {
      formula,
      total: result.total,
      parts: result.parts.map((p) => ({
        type: p.type,
        value: p.value,
        sides: p.type === "dice" ? p.sides : undefined,
        rolls: p.type === "dice" ? p.rolls : undefined,
        dropped: p.type === "dice" ? p.dropped : undefined,
      })),
    };
  }

  private buildChatPayload(
    content: string,
    roll?: ReturnType<VTTChatManager["createChatRoll"]>,
  ): ChatMessagePayload {
    const sender = sessionModeStore.isGuestMode
      ? sessionModeStore.guestUsername || "Guest"
      : "GM";
    const senderId = this.deps.getMyPeerId() || "host";

    return {
      type: "CHAT_MESSAGE",
      sender,
      senderId,
      content,
      timestamp: systemClock.now(),
      roll,
    };
  }

  sendChatMessage(content: string, vttEnabled: boolean) {
    if (!vttEnabled) return;

    let roll = undefined;
    const trimmed = content.trim();
    if (trimmed.startsWith("/roll ")) {
      try {
        const formula = trimmed.replace("/roll ", "").trim();
        const result = diceEngine.evaluate(formula);
        roll = this.createChatRoll(formula, result);
      } catch (err) {
        console.error("[MapSession] Dice roll failed", err);
      }
    }

    const payload = this.buildChatPayload(content, roll);

    this.chatMessages = [...this.chatMessages, payload];
    this.deps.emit(payload);
  }

  sendResolvedRollMessage(
    formula: string,
    result: Pick<RollResult, "total" | "parts">,
    vttEnabled: boolean,
  ) {
    if (!vttEnabled) return;

    const payload = this.buildChatPayload(
      `/roll ${formula}`,
      this.createChatRoll(formula, result),
    );

    this.chatMessages = [...this.chatMessages, payload];
    this.deps.emit(payload);
  }

  clearChatMessages(vttEnabled: boolean) {
    if (!vttEnabled) return;

    this.chatMessages = [];
    this.deps.emit({
      type: "CHAT_CLEAR",
      timestamp: systemClock.now(),
    });
  }

  handleRemoteChatMessage(payload: ChatMessagePayload) {
    this.chatMessages = [...this.chatMessages, payload];
    this.deps.persistDraft();
  }

  handleRemoteChatClear() {
    this.chatMessages = [];
    this.deps.persistDraft();
  }
}
