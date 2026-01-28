import { aiService, TIER_MODES } from "../services/ai";
import { getDB } from "../utils/idb";

export interface ChatMessage {
  id: string; // Unique identifier for reactivity and identification
  role: "user" | "assistant" | "system";
  content: string;
  entityId?: string; // ID of the entity used for generation context
  archiveTargetId?: string; // ID of the entity where the user wants to archive this message
}

class OracleStore {
  messages = $state<ChatMessage[]>([]);
  isOpen = $state(false);
  isLoading = $state(false);
  apiKey = $state<string | null>(null);
  tier = $state<"lite" | "advanced">("lite");
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
          this.tier = data.tier || "lite";
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
        apiKey: this.apiKey,
        tier: this.tier
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
    this.tier = (await db.get("settings", "ai_tier")) || "lite";
    this.broadcast();
  }

  async setTier(tier: "lite" | "advanced") {
    const db = await getDB();
    await db.put("settings", tier, "ai_tier");
    this.tier = tier;
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
    return !!this.apiKey || !!import.meta.env.VITE_SHARED_GEMINI_KEY;
  }

  get effectiveApiKey() {
    return this.apiKey || import.meta.env.VITE_SHARED_GEMINI_KEY;
  }

  async ask(query: string) {
    const key = this.effectiveApiKey;
    if (!query.trim() || !key) return;

    this.messages = [...this.messages, { id: crypto.randomUUID(), role: "user", content: query }];
    this.isLoading = true;
    this.broadcast();

    // Streaming response setup
    const assistantMsgIndex = this.messages.length;
    this.messages = [...this.messages, { id: crypto.randomUUID(), role: "assistant", content: "" }];

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

      // Identify the last entity we were talking about
      let lastEntityId: string | undefined;
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.messages[i].entityId) {
          lastEntityId = this.messages[i].entityId;
          break;
        }
      }

      const { content: context, primaryEntityId } = await aiService.retrieveContext(query, alreadySentTitles, lastEntityId);

      // Store the primary entity ID in both the user message (for context) and the assistant message (for the button target)
      this.messages[assistantMsgIndex - 1].entityId = primaryEntityId;
      this.messages[assistantMsgIndex].entityId = primaryEntityId;

      const history = this.messages.slice(0, -2);
      const modelName = TIER_MODES[this.tier];
      await aiService.generateResponse(key, query, history, context, modelName, (partial) => {
        this.messages[assistantMsgIndex].content = partial;
        this.broadcastThrottle();
      });
    } catch (err: any) {
      this.messages = [...this.messages, { id: crypto.randomUUID(), role: "system", content: err.message || "Error generating response." }];
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

  updateMessageEntity(messageId: string, entityId: string) {
    const target = this.messages.find(m => m.id === messageId);
    if (target) {
      target.archiveTargetId = entityId;
      this.broadcast();
    }
  }
}

export const oracle = new OracleStore();