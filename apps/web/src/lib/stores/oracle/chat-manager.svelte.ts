import { OracleCommandParser, type ChatMessage } from "@codex/oracle-engine";
import type { IOracleStore } from "./types";
import { systemClock } from "$lib/utils/runtime-deps";

export class OracleChatManager {
  isChatHistoryReady = $state(false);

  constructor(private store: IOracleStore) {}

  get messages(): ChatMessage[] {
    return this.store.chatHistoryService?.messages ?? [];
  }

  async init(db: any, vaultId: string) {
    await this.store.chatHistoryService.init(db, vaultId);
    this.isChatHistoryReady = true;
  }

  async switchVault(vaultId: string) {
    await this.store.chatHistoryService.switchVault(vaultId);
  }

  destroy() {
    this.store.chatHistoryService.destroy();
  }

  async sendMessage(content: string) {
    if (!content.trim()) return;

    const intent = OracleCommandParser.parse(
      content,
      this.store.discoveryPolicyStore.aiDisabled,
    );

    // Guests get read-only Q&A only (FR-031/FR-032): block vault-mutating
    // commands and image generation. /draw parses as a chat intent and is
    // detected downstream, so it's checked on the raw input here.
    if (this.store.sessionModeStore.isGuestMode) {
      const blockedIntents = [
        "create",
        "connect",
        "connect-ai",
        "merge",
        "merge-ai",
        "revise",
        "wizard",
        "draw",
      ];
      if (
        blockedIntents.includes(intent.type) ||
        OracleCommandParser.detectImageIntent(content)
      ) {
        await this.store.chatHistoryService.addMessage({
          id: crypto.randomUUID(),
          role: "system",
          content: "❌ This command isn't available in guest view.",
          timestamp: systemClock.now(),
        });
        return;
      }
    }

    await this.store.executor.execute(intent, this.store.getExecutionContext());
  }

  async ask(content: string) {
    return this.sendMessage(content);
  }

  async clearMessages() {
    if (
      await this.store.notificationStore.confirm({
        title: "Clear History",
        message:
          "Are you sure you want to clear your conversation history? This cannot be undone.",
        confirmLabel: "Clear History",
        isDangerous: true,
      })
    ) {
      await this.store.chatHistoryService.clear();
      this.store.sessionActivity.clear();
    }
  }

  async removeMessage(id: string) {
    await this.store.chatHistoryService.removeMessage(id);
  }

  async startWizard(type: "connection" | "merge") {
    await this.store.chatHistoryService.startWizard(type);
  }

  async reset() {
    if (this.store.chatHistoryService) {
      await this.store.chatHistoryService.setMessages([]);
    }
  }

  async updateMessageEntity(messageId: string, entityId: string | null) {
    await this.store.chatHistoryService.updateMessage(messageId, {
      entityId: entityId || undefined,
    });
  }

  async addTestImageMessage(
    content: string,
    imageUrl: string,
    imageBlob: Blob,
    entityId?: string,
  ) {
    await this.store.chatHistoryService.addTestImageMessage(
      content,
      imageUrl,
      imageBlob,
      entityId,
    );
  }

  async addProposal(requestId: string, payload: any) {
    await this.store.chatHistoryService.addProposal(requestId, payload);
  }
}
