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
  lastUpdated = $state<number>(0);
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
          // Optimization: Cheap timestamp check before deep JSON serialization
          if (this.lastUpdated === data.lastUpdated) return;

          // Fallback to content check if timestamps differ
          if (JSON.stringify(this.messages) !== JSON.stringify(data.messages)) {
            this.messages = data.messages;
            this.lastUpdated = data.lastUpdated;
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
        lastUpdated: this.lastUpdated,
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
    this.lastUpdated = Date.now();
    this.broadcast();
  }

  async setKey(key: string) {
    const db = await getDB();
    await db.put("settings", key, "ai_api_key");
    this.apiKey = key;
    this.lastUpdated = Date.now();
    this.broadcast();
  }

  clearKey() {
    getDB().then(db => {
      db.delete("settings", "ai_api_key");
    });
    this.apiKey = null;
    this.clearMessages();
    this.lastUpdated = Date.now();
    this.broadcast();
  }

  clearMessages() {
    // Revoke all blob URLs to prevent memory leaks
    this.messages.forEach(m => {
      if (m.imageUrl && m.imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(m.imageUrl);
      }
    });
    this.messages = [];
    this.lastUpdated = Date.now();
  }

  get isEnabled() {
    return !!this.apiKey || !!import.meta.env.VITE_SHARED_GEMINI_KEY;
  }

  get effectiveApiKey() {
    // Advanced mode REQUIRES a personal API key
    if (this.tier === "advanced") {
      return this.apiKey;
    }
    return this.apiKey || import.meta.env.VITE_SHARED_GEMINI_KEY;
  }

  private detectImageIntent(query: string): boolean {
    const q = query.toLowerCase().trim();

    // Explicit command-style triggers
    if (q.startsWith("/draw") || q.startsWith("/image")) {
      return true;
    }

    // Common explicit phrases
    if (
      q.includes("generate an image") ||
      q.includes("generate a picture") ||
      q.includes("generate a photo")
    ) {
      return true;
    }

    // Very image-specific constructions
    if (/\bportrait of\b/.test(q) || /\bsketch of\b/.test(q)) {
      return true;
    }

    const imageNouns = [
      "image",
      "picture",
      "photo",
      "photograph",
      "illustration",
      "portrait",
      "scene",
      "logo",
      "icon",
      "diagram",
      "map",
    ];

    const verbs = [
      "draw",
      "sketch",
      "paint",
      "illustrate",
      "visualize",
      "show",
      "generate",
      "create",
    ];

    // Require a verb and an image-related noun, both as whole words.
    for (const verb of verbs) {
      const verbRegex = new RegExp(`\\b${verb}\\b`);
      if (!verbRegex.test(q)) continue;

      for (const noun of imageNouns) {
        // Allow some text between verb and noun but enforce both in the query.
        const pattern = new RegExp(`\\b${verb}\\b[\\s\\S]{0,80}\\b${noun}\\b`);
        if (pattern.test(q)) {
          return true;
        }
      }
    }

    return false;
  }

  async ask(query: string) {
    const key = this.effectiveApiKey;
    if (!query.trim() || !key) return;

    const isImageRequest = this.detectImageIntent(query);

    this.messages = [
      ...this.messages,
      { id: crypto.randomUUID(), role: "user", content: query },
    ];
    this.lastUpdated = Date.now();
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
    this.lastUpdated = Date.now();

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
        this.lastUpdated = Date.now();
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
            this.lastUpdated = Date.now();
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
      this.lastUpdated = Date.now();
      this.broadcast();
    } finally {
      this.isLoading = false;
      this.lastUpdated = Date.now();
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