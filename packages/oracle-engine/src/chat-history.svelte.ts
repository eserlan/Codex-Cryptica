import type { ChatMessage } from "./types";
import type { IDBPDatabase } from "idb";

export class ChatHistoryService {
  messages = $state<ChatMessage[]>([]);
  lastUpdated = $state<number>(0);
  private db: IDBPDatabase<any> | null = null;

  async init(db: IDBPDatabase<any>) {
    this.db = db;
    const savedMessages = await db.getAll("chat_history");
    if (savedMessages && savedMessages.length > 0) {
      this.messages = savedMessages;
    }
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

  async saveToDB() {
    if (!this.db) return;
    try {
      const tx = this.db.transaction("chat_history", "readwrite");
      await tx.store.clear();
      for (const msg of $state.snapshot(this.messages)) {
        const toPersist = { ...msg };
        delete toPersist.imageBlob;
        if (toPersist.imageUrl?.startsWith("blob:")) {
          delete toPersist.imageUrl;
        }
        await tx.store.put(toPersist);
      }
      await tx.done;
    } catch (e) {
      console.warn("[ChatHistoryService] Failed to save to DB:", e);
    }
  }

  setMessages(messages: ChatMessage[]) {
    this.messages = messages;
    this.lastUpdated = Date.now();
    this.saveToDB();
  }

  // --- Domain Mutations ---

  startWizard(type: "connection" | "merge") {
    this.addMessage({
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

  addTestImageMessage(
    content: string,
    imageUrl: string,
    imageBlob: Blob,
    entityId?: string,
  ) {
    this.addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      type: "image",
      imageUrl,
      imageBlob,
      entityId,
      isLongResponse: true,
    });
  }
}
