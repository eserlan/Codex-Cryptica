import {
  OracleCommandParser,
  oracleConversationId,
  type ChatMessage,
  type MessageMention,
} from "@codex/oracle-engine";
import type { IOracleStore } from "./types";
import { createVaultMentionSource, type MentionVault } from "./mention-source";
import { prepareMentions } from "./mention-intent";
import {
  systemClock,
  type IdGenerator,
  systemIdGenerator,
} from "$lib/utils/runtime-deps";

export class OracleChatManager {
  isChatHistoryReady = $state(false);

  constructor(
    private store: IOracleStore,
    private idGenerator: IdGenerator = systemIdGenerator,
  ) {}

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

  /**
   * `mentions` are the composer's picked entities (#4052). They are checked
   * against the Vault again here, and only plain chat questions carry them.
   */
  async sendMessage(content: string, mentions: MessageMention[] = []) {
    if (!content.trim()) return;

    const intent = OracleCommandParser.parse(
      content,
      this.store.discoveryPolicyStore.aiDisabled,
    );

    // Image requests (/draw) are detected from the raw text downstream, so they
    // stay out of pinned retrieval.
    if (
      intent.type === "chat" &&
      !OracleCommandParser.detectImageIntent(content)
    ) {
      const prepared = prepareMentions(
        content,
        mentions,
        createVaultMentionSource(this.store.vault as MentionVault),
      );
      if (prepared.mentions.length > 0) {
        intent.mentions = prepared.mentions;
        intent.pinnedEntityIds = prepared.pinnedEntityIds;
      }
    }

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
          id: this.idGenerator.uuid(),
          role: "system",
          content: "❌ This command isn't available in guest view.",
          timestamp: systemClock.now(),
        });
        return;
      }
    }

    await this.store.executor.execute(intent, this.store.getExecutionContext());
  }

  async ask(content: string, mentions: MessageMention[] = []) {
    return this.sendMessage(content, mentions);
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
      await this.resetModelConversation();
    }
  }

  /**
   * The model keeps its own copy of the chat server-side. Without this, a
   * cleared conversation would keep steering later answers.
   */
  private async resetModelConversation() {
    try {
      await this.store.textGeneration.resetConversation?.(
        oracleConversationId(this.store.vault.activeVaultId),
      );
    } catch (err) {
      console.warn("[OracleChatManager] Could not reset model chat:", err);
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
      await this.resetModelConversation();
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
