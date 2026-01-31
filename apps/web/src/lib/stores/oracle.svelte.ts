import { aiService, TIER_MODES } from "../services/ai";
import { getDB } from "../utils/idb";
import { graph } from "./graph.svelte";
import { vault } from "./vault.svelte";

export interface ChatMessage {
  id: string; // Unique identifier for reactivity and identification
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "image";
  imageUrl?: string; // temporary blob: URL or local path
  imageBlob?: Blob; // stored temporarily for archiving
  entityId?: string; // ID of the entity used for generation context
  archiveTargetId?: string; // ID of the entity where the user wants to archive this message
  sources?: string[]; // IDs of entities consulted for this message (FR-001)
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

  private async saveToDB() {
    const db = await getDB();
    const tx = db.transaction("chat_history", "readwrite");
    // We clear and re-insert to ensure the IndexedDB matches the in-memory array perfectly, 
    // effectively handling message deletions without complex reconciliation logic.
    await tx.store.clear();
    for (const msg of $state.snapshot(this.messages)) {
      // Don't persist blobs or temporary URLs
      const toPersist = { ...msg };
      delete toPersist.imageBlob;
      if (toPersist.imageUrl?.startsWith("blob:")) {
        delete toPersist.imageUrl;
      }
      await tx.store.put(toPersist);
    }
    await tx.done;
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

    // Load chat history
    const savedMessages = await db.getAll("chat_history");
    if (savedMessages && savedMessages.length > 0) {
      this.messages = savedMessages;
    }

    this.broadcast();
  }

  async setTier(tier: "lite" | "advanced") {
    const db = await getDB();
    await db.put("settings", tier, "ai_tier");
    this.tier = tier;
    this.lastUpdated = Date.now();
    this.broadcast();
    this.saveToDB();
  }

  async setKey(key: string) {
    const db = await getDB();
    await db.put("settings", key, "ai_api_key");
    this.apiKey = key;
    this.lastUpdated = Date.now();
    this.broadcast();
    this.saveToDB();
  }

  clearKey() {
    getDB().then(db => {
      db.delete("settings", "ai_api_key");
    });
    this.apiKey = null;
    this.clearMessages();
    this.lastUpdated = Date.now();
    this.broadcast();
    this.saveToDB();
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
    this.saveToDB();
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

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.messages = [
        ...this.messages,
        { id: crypto.randomUUID(), role: "user", content: query },
        {
          id: crypto.randomUUID(),
          role: "system",
          content: "The Oracle is currently offline. Conversational expansion and AI generation are suspended, but local retrieval will attempt to find matches for your raw query.",
        },
      ];
      this.lastUpdated = Date.now();
      this.broadcast();
      this.saveToDB();
      return;
    }

    const isCreateRequest = query.toLowerCase().trim().startsWith("/create");
    const isImageRequest = !isCreateRequest && this.detectImageIntent(query);

    this.messages = [
      ...this.messages,
      { id: crypto.randomUUID(), role: "user", content: query },
    ];
    this.lastUpdated = Date.now();
    this.isLoading = true;
    this.broadcast();
    this.saveToDB();

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

      // Expand query if it's a follow-up (FR-004)
      let searchQuery = query;
      if (this.messages.length > 2 && !isImageRequest) {
        searchQuery = await aiService.expandQuery(key, query, this.messages.slice(0, -2));
      }

      // Identify the last entity we were talking about
      let lastEntityId: string | undefined;
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.messages[i].entityId) {
          lastEntityId = this.messages[i].entityId;
          break;
        }
      }

      const { content: context, primaryEntityId, sourceIds } =
        await aiService.retrieveContext(
          searchQuery,
          alreadySentTitles,
          vault,
          lastEntityId,
          isImageRequest,
        );

      // Store the primary entity ID in both the user message (for context) and the assistant message (for the button target)
      this.messages[assistantMsgIndex - 1].entityId = primaryEntityId;
      this.messages[assistantMsgIndex].entityId = primaryEntityId;
      this.messages[assistantMsgIndex].sources = sourceIds;

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
        let fullResponse = "";
        await aiService.generateResponse(
          key,
          query,
          history,
          context,
          modelName,
          (partial) => {
            fullResponse = partial;
            this.messages[assistantMsgIndex].content = partial;
            this.lastUpdated = Date.now();
            this.broadcastThrottle();
          },
        );

        // Auto-Creation Flow for /create
        if (isCreateRequest && !import.meta.env.SSR) {
          const { parseOracleResponse } = await import("editor-core");
          const parsed = parseOracleResponse(fullResponse);

          if (parsed.title && !vault.isGuest) {
            try {
              const type = (parsed.type || "npc") as any;
              const id = await vault.createEntity(type, parsed.title, {
                content: parsed.chronicle,
                lore: parsed.lore,
                connections: parsed.wikiLinks || []
              });

              // Provide visual confirmation
              this.messages = [
                ...this.messages,
                {
                  id: crypto.randomUUID(),
                  role: "system",
                  content: `✅ Automatically created node: **${parsed.title}** (${type.toUpperCase()})`
                }
              ];

              this.messages[assistantMsgIndex].entityId = id;
              vault.selectedEntityId = id;
              vault.activeDetailTab = "status";

              // Refit the graph to show the newly created entity
              graph.requestFit();
            } catch (e: any) {
              console.error("[Oracle] Auto-create failed:", e);
              const errorMsg = `❌ Auto-creation failed: ${e.message}`;
              this.messages = [
                ...this.messages,
                {
                  id: crypto.randomUUID(),
                  role: "system",
                  content: errorMsg
                }
              ];
              // Also show a global notification for high-visibility failure
              const { uiStore } = await import("../../stores/ui.svelte");
              uiStore.setGlobalError(errorMsg);
            }
          }
        }
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
      this.saveToDB();
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
      this.saveToDB();
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