import { aiService } from "../services/ai";
import { getDB } from "../utils/idb";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

class OracleStore {
  messages = $state<ChatMessage[]>([]);
  isOpen = $state(false);
  isLoading = $state(false);
  apiKey = $state<string | null>(null);

  async init() {
    const db = await getDB();
    this.apiKey = (await db.get("settings", "ai_api_key")) || null;
  }

  async setKey(key: string) {
    const db = await getDB();
    await db.put("settings", key, "ai_api_key");
    this.apiKey = key;
  }

  async clearKey() {
    const db = await getDB();
    await db.delete("settings", "ai_api_key");
    this.apiKey = null;
    this.messages = [];
  }

  isEnabled = $derived(!!this.apiKey);

  async ask(query: string) {
    if (!query.trim() || !this.apiKey) return;

    this.messages = [...this.messages, { role: "user", content: query }];
    this.isLoading = true;

    // Streaming response setup
    const assistantMsgIndex = this.messages.length;
    this.messages = [...this.messages, { role: "assistant", content: "" }];

    try {
      await aiService.generateResponse(this.apiKey, query, (partial) => {
        // Update the last message in place (using Svelte 5 reactivity)
        this.messages[assistantMsgIndex].content = partial;
      });
    } catch (err: any) {
      this.messages = [...this.messages, { role: "system", content: err.message || "Error generating response." }];
    } finally {
      this.isLoading = false;
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.apiKey === null) {
      this.init();
    }
  }
}

export const oracle = new OracleStore();