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

  async ask(query: string) {
    if (!query.trim() || !this.apiKey) return;

    this.messages = [...this.messages, { role: "user", content: query }];
    this.isLoading = true;

    // Placeholder for streaming response
    const assistantMsgIndex = this.messages.length;
    this.messages = [...this.messages, { role: "assistant", content: "" }];

    try {
      await aiService.generateResponse(this.apiKey, query, (partial) => {
        // Update the last message
        const newHistory = [...this.messages];
        newHistory[assistantMsgIndex] = { role: "assistant", content: partial };
        this.messages = newHistory;
      });
    } catch {
      this.messages = [...this.messages, { role: "system", content: "Error generating response. Check your API Key." }];
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