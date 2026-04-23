import type { ChatMessage } from "./types";

/**
 * Minimal interface for app settings persistence.
 * Defined here to avoid cross-package coupling with web app's EntityDb.
 */
interface AppSettingsStore {
  appSettings: {
    get(key: string): Promise<{ value: any } | undefined>;
    put(record: { key: string; value: any; updatedAt: number }): Promise<void>;
  };
}

/**
 * Internal type for chat history records stored in IndexedDB.
 * Extends ChatMessage with database-specific fields.
 */
interface ChatHistoryRecord extends Omit<ChatMessage, "imageBlob"> {
  imageBlob?: Blob;
  [key: string]: any; // Allow additional fields for flexibility
}

export class ChatHistoryService {
  messages = $state<ChatMessage[]>([]);
  lastUpdated = $state<number>(0);
  private db: AppSettingsStore | null = null;

  /**
   * Initialize the chat history service by loading saved messages from IndexedDB.
   * Restores blob URLs for any persisted image blobs.
   * @param db - The EntityDb instance for persistence
   */
  async init(db: AppSettingsStore) {
    this.db = db;
    const savedMessages = await db.appSettings.get("chat_history");
    if (savedMessages?.value && Array.isArray(savedMessages.value)) {
      // Restore blob URLs for persisted blobs
      const messages = savedMessages.value.map((msg: ChatHistoryRecord) => {
        if (msg.imageBlob && !msg.imageUrl) {
          msg.imageUrl = URL.createObjectURL(msg.imageBlob);
        }
        return msg;
      });
      this.messages = messages;
    }
  }

  /**
   * Cleanup method to revoke blob URLs and prevent memory leaks.
   * Should be called when the service is destroyed or messages are cleared.
   */
  destroy() {
    this.messages.forEach((m) => {
      if (m.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(m.imageUrl);
      }
    });
  }

  async addMessage(msg: ChatMessage) {
    this.messages = [...this.messages, msg];
    this.lastUpdated = Date.now();
    await this.saveToDB();
  }

  async removeMessage(id: string) {
    const msg = this.messages.find((m) => m.id === id);
    if (msg?.imageUrl && msg.imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(msg.imageUrl);
    }
    this.messages = this.messages.filter((m) => m.id !== id);
    this.lastUpdated = Date.now();
    await this.saveToDB();
  }

  async clearMessages() {
    this.messages.forEach((m) => {
      if (m.imageUrl && m.imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(m.imageUrl);
      }
    });
    this.messages = [];
    this.lastUpdated = Date.now();
    await this.saveToDB();
  }

  async clear() {
    return this.clearMessages();
  }

  async updateMessage(
    id: string,
    updates: Partial<ChatMessage>,
    persist = true,
  ) {
    const msgIndex = this.messages.findIndex((m) => m.id === id);
    if (msgIndex !== -1) {
      this.messages[msgIndex] = { ...this.messages[msgIndex], ...updates };
      this.messages = [...this.messages];
      this.lastUpdated = Date.now();
      if (persist) {
        await this.saveToDB();
      }
    }
  }

  async addProposal(messageId: string, proposal: any) {
    const msgIndex = this.messages.findIndex((m) => m.id === messageId);
    if (msgIndex !== -1) {
      const msg = this.messages[msgIndex];
      const existing = msg.proposals || [];
      if (existing.some((p: any) => p.title === proposal.title)) return;

      const proposals = [...existing, proposal];
      this.messages[msgIndex] = { ...msg, proposals };
      this.messages = [...this.messages];
      this.lastUpdated = Date.now();
      await this.saveToDB();
    }
  }

  /**
   * Save current messages to IndexedDB.
   * Strips blob URLs before persistence (they are regenerated on init).
   * Failures are silently ignored as chat history is non-critical.
   */
  async saveToDB() {
    if (!this.db) return;
    try {
      const messagesToPersist = $state.snapshot(this.messages).map((msg) => {
        const toPersist = { ...msg };
        // We keep imageBlob (it's a Blob, can store in IndexedDB)
        // But we MUST remove imageUrl if it's a blob URL because they expire
        if (toPersist.imageUrl?.startsWith("blob:")) {
          delete toPersist.imageUrl;
        }
        return toPersist;
      });
      await this.db.appSettings.put({
        key: "chat_history",
        value: messagesToPersist,
        updatedAt: Date.now(),
      });
    } catch {
      // [ChatHistoryService] Silently fail - chat history is not critical data
      // User can still interact with messages even if persistence fails
    }
  }

  async setMessages(messages: ChatMessage[]) {
    this.messages = messages;
    this.lastUpdated = Date.now();
    await this.saveToDB();
  }

  // --- Domain Mutations ---

  async startWizard(type: "connection" | "merge") {
    await this.addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Starting ${type} wizard...`,
      type: "wizard",
      wizardType: type,
    });
  }

  updateMessageEntity(messageId: string, entityId: string | null) {
    const target = this.messages.find((m) => m.id === messageId);
    if (target) {
      target.archiveTargetId = entityId || undefined;
      this.setMessages([...this.messages]);
    }
  }

  async addTestImageMessage(
    content: string,
    imageUrl: string,
    imageBlob: Blob,
    entityId?: string,
  ) {
    await this.addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      type: "image",
      imageUrl,
      imageBlob,
      entityId,
    });
  }
}
