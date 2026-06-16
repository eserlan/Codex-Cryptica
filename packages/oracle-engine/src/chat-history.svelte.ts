import type { ChatMessage } from "./types";
import {
  systemClock,
  systemIdGenerator,
  type Clock,
  type IdGenerator,
} from "./runtime";

interface AppSettingsStore {
  appSettings: {
    get(key: string): Promise<{ value: any } | undefined>;
    put(record: { key: string; value: any; updatedAt: number }): Promise<void>;
  };
}

interface ChatHistoryRecord extends Omit<ChatMessage, "imageBlob"> {
  imageBlob?: Blob;
  [key: string]: any;
}

export class ChatHistoryService {
  messages = $state<ChatMessage[]>([]);
  lastUpdated = $state<number>(0);
  private db: AppSettingsStore | null = null;
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private vaultId: string | null = null;
  private switchSequence = 0;

  constructor(
    private clock: Clock = systemClock,
    private idGenerator: IdGenerator = systemIdGenerator,
  ) {}

  private get key() {
    return `chat_history_${this.vaultId ?? "default"}`;
  }

  async init(db: AppSettingsStore, vaultId: string) {
    this.db = db;
    this.vaultId = vaultId;

    let saved = await db.appSettings.get(this.key);

    if (!saved?.value) {
      const legacyScoped = await db.appSettings.get(`chat_history:${vaultId}`);
      if (legacyScoped?.value && Array.isArray(legacyScoped.value)) {
        saved = legacyScoped;
      }
    }

    if (!saved?.value) {
      const legacyFlat = await db.appSettings.get("chat_history");
      if (legacyFlat?.value && Array.isArray(legacyFlat.value)) {
        saved = legacyFlat;
      }
    }

    if (saved?.value && Array.isArray(saved.value)) {
      this.messages = saved.value.map((msg: ChatHistoryRecord) => {
        if (msg.imageBlob && !msg.imageUrl) {
          msg.imageUrl = URL.createObjectURL(msg.imageBlob);
        }
        return msg;
      });

      await db.appSettings.put({
        key: this.key,
        value: saved.value,
        updatedAt: this.clock.now(),
      });
    } else {
      this.messages = [];
    }

    this.lastUpdated = this.clock.now();
  }

  async switchVault(newVaultId: string) {
    const seq = ++this.switchSequence;

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
      await this.saveToDB();
    }

    if (seq !== this.switchSequence) return;

    this.messages.forEach((m) => {
      if (m.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(m.imageUrl);
      }
    });

    this.messages = [];
    this.vaultId = newVaultId;
    if (!this.db) return;

    const saved = await this.db.appSettings.get(this.key);
    if (seq !== this.switchSequence) return;

    if (saved?.value && Array.isArray(saved.value)) {
      this.messages = saved.value.map((msg: ChatHistoryRecord) => {
        if (msg.imageBlob && !msg.imageUrl) {
          msg.imageUrl = URL.createObjectURL(msg.imageBlob);
        }
        return msg;
      });
    }

    this.lastUpdated = this.clock.now();
  }

  destroy() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    this.messages.forEach((m) => {
      if (m.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(m.imageUrl);
      }
    });
  }

  async addMessage(msg: ChatMessage) {
    this.messages = [...this.messages, msg];
    this.lastUpdated = this.clock.now();
    await this.saveToDB();
  }

  async removeMessage(id: string) {
    const msg = this.messages.find((m) => m.id === id);
    if (msg?.imageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(msg.imageUrl);
    }
    this.messages = this.messages.filter((m) => m.id !== id);
    this.lastUpdated = this.clock.now();
    await this.saveToDB();
  }

  async clearMessages() {
    this.messages.forEach((m) => {
      if (m.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(m.imageUrl);
      }
    });
    this.messages = [];
    this.lastUpdated = this.clock.now();
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
      this.lastUpdated = this.clock.now();
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
      this.lastUpdated = this.clock.now();

      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }
      this.debounceTimeout = setTimeout(() => {
        void this.saveToDB();
        this.debounceTimeout = null;
      }, 500);
    }
  }

  async saveToDB() {
    if (!this.db || !this.vaultId) return;
    try {
      const messagesToPersist = $state.snapshot(this.messages).map((msg) => {
        const toPersist = { ...msg };
        if (toPersist.imageUrl?.startsWith("blob:")) {
          delete toPersist.imageUrl;
        }
        return toPersist;
      });

      await this.db.appSettings.put({
        key: this.key,
        value: messagesToPersist,
        updatedAt: this.clock.now(),
      });
    } catch {
      // non-critical persistence failure
    }
  }

  async setMessages(messages: ChatMessage[]) {
    this.messages = messages;
    this.lastUpdated = this.clock.now();
    await this.saveToDB();
  }

  async startWizard(type: "connection" | "merge") {
    await this.addMessage({
      id: this.idGenerator.uuid(),
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
      id: this.idGenerator.uuid(),
      role: "assistant",
      content,
      type: "image",
      imageUrl,
      imageBlob,
      entityId,
    });
  }
}
