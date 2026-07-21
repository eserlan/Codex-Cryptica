import { getDB } from "../utils/idb";
import type { GuestChatTranscript, GuestChatMessage } from "schema";
import { vault } from "./vault.svelte";
import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
import { oracle } from "./oracle.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import type { OracleExecutionContext } from "@codex/oracle-engine";
import { oracleBridge } from "$lib/cloud-bridge/oracle-bridge";
import * as Comlink from "comlink";
import {
  systemClock,
  type IdGenerator,
  systemIdGenerator,
} from "$lib/utils/runtime-deps";

function resolveGuestCharacterId(
  username: string | null | undefined,
  entities: Record<string, any>,
): string | null {
  if (!username?.trim()) return null;
  const name = username.trim().toLowerCase();
  for (const entity of Object.values(entities)) {
    if (entity.type !== "character") continue;
    if (entity.title?.toLowerCase() === name) return entity.id;
    if (entity.aliases?.some((a: string) => a.toLowerCase() === name))
      return entity.id;
    if (entity.labels?.some((l: string) => l.toLowerCase() === name))
      return entity.id;
  }
  return null;
}

export class GuestChatStore {
  transcripts = $state<Record<string, GuestChatTranscript>>({});
  activeCharacterId = $state<string | null>(null);
  isGenerating = $state(false);

  showChatModal = $state(false);

  activeTranscript = $derived(
    this.activeCharacterId ? this.transcripts[this.activeCharacterId] : null,
  );

  openChat(characterId: string, characterTitle: string) {
    void this.startChat(characterId, characterTitle);
    this.showChatModal = true;
  }

  private idGenerator: IdGenerator;

  constructor(idGenerator: IdGenerator = systemIdGenerator) {
    this.idGenerator = idGenerator;
    if (typeof window !== "undefined") {
      void this.init();
    }
  }

  async init() {
    try {
      const db = await getDB();
      const all = await db.getAll("guest_chat_transcripts");
      const recordMap: Record<string, GuestChatTranscript> = {};
      for (const transcript of all) {
        recordMap[transcript.characterId] = transcript;
      }
      this.transcripts = recordMap;
    } catch (err) {
      console.error(
        "[GuestChatStore] Failed to load transcripts from DB:",
        err,
      );
    }
  }

  async startChat(characterId: string, characterTitle: string) {
    this.activeCharacterId = characterId;

    if (!this.transcripts[characterId]) {
      const guestId = p2pGuestService.peerId || "guest-local";
      const guestName = sessionModeStore.guestUsername || "Invited Guest";
      const transcript: GuestChatTranscript = {
        id: this.idGenerator.uuid(),
        guestId,
        guestName,
        characterId,
        characterTitle,
        messages: [],
        lastUpdated: systemClock.now(),
      };

      this.transcripts[characterId] = transcript;

      const db = await getDB();
      await db.put("guest_chat_transcripts", $state.snapshot(transcript));
      this.syncTranscript(transcript);
    }
  }

  // Pending P2P requests: requestId → { characterId, assistantMsgId }
  private pendingRequests = new Map<
    string,
    { characterId: string; assistantMsgId: string }
  >();

  async sendMessage(characterId: string, content: string) {
    if (!content.trim()) return;

    const transcript = this.transcripts[characterId];
    if (!transcript) return;

    const userMsg: GuestChatMessage = {
      id: this.idGenerator.uuid(),
      role: "user",
      content: content.trim(),
      timestamp: systemClock.now(),
    };

    transcript.messages.push(userMsg);
    transcript.lastUpdated = systemClock.now();

    const db = await getDB();
    await db.put("guest_chat_transcripts", $state.snapshot(transcript));
    this.syncTranscript(transcript);

    this.isGenerating = true;

    if (p2pGuestService.connected) {
      await this.sendMessageViaHost(characterId, content.trim(), transcript);
    } else {
      await this.sendMessageLocally(characterId, content.trim(), transcript);
    }
  }

  private async sendMessageViaHost(
    characterId: string,
    query: string,
    transcript: GuestChatTranscript,
  ) {
    const assistantMsgId = this.idGenerator.uuid();
    const assistantMsg: GuestChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: systemClock.now(),
    };
    transcript.messages.push(assistantMsg);
    transcript.lastUpdated = systemClock.now();

    const requestId = this.idGenerator.uuid();
    this.pendingRequests.set(requestId, { characterId, assistantMsgId });

    const history = transcript.messages
      .filter((m) => m.id !== assistantMsgId)
      .map((m) => ({ id: m.id, role: m.role, content: m.content }));

    const sent = p2pGuestService.sendToHost({
      type: "GUEST_CHAR_CHAT_REQUEST",
      requestId,
      characterId,
      guestUsername: sessionModeStore.guestUsername ?? "",
      query,
      history,
    });

    if (!sent) {
      transcript.messages.pop();
      this.pendingRequests.delete(requestId);
      this.isGenerating = false;
      console.error(
        "[GuestChatStore] P2P connection lost; message not delivered",
      );
    }
  }

  handleChatChunk(requestId: string, partial: string) {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) return;
    const transcript = this.transcripts[pending.characterId];
    if (!transcript) return;
    const msg = transcript.messages.find(
      (m) => m.id === pending.assistantMsgId,
    );
    if (msg) {
      msg.content = partial;
      transcript.lastUpdated = systemClock.now();
    }
  }

  async handleChatDone(requestId: string, error?: string) {
    const pending = this.pendingRequests.get(requestId);
    this.pendingRequests.delete(requestId);
    this.isGenerating = false;

    if (!pending) return;
    const transcript = this.transcripts[pending.characterId];
    if (!transcript) return;

    if (error) {
      const msg = transcript.messages.find(
        (m) => m.id === pending.assistantMsgId,
      );
      if (msg) msg.content = `❌ ${error}`;
    }

    transcript.lastUpdated = systemClock.now();
    const db = await getDB();
    await db.put("guest_chat_transcripts", $state.snapshot(transcript));
    this.syncTranscript(transcript);
  }

  private async sendMessageLocally(
    characterId: string,
    query: string,
    transcript: GuestChatTranscript,
  ) {
    try {
      const isWorker = oracleBridge.isReady;
      const wrap = (method: any) => {
        if (!method) return undefined;
        return isWorker ? Comlink.proxy(method) : method;
      };

      const mockChatHistory = {
        messages: transcript.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        addMessage: wrap(async (msg: any) => {
          const newMsg: GuestChatMessage = {
            id: msg.id,
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content || "",
            timestamp: msg.timestamp ?? systemClock.now(),
          };
          transcript.messages.push(newMsg);
          transcript.lastUpdated = systemClock.now();
          const localDb = await getDB();
          await localDb.put(
            "guest_chat_transcripts",
            $state.snapshot(transcript),
          );
        }),
        updateMessage: wrap(
          async (id: string, updates: any, persist = true) => {
            const existing = transcript.messages.find((m) => m.id === id);
            if (existing) {
              if (updates.content !== undefined)
                existing.content = updates.content;
              transcript.lastUpdated = systemClock.now();
              if (persist) {
                const localDb = await getDB();
                await localDb.put(
                  "guest_chat_transcripts",
                  $state.snapshot(transcript),
                );
                this.syncTranscript(transcript);
              }
            }
          },
        ),
        getMessages: wrap(async () =>
          transcript.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
        ),
        setMessages: wrap(async (msgs: any[]) => {
          transcript.messages = msgs.map((m) => ({
            id: m.id,
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
            timestamp: m.timestamp ?? systemClock.now(),
          }));
          transcript.lastUpdated = systemClock.now();
          const localDb = await getDB();
          await localDb.put(
            "guest_chat_transcripts",
            $state.snapshot(transcript),
          );
          this.syncTranscript(transcript);
        }),
      };

      const context: OracleExecutionContext = {
        vault: {
          activeVaultId: vault.activeVaultId,
          selectedEntityId: vault.selectedEntityId,
          entities: $state.snapshot(vault.entities),
          defaultVisibility: vault.defaultVisibility,
          isGuest: vault.isGuest,
          updateEntity: wrap(vault.updateEntity?.bind(vault)),
          loadEntityContent: wrap(vault.loadEntityContent?.bind(vault)),
        },
        categories: [],
        aiDisabled: discoveryPolicyStore.aiDisabled || false,
        effectiveApiKey: oracle.effectiveApiKey,
        modelName: oracle.modelName || "gemini-3-flash-preview",
        isDemoMode: false,
        chatHistory: mockChatHistory,
        textGeneration: {
          generateResponse: (
            apiKey: string,
            q: string,
            history: any[],
            contextStr: string,
            modelName: string,
            onUpdate: (partial: string) => void,
            demoMode?: boolean,
            categoriesList?: string[],
            options?: {
              requestId?: string;
              vaultId?: string;
              existingEntities?: any[];
            },
          ) => {
            const callback = isWorker
              ? Comlink.proxy(onUpdate)
              : (onUpdate as any);
            return oracle.textGeneration.generateResponse(
              apiKey,
              q,
              $state.snapshot([...history]),
              contextStr,
              modelName,
              callback,
              demoMode,
              categoriesList ? $state.snapshot(categoriesList) : undefined,
              {
                ...options,
                requestId: options?.requestId || undefined,
                vaultId: options?.vaultId || vault.activeVaultId || undefined,
                existingEntities: options?.existingEntities
                  ? $state.snapshot(options.existingEntities)
                  : $state.snapshot(Object.values(vault.entities || {})),
              },
            );
          },
        },
      } as any;

      const guestCharacterId = resolveGuestCharacterId(
        sessionModeStore.guestUsername,
        vault.entities,
      );

      await oracle.executor.execute(
        {
          type: "guest-chat",
          query,
          entityId: characterId,
          data: guestCharacterId ? { guestCharacterId } : undefined,
        },
        context,
      );
    } catch (err) {
      console.error("[GuestChatStore] Failed to generate chat response:", err);
    } finally {
      this.isGenerating = false;
      this.syncTranscript(transcript);
    }
  }

  async clearTranscript(characterId: string) {
    const transcript = this.transcripts[characterId];
    if (!transcript) return;

    transcript.messages = [];
    transcript.lastUpdated = systemClock.now();

    const db = await getDB();
    await db.put("guest_chat_transcripts", $state.snapshot(transcript));
    this.syncTranscript(transcript);
  }

  async saveMessageEdit(
    characterId: string,
    messageId: string,
    newContent: string,
  ) {
    const transcript = this.transcripts[characterId];
    if (!transcript) return;
    const msg = transcript.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.content = newContent.trim();
      transcript.lastUpdated = systemClock.now();
      const db = await getDB();
      await db.put("guest_chat_transcripts", $state.snapshot(transcript));
      this.syncTranscript(transcript);
    }
  }

  async deleteMessage(characterId: string, messageId: string) {
    const transcript = this.transcripts[characterId];
    if (!transcript) return;
    transcript.messages = transcript.messages.filter((m) => m.id !== messageId);
    transcript.lastUpdated = systemClock.now();
    const db = await getDB();
    await db.put("guest_chat_transcripts", $state.snapshot(transcript));
    this.syncTranscript(transcript);
  }

  syncTranscript(transcript: GuestChatTranscript) {
    if (
      p2pGuestService.connected &&
      transcript.messages.length > 0 &&
      p2pGuestService.sendToHost
    ) {
      p2pGuestService.sendToHost({
        type: "GUEST_CHAT_TRANSCRIPT_SYNC",
        payload: $state.snapshot(transcript),
      });
    }
  }
}

export const guestChatStore = new GuestChatStore();
