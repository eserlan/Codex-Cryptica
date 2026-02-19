import { aiService, TIER_MODES } from "../services/ai";
import { getDB } from "../utils/idb";
import { graph } from "./graph.svelte";
import { vault } from "./vault.svelte";
import { uiStore } from "./ui.svelte";

export interface ChatMessage {
  id: string; // Unique identifier for reactivity and identification
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "image" | "wizard";
  wizardType?: "connection" | "merge";
  imageUrl?: string; // temporary blob: URL or local path
  imageBlob?: Blob; // stored temporarily for archiving
  entityId?: string; // ID of the entity used for generation context
  archiveTargetId?: string; // ID of the entity where the user wants to archive this message
  sources?: string[]; // IDs of entities consulted for this message (FR-001)
  isDrawing?: boolean; // Indicates if this message is currently triggering an image generation
  hasDrawAction?: boolean; // Whether this message provides a "Draw" button
}

export interface UndoableAction {
  id: string;
  messageId?: string;
  description: string;
  revert: () => Promise<void>;
  timestamp: number;
}

class OracleStore {
  messages = $state<ChatMessage[]>([]);
  lastUpdated = $state<number>(0);
  isOpen = $state(false);
  isLoading = $state(false);
  isUndoing = $state(false);
  apiKey = $state<string | null>(null);
  tier = $state<"lite" | "advanced">("lite");
  isModal = $state(false);
  activeStyleTitle = $state<string | null>(null);

  // Undo Stack (Transient, not persisted to DB)
  undoStack = $state<UndoableAction[]>([]);

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
          this.isUndoing = data.isUndoing;
          this.apiKey = data.apiKey;
          this.tier = data.tier || "lite";
        } else if (type === "REQUEST_STATE") {
          this.broadcast();
        }
      };

      // Request state from other windows on load
      this.channel.postMessage({ type: "REQUEST_STATE" });

      // Listen for vault switches to clear chat history
      window.addEventListener("vault-switched", () => {
        this.clearMessages();
      });
    }
  }

  pushUndoAction(
    description: string,
    revert: () => Promise<void>,
    messageId?: string,
  ) {
    this.undoStack.push({
      id: crypto.randomUUID(),
      messageId,
      description,
      revert,
      timestamp: Date.now(),
    });
    // Limit stack size to prevent memory leaks, keep last 50 actions
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  async undo() {
    if (this.undoStack.length === 0 || this.isUndoing) return;

    this.isUndoing = true;
    this.broadcast();

    // Peek the action first
    const action = this.undoStack[this.undoStack.length - 1];
    if (action) {
      try {
        await action.revert();

        // Remove from stack ONLY after successful revert
        this.undoStack.pop();

        // Broadcast local event for UI components (like ChatMessage)
        this.channel?.postMessage({
          type: "UNDO_PERFORMED",
          data: { actionId: action.id, messageId: action.messageId },
        });

        // Show success system message
        this.messages = [
          ...this.messages,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: `↩️ Undid action: **${action.description}**`,
          },
        ];
        this.lastUpdated = Date.now();
        this.broadcast();
        this.saveToDB();
      } catch (err: any) {
        console.error("Undo failed:", err);
        // We leave it on the stack? Copilot suggested pushing it back,
        // but since we peeked, we just don't pop it.
        // Actually, if it failed, it might be stuck.
        // But letting the user retry is better than losing it.

        this.messages = [
          ...this.messages,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: `❌ Undo failed: ${err.message}. You can try again.`,
          },
        ];
        this.lastUpdated = Date.now();
        this.broadcast();
      } finally {
        this.isUndoing = false;
        this.broadcast();
      }
    } else {
      this.isUndoing = false;
      this.broadcast();
    }
  }

  private broadcast() {
    this.channel?.postMessage({
      type: "SYNC_STATE",
      data: {
        messages: $state.snapshot(this.messages),
        lastUpdated: this.lastUpdated,
        isLoading: this.isLoading,
        isUndoing: this.isUndoing,
        apiKey: this.apiKey,
        tier: this.tier,
      },
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

  async clearKey() {
    const db = await getDB();
    await db.delete("settings", "ai_api_key");
    this.apiKey = null;
    this.clearMessages();
    this.lastUpdated = Date.now();
    this.broadcast();
  }

  clearMessages() {
    // Revoke all blob URLs to prevent memory leaks
    this.messages.forEach((m) => {
      if (m.imageUrl && m.imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(m.imageUrl);
      }
    });
    this.messages = [];
    this.lastUpdated = Date.now();
    this.broadcast();
    this.saveToDB();
  }

  get isEnabled() {
    const sharedKey =
      (typeof window !== "undefined" &&
        (window as any).__SHARED_GEMINI_KEY__) ||
      import.meta.env.VITE_SHARED_GEMINI_KEY;
    return !!this.apiKey || !!sharedKey;
  }

  get effectiveApiKey() {
    // Advanced mode REQUIRES a personal API key
    if (this.tier === "advanced") {
      return this.apiKey;
    }
    const sharedKey =
      (typeof window !== "undefined" &&
        (window as any).__SHARED_GEMINI_KEY__) ||
      import.meta.env.VITE_SHARED_GEMINI_KEY;
    return this.apiKey || sharedKey;
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

  startWizard(type: "connection" | "merge") {
    this.messages = [
      ...this.messages,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Starting ${type} wizard...`,
        type: "wizard",
        wizardType: type,
      },
    ];
    this.lastUpdated = Date.now();
    this.broadcast();
    this.saveToDB();
  }

  removeMessage(id: string) {
    const msg = this.messages.find((m) => m.id === id);
    if (msg?.imageUrl && msg.imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(msg.imageUrl);
    }
    this.messages = this.messages.filter((m) => m.id !== id);
    this.lastUpdated = Date.now();
    this.broadcast();
    this.saveToDB();
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
          content:
            "The Oracle is currently offline. Conversational expansion and AI generation are suspended, but local retrieval will attempt to find matches for your raw query.",
        },
      ];
      this.lastUpdated = Date.now();
      this.broadcast();
      this.saveToDB();
      return;
    }

    const isCreateRequest = query.toLowerCase().trim().startsWith("/create");
    const isConnectRequest = query.toLowerCase().trim().startsWith("/connect");
    const isMergeRequest = query.toLowerCase().trim().startsWith("/merge");
    const isImageRequest =
      !isCreateRequest &&
      !isConnectRequest &&
      !isMergeRequest &&
      this.detectImageIntent(query);

    this.messages = [
      ...this.messages,
      { id: crypto.randomUUID(), role: "user", content: query },
    ];
    this.lastUpdated = Date.now();
    this.isLoading = true;
    this.broadcast();
    this.saveToDB();

    // Handle Direct /merge request
    if (isMergeRequest) {
      try {
        // 1. Deterministic Quoted Parsing
        // Matches: /merge "Source" into "Target"
        const quotedRegex = /\/merge\s+"([^"]+)"\s+into\s+"([^"]+)"/i;
        const match = query.match(quotedRegex);

        let sourceName = "";
        let targetName = "";

        if (match) {
          sourceName = match[1];
          targetName = match[2];
          console.log(
            `[Oracle] Deterministic merge parse: "${sourceName}" -> "${targetName}"`,
          );
        } else {
          // 2. AI Fallback
          const modelName = TIER_MODES[this.tier];
          const intent = await aiService.parseMergeIntent(
            key,
            modelName,
            query,
          );
          sourceName = intent.sourceName;
          targetName = intent.targetName;
        }

        if (!sourceName || !targetName) {
          throw new Error(
            'Could not identify both entities. Try using `/merge "Source" into "Target"`.',
          );
        }

        // Resolve entities
        const { searchService } = await import("../services/search");
        const sourceRes = await searchService.search(sourceName, { limit: 1 });
        const targetRes = await searchService.search(targetName, { limit: 1 });

        if (sourceRes[0] && targetRes[0]) {
          const sourceId = sourceRes[0].id;
          const targetId = targetRes[0].id;

          if (sourceId === targetId) {
            throw new Error("Cannot merge an entity into itself.");
          }

          const sourceEntity = vault.entities[sourceId];
          const targetEntity = vault.entities[targetId];

          if (sourceEntity && targetEntity) {
            // Execute Merge via nodeMergeService
            const { nodeMergeService } =
              await import("../services/node-merge.service");

            // 1. Propose (Concat strategy for speed/safety in direct command)
            const proposal = await nodeMergeService.proposeMerge({
              sourceNodeIds: [sourceId, targetId],
              targetNodeId: targetId,
              strategy: "concat",
            });

            // 2. Capture state for Undo (Immediately before execution)
            const beforeTarget = $state.snapshot(vault.entities[targetId]);
            const beforeSource = $state.snapshot(vault.entities[sourceId]);

            // 3. Execute
            await nodeMergeService.executeMerge(proposal, [sourceId, targetId]);

            this.messages = [
              ...this.messages,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `✅ Merged **${sourceEntity.title}** into **${targetEntity.title}**.`,
              },
            ];

            // Push Undo
            this.pushUndoAction(
              `Merge ${sourceEntity.title} into ${targetEntity.title}`,
              async () => {
                // Re-create source
                await vault.createEntity(
                  beforeSource.type,
                  beforeSource.title,
                  { ...beforeSource },
                );
                // Restore target
                vault.updateEntity(targetId, beforeTarget);
              },
            );

            this.lastUpdated = Date.now();
            this.isLoading = false;
            this.broadcast();
            this.saveToDB();
            return;
          }
        }

        throw new Error(
          `Could not find one or both entities: "${sourceName}" or "${targetName}".`,
        );
      } catch (err: any) {
        this.messages = [
          ...this.messages,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: `❌ ${err.message}`,
          },
        ];
        this.isLoading = false;
        this.lastUpdated = Date.now();
        this.broadcast();
        this.saveToDB();
        return;
      }
    }

    // Handle Direct /connect request
    if (isConnectRequest) {
      try {
        // 1. Deterministic Quoted Parsing (Zero Latency Path)
        // Matches: /connect "Entity A" label text "Entity B"
        const quotedRegex = /\/connect\s+"([^"]+)"\s+(.+?)\s+"([^"]+)"/i;
        const match = query.match(quotedRegex);

        let sourceName = "";
        let targetName = "";
        let label = "";
        let type = "related_to";

        if (match) {
          sourceName = match[1];
          label = match[2].trim();
          targetName = match[3];
          console.log(
            `[Oracle] Deterministic parse: "${sourceName}" -> "${label}" -> "${targetName}"`,
          );
        } else {
          // 2. AI Fallback for natural language without strict quotes
          const modelName = TIER_MODES[this.tier];
          const intent = await aiService.parseConnectionIntent(
            key,
            modelName,
            query,
          );
          sourceName = intent.sourceName;
          targetName = intent.targetName;
          label = intent.label || "";
          type = (intent.type as any) || "related_to";
        }

        // Try to resolve entities via search
        const { searchService } = await import("../services/search");
        const sourceRes = await searchService.search(sourceName, {
          limit: 1,
        });
        const targetRes = await searchService.search(targetName, {
          limit: 1,
        });

        if (sourceRes[0] && targetRes[0]) {
          const sourceId = sourceRes[0].id;
          const targetId = targetRes[0].id;
          const source = vault.entities[sourceId];
          const target = vault.entities[targetId];

          if (source && target) {
            // Direct Creation
            const allowedTypes = ["related_to", "neutral", "friendly", "enemy"];
            const typeToUse = allowedTypes.includes(type)
              ? (type as any)
              : "related_to";

            const success = vault.addConnection(
              source.id,
              target.id,
              typeToUse,
              label,
            );

            if (success) {
              this.messages = [
                ...this.messages,
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: `✅ Connected **${source.title}** to **${target.title}** as *${label || typeToUse}*.`,
                },
              ];

              // Push Undo
              this.pushUndoAction(
                `Connect ${source.title} to ${target.title}`,
                async () => {
                  vault.removeConnection(source.id, target.id, typeToUse);
                },
              );

              this.lastUpdated = Date.now();
              this.isLoading = false;
              this.broadcast();
              this.saveToDB();
              return;
            } else {
              throw new Error("Vault refused to create connection.");
            }
          } else {
            const missingName = !source ? sourceName : targetName;
            throw new Error(
              `Entity "${missingName}" was found in search but is missing from the active vault.`,
            );
          }
        }

        throw new Error(
          "Could not identify both entities. Try using the guided wizard with `/connect oracle`.",
        );
      } catch (err: any) {
        this.messages = [
          ...this.messages,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: `❌ ${err.message}`,
          },
        ];
        this.isLoading = false;
        this.lastUpdated = Date.now();
        this.broadcast();
        this.saveToDB();
        return;
      }
    }

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
        searchQuery = await aiService.expandQuery(
          key,
          query,
          this.messages.slice(0, -2),
        );
      }

      // Identify the last entity we were talking about
      let lastEntityId: string | undefined;
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.messages[i].entityId) {
          lastEntityId = this.messages[i].entityId;
          break;
        }
      }

      const {
        content: context,
        primaryEntityId,
        sourceIds,
        activeStyleTitle,
      } = await aiService.retrieveContext(
        searchQuery,
        alreadySentTitles,
        vault,
        lastEntityId,
        isImageRequest,
      );

      this.activeStyleTitle = activeStyleTitle || null;
      this.broadcast();

      // Store the primary entity ID in both the user message (for context) and the assistant message (for the button target)
      this.messages[assistantMsgIndex - 1].entityId = primaryEntityId;
      this.messages[assistantMsgIndex].entityId = primaryEntityId;
      this.messages[assistantMsgIndex].sources = sourceIds;
      if (!isImageRequest) {
        this.messages[assistantMsgIndex].hasDrawAction =
          this.tier === "advanced";
      }

      if (isImageRequest) {
        // Image Generation Flow
        const textModelName = TIER_MODES[this.tier];
        const visualPrompt = await aiService.distillVisualPrompt(
          key,
          query,
          context,
          textModelName,
          uiStore.isDemoMode,
        );
        const imageModelName = "gemini-2.5-flash-image";

        const blob = await aiService.generateImage(
          key,
          visualPrompt,
          imageModelName,
        );
        const imageUrl = URL.createObjectURL(blob);

        this.messages[assistantMsgIndex].type = "image";
        this.messages[assistantMsgIndex].imageUrl = imageUrl;
        this.messages[assistantMsgIndex].imageBlob = blob;
        this.messages[assistantMsgIndex].content =
          `Generated visualization for: "${query}"`;
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
          uiStore.isDemoMode,
        );

        // Auto-Creation Flow for /create
        if (isCreateRequest && !import.meta.env.SSR) {
          const { parseOracleResponse } = await import("editor-core");
          const { sanitizeId } = await import("../utils/markdown");
          const parsed = parseOracleResponse(fullResponse);

          if (parsed.title && !vault.isGuest) {
            try {
              const type = (parsed.type || "character") as any;
              const connections = [
                ...(parsed.wikiLinks || []),
                ...(parsed.connections || []).map((conn) => {
                  const targetName =
                    typeof conn === "string" ? conn : conn.target;
                  const label =
                    typeof conn === "string" ? conn : conn.label || conn.target;
                  return {
                    target: sanitizeId(targetName),
                    label: label,
                    type: "related_to",
                    strength: 1.0,
                  };
                }),
              ];

              const id = await vault.createEntity(type, parsed.title, {
                content: parsed.chronicle,
                lore: parsed.lore,
                connections,
                image: parsed.image,
                thumbnail: parsed.thumbnail,
              });

              // Provide visual confirmation
              this.messages = [
                ...this.messages,
                {
                  id: crypto.randomUUID(),
                  role: "system",
                  content: `✅ Automatically created node: **${parsed.title}** (${type.toUpperCase()})`,
                },
              ];

              this.messages[assistantMsgIndex].entityId = id;
              vault.selectedEntityId = id;

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
                  content: errorMsg,
                },
              ];
              // Also show a global notification for high-visibility failure
              const { uiStore } = await import("./ui.svelte");
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
      this.activeStyleTitle = null;
      this.isLoading = false;
      this.lastUpdated = Date.now();
      this.broadcast();
      this.saveToDB();
    }
  }

  async drawEntity(entityId: string) {
    const key = this.effectiveApiKey;
    if (!key || this.isLoading) return;

    const entity = vault.entities[entityId];
    if (!entity) return;

    if (this.isLoading) {
      return;
    }
    try {
      this.isLoading = true;
      this.broadcast();

      const { content: context, activeStyleTitle } =
        await aiService.retrieveContext(
          entity.title,
          new Set(),
          vault,
          entityId,
          true, // isImage
        );

      this.activeStyleTitle = activeStyleTitle || null;
      this.broadcast();

      const textModelName = TIER_MODES[this.tier];
      const visualPrompt = await aiService.distillVisualPrompt(
        key,
        `A visualization of ${entity.title}`,
        context,
        textModelName,
        uiStore.isDemoMode,
      );

      const imageModelName = "gemini-2.5-flash-image";
      const blob = await aiService.generateImage(
        key,
        visualPrompt,
        imageModelName,
      );

      await vault.saveImageToVault(blob, entityId);
    } catch (err: any) {
      console.error("[OracleStore] drawEntity failed:", err);
      this.messages = [
        ...this.messages,
        {
          id: crypto.randomUUID(),
          role: "system",
          content: `❌ Image generation failed for **${entity.title}**: ${err.message}`,
        },
      ];
    } finally {
      this.activeStyleTitle = null;
      this.isLoading = false;
      this.lastUpdated = Date.now();
      this.broadcast();
      this.saveToDB();
    }
  }

  async drawMessage(messageId: string) {
    const key = this.effectiveApiKey;
    if (!key || this.isLoading) return;

    const msgIndex = this.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const message = this.messages[msgIndex];

    try {
      message.isDrawing = true;
      this.isLoading = true;
      this.broadcast();

      const entity = message.entityId ? vault.entities[message.entityId] : null;
      const searchQuery = entity ? entity.title : message.content.slice(0, 100);

      const { content: context, activeStyleTitle } =
        await aiService.retrieveContext(
          searchQuery,
          new Set(),
          vault,
          message.entityId,
          true, // isImage
        );

      this.activeStyleTitle = activeStyleTitle || null;
      this.broadcast();

      const textModelName = TIER_MODES[this.tier];
      const visualPrompt = await aiService.distillVisualPrompt(
        key,
        message.content,
        context,
        textModelName,
        uiStore.isDemoMode,
      );

      const imageModelName = "gemini-2.5-flash-image";
      const blob = await aiService.generateImage(
        key,
        visualPrompt,
        imageModelName,
      );

      const imageUrl = URL.createObjectURL(blob);
      const oldUrl = message.imageUrl;

      // Update message in place
      this.messages[msgIndex] = {
        ...message,
        type: "image",
        imageUrl,
        imageBlob: blob,
        isDrawing: false,
        hasDrawAction: false, // Hide button after use
      };

      if (oldUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(oldUrl);
      }
    } catch (err: any) {
      console.error("[OracleStore] drawMessage failed:", err);
      message.isDrawing = false;
      this.messages = [
        ...this.messages,
        {
          id: crypto.randomUUID(),
          role: "system",
          content: `❌ Image generation failed: ${err.message}`,
        },
      ];
    } finally {
      this.activeStyleTitle = null;
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

  updateMessageEntity(messageId: string, entityId: string | null) {
    const target = this.messages.find((m) => m.id === messageId);
    if (target) {
      target.archiveTargetId = entityId || undefined;
      this.broadcast();
      this.saveToDB();
    }
  }

  // For E2E tests: add a mock image message directly
  addTestImageMessage(
    content: string,
    imageUrl: string,
    imageBlob: Blob,
    entityId?: string,
  ) {
    this.messages = [
      ...this.messages,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        type: "image",
        imageUrl,
        imageBlob,
        entityId,
      },
    ];
    this.lastUpdated = Date.now();
    this.broadcast();
    this.saveToDB();
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
