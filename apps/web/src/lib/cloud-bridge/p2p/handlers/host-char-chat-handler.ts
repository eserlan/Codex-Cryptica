import { BaseHandler, type P2PHandlerContext } from "./base-handler";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import * as Comlink from "comlink";
import { oracleBridge } from "../../oracle-bridge";

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

export class HostCharChatHandler extends BaseHandler {
  canHandle(message: P2PMessage): boolean {
    return message.type === "GUEST_CHAR_CHAT_REQUEST";
  }

  async handle(
    message: P2PMessage,
    connection: P2PConnection,
    context: P2PHandlerContext,
  ): Promise<void> {
    if (message.type !== "GUEST_CHAR_CHAT_REQUEST") return;

    const { requestId, characterId, guestUsername, query, history } = message;
    const oracle = context.oracle;

    if (!oracle) {
      connection.send({
        type: "GUEST_CHAR_CHAT_DONE",
        requestId,
        error: "Oracle not available on host.",
      });
      return;
    }

    // oracle.executor runs in the main thread (direct reference), but
    // oracle.textGeneration IS a Comlink proxy to the worker. The executor
    // creates internal streaming callbacks that capture local closures — these
    // can't cross postMessage unmodified. Intercept generateResponse and wrap
    // the onUpdate callback with Comlink.proxy before it hits the worker.
    const isWorker = oracleBridge.isReady;

    // Build a lightweight mock chatHistory backed by the provided history array
    // (runs entirely in the main thread — no Comlink wrapping needed)
    const messages: any[] = history.map((m) => ({ ...m }));

    const mockChatHistory = {
      get messages() {
        return messages;
      },
      addMessage: async (msg: any) => {
        messages.push({ ...msg });
      },
      updateMessage: async (id: string, updates: any, _persist = true) => {
        const m = messages.find((x) => x.id === id);
        if (m && updates.content !== undefined) m.content = updates.content;
      },
      getMessages: async () => [...messages],
      setMessages: async (msgs: any[]) => {
        messages.length = 0;
        messages.push(...msgs);
      },
    };

    const guestCharacterId = resolveGuestCharacterId(
      guestUsername,
      context.vault.entities,
    );

    // Shim that wraps the streaming callback before it crosses into the worker.
    // Mirrors the same pattern used in sendMessageLocally (guest-chat.svelte.ts).
    const textGeneration = {
      generateResponse: (
        apiKey: string,
        q: string,
        hist: any[],
        contextStr: string,
        modelName: string,
        onUpdate: (partial: string) => void,
        demoMode?: boolean,
        categoriesList?: string[],
        options?: any,
      ) => {
        const callback = isWorker ? Comlink.proxy(onUpdate) : onUpdate;
        return oracle.textGeneration.generateResponse(
          apiKey,
          q,
          hist,
          contextStr,
          modelName,
          callback,
          demoMode,
          categoriesList,
          options,
        );
      },
    };

    const executionContext: any = {
      vault: {
        activeVaultId: context.vault.activeVaultId,
        selectedEntityId: null,
        entities: context.vault.entities,
        defaultVisibility: context.vault.defaultVisibility,
        isGuest: false,
        guestCharacterId,
      },
      aiDisabled: false,
      effectiveApiKey: oracle.effectiveApiKey,
      modelName: oracle.modelName,
      isDemoMode: false,
      chatHistory: mockChatHistory,
      textGeneration,
      uiStore: { activeThemeId: context.themeStore?.worldThemeId },
    };

    const onPartial = (partial: string) => {
      connection.send({ type: "GUEST_CHAR_CHAT_CHUNK", requestId, partial });
    };

    try {
      await oracle.executor.execute(
        {
          type: "guest-chat",
          query,
          entityId: characterId,
          data: guestCharacterId ? { guestCharacterId } : undefined,
        },
        executionContext,
        onPartial,
      );
      connection.send({ type: "GUEST_CHAR_CHAT_DONE", requestId });
    } catch (err: any) {
      connection.send({
        type: "GUEST_CHAR_CHAT_DONE",
        requestId,
        error: err?.message ?? "Generation failed.",
      });
    }
  }
}
