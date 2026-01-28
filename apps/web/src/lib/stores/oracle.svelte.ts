import { aiService } from "../services/ai";
import { getDB } from "../utils/idb";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  entityId?: string; // ID of the entity this message is primarily about
}

class OracleStore {
  messages = $state<ChatMessage[]>([]);
  isOpen = $state(false);
  isLoading = $state(false);
  apiKey = $state<string | null>(null);
  isModal = $state(false);

  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.channel = new BroadcastChannel("codex-oracle-sync");
      this.channel.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === "SYNC_STATE") {
          // Avoid feedback loops by checking if data is actually different
          if (JSON.stringify(this.messages) !== JSON.stringify(data.messages)) {
            this.messages = data.messages;
          }
          this.isLoading = data.isLoading;
          this.apiKey = data.apiKey;
        } else if (type === "REQUEST_STATE") {
          this.broadcast();
        }
      };

      // Request state from other windows on load
      this.channel.postMessage({ type: "REQUEST_STATE" });
    }
  }

  private broadcast() {
    this.channel?.postMessage({
      type: "SYNC_STATE",
      data: {
        messages: $state.snapshot(this.messages),
        isLoading: this.isLoading,
        apiKey: this.apiKey
      }
    });
  }

  private lastBroadcast = 0;
  private broadcastThrottle() {
    const now = Date.now();
    if (now - this.lastBroadcast > 150) {
      this.broadcast();
      this.lastBroadcast = now;
    }
  }

  async init() {
    const db = await getDB();
    this.apiKey = (await db.get("settings", "ai_api_key")) || null;
    this.broadcast();
  }

  async setKey(key: string) {
    const db = await getDB();
    await db.put("settings", key, "ai_api_key");
    this.apiKey = key;
    this.broadcast();
  }

  async clearKey() {
    const db = await getDB();
    await db.delete("settings", "ai_api_key");
    this.apiKey = null;
    this.messages = [];
    this.broadcast();
  }

  get isEnabled() {
    return !!this.apiKey;
  }

  async ask(query: string) {
    if (!query.trim() || !this.apiKey) return;

    this.messages = [...this.messages, { role: "user", content: query }];
    this.isLoading = true;
    this.broadcast();

    // Streaming response setup
    const assistantMsgIndex = this.messages.length;
    this.messages = [...this.messages, { role: "assistant", content: "" }];

    try {
      // Extract already sent entity titles from history to avoid redundancy
      const alreadySentTitles = new Set<string>();
      this.messages.forEach(m => {
        if (m.role === "user") {
          const matches = m.content.matchAll(/--- (?:\[ACTIVE FILE\] )?File: ([^\n-]+) ---/g);
          for (const match of matches) {
            alreadySentTitles.add(match[1]);
          }
        }
      });

      const { content: context, primaryEntityId } = await aiService.retrieveContext(query, alreadySentTitles);

      // Store the primary entity ID in both the user message (for context) and the assistant message (for the button target)
      this.messages[assistantMsgIndex - 1].entityId = primaryEntityId;
      this.messages[assistantMsgIndex].entityId = primaryEntityId;

      const history = this.messages.slice(0, -2);
      await aiService.generateResponse(this.apiKey, query, history, context, (partial) => {
        this.messages[assistantMsgIndex].content = partial;
        this.broadcastThrottle();
      });
    } catch (err: any) {
      this.messages = [...this.messages, { role: "system", content: err.message || "Error generating response." }];
      this.broadcast();
    } finally {
      this.isLoading = false;
      this.broadcast();
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.apiKey === null) {
      this.init();
    }
  }

  toggleModal() {
    this.isModal = !this.isModal;
  }
}

export const oracle = new OracleStore();