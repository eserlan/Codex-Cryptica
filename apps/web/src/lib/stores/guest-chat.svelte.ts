import { getDB } from "../utils/idb";
import type { GuestChatTranscript, GuestChatMessage } from "schema";
import { vault } from "./vault.svelte";
import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
import { oracle } from "./oracle.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import type { OracleExecutionContext } from "@codex/oracle-engine";

export class GuestChatStore {
  transcripts = $state<Record<string, GuestChatTranscript>>({});
  activeCharacterId = $state<string | null>(null);
  isGenerating = $state(false);

  activeTranscript = $derived(
    this.activeCharacterId ? this.transcripts[this.activeCharacterId] : null,
  );

  constructor() {
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
        id: crypto.randomUUID(),
        guestId,
        guestName,
        characterId,
        characterTitle,
        messages: [],
        lastUpdated: Date.now(),
      };

      this.transcripts[characterId] = transcript;

      const db = await getDB();
      await db.put("guest_chat_transcripts", $state.snapshot(transcript));
      this.syncTranscript(transcript);
    }
  }

  async sendMessage(characterId: string, content: string) {
    if (!content.trim()) return;

    const transcript = this.transcripts[characterId];
    if (!transcript) return;

    const userMsg: GuestChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: Date.now(),
    };

    transcript.messages.push(userMsg);
    transcript.lastUpdated = Date.now();

    const db = await getDB();
    await db.put("guest_chat_transcripts", $state.snapshot(transcript));
    this.syncTranscript(transcript);

    this.isGenerating = true;
    try {
      const mockChatHistory = {
        messages: transcript.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        addMessage: async (msg: any) => {
          const newMsg: GuestChatMessage = {
            id: msg.id,
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content || "",
            timestamp: msg.timestamp || Date.now(),
          };
          transcript.messages.push(newMsg);
          transcript.lastUpdated = Date.now();
          const localDb = await getDB();
          await localDb.put(
            "guest_chat_transcripts",
            $state.snapshot(transcript),
          );
        },
        updateMessage: async (id: string, updates: any, persist = true) => {
          const existing = transcript.messages.find((m) => m.id === id);
          if (existing) {
            if (updates.content !== undefined)
              existing.content = updates.content;
            transcript.lastUpdated = Date.now();
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
        getMessages: async () => {
          return transcript.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          }));
        },
        setMessages: async (msgs: any[]) => {
          transcript.messages = msgs.map((m) => ({
            id: m.id,
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
            timestamp: m.timestamp || Date.now(),
          }));
          transcript.lastUpdated = Date.now();
          const localDb = await getDB();
          await localDb.put(
            "guest_chat_transcripts",
            $state.snapshot(transcript),
          );
          this.syncTranscript(transcript);
        },
      };

      const context: OracleExecutionContext = {
        vault: vault,
        categories: [],
        aiDisabled: discoveryPolicyStore.aiDisabled || false,
        effectiveApiKey: oracle.effectiveApiKey,
        modelName: oracle.modelName || "gemini-3-flash-preview",
        isDemoMode: false,
        chatHistory: mockChatHistory,
        textGeneration: oracle.textGeneration,
      } as any;

      await oracle.executor.execute(
        {
          type: "guest-chat",
          query: content.trim(),
          entityId: characterId,
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
    transcript.lastUpdated = Date.now();

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
