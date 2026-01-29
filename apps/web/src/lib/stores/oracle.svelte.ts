import { aiService, TIER_MODES } from "../services/ai";
import { getDB } from "../utils/idb";

export interface ChatMessage {
  id: string; // Unique identifier for reactivity and identification
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "image";
  imageUrl?: string; // temporary blob: URL or local path
  imageBlob?: Blob; // stored temporarily for archiving
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

  private detectImageIntent(query: string): boolean {
    const q = query.toLowerCase();
    return (
      q.includes("/draw") ||
      q.includes("/image") ||
      q.startsWith("draw") ||
      q.includes("draw me") ||
      q.includes("draw a") ||
      q.includes("portrait of") ||
      q.includes("visualize") ||
      q.includes("generate an image") ||
      q.includes("show me what") ||
      q.includes("show me a") ||
      q.includes("sketch of") ||
      q.includes("paint a")
    );
  }

  async ask(query: string) {
    const key = this.effectiveApiKey;
    if (!query.trim() || !key) return;

    const isImageRequest = this.detectImageIntent(query);

    this.messages = [
      ...this.messages,
      { id: crypto.randomUUID(), role: "user", content: query },
    ];
    this.isLoading = true;
    this.broadcast();

    // Streaming response setup
    const assistantMsgIndex = this.messages.length;
    this.messages = [
      ...this.messages,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        type: isImageRequest ? "image" : "text",
      },
    ];

    try {
      const alreadySentTitles = this.getSentTitles();

      // Identify the last entity we were talking about
      let lastEntityId: string | undefined;
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.messages[i].entityId) {
          lastEntityId = this.messages[i].entityId;
          break;
        }
      }

      const { content: context, primaryEntityId } =
        await aiService.retrieveContext(
          query,
          alreadySentTitles,
          lastEntityId,
          isImageRequest,
        );

      // Store the primary entity ID in both the user message (for context) and the assistant message (for the button target)
      this.messages[assistantMsgIndex - 1].entityId = primaryEntityId;
      this.messages[assistantMsgIndex].entityId = primaryEntityId;

      if (isImageRequest) {
        // Image Generation Flow
        const finalPrompt = aiService.enhancePrompt(query, context);

        const blob = await aiService.generateImage(key, finalPrompt);
        const imageUrl = URL.createObjectURL(blob);

        this.messages[assistantMsgIndex].imageUrl = imageUrl;
        this.messages[assistantMsgIndex].imageBlob = blob;
        this.messages[assistantMsgIndex].content = `Generated visualization for: "${query}"`;
        this.broadcast();
      } else {
        // Text Generation Flow
        const history = this.messages.slice(0, -2);
        const modelName = TIER_MODES[this.tier];
        await aiService.generateResponse(
          key,
          query,
          history,
          context,
          modelName,
          (partial) => {
            this.messages[assistantMsgIndex].content = partial;
            this.broadcastThrottle();
          },
        );
      }
    } catch (err: any) {
      this.messages = [
        ...this.messages,
        {
          id: crypto.randomUUID(),
          role: "system",
          content: err.message || "Error generating response.",
        },
      ];
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

  private getSentTitles(): Set<string> {
    const titles = new Set<string>();
    this.messages.forEach((m) => {
      if (m.role === "user") {
        const matches = m.content.matchAll(
          /--- (?:\[ACTIVE FILE\] )?File: ([^\n-]+) ---/g,
        );
        for (const match of matches) {
          titles.add(match[1]);
        }
      }
    });
    return titles;
  }
}

export const oracle = new OracleStore();