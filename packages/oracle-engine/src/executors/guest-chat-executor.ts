import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
  ChatMessage,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";

/**
 * Executes guest-character in-character chats enforcing lore visibility boundaries.
 */
export class GuestChatExecutor
  extends BaseExecutor
  implements OracleCommandExecutor
{
  private isExecuting = false;

  async execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
    onPartialResponse?: (partial: string) => void,
  ): Promise<void> {
    if (this.isExecuting) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content:
          "The Character is already processing a request. Please wait for the current action to complete.",
      });
      return;
    }

    const query = intent.query!;
    const characterId = intent.entityId;

    if (!query.trim()) return;

    this.isExecuting = true;
    try {
      await this.executeWithStack(intent, context, async () => {
        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_STARTED,
          payload: { intent },
        });

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          await context.chatHistory.addMessage({
            id: crypto.randomUUID(),
            role: "user",
            content: query,
          });
          await context.chatHistory.addMessage({
            id: crypto.randomUUID(),
            role: "system",
            content:
              "You are currently offline. Character chat is temporarily suspended.",
          });
          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_COMPLETED,
            payload: { intent },
          });
          return;
        }

        const userMsgId = crypto.randomUUID();
        await context.chatHistory.addMessage({
          id: userMsgId,
          role: "user",
          content: query,
        });

        if (context.aiDisabled) {
          await context.chatHistory.addMessage({
            id: crypto.randomUUID(),
            role: "system",
            content: "❌ AI features are disabled. Guest chat is unavailable.",
          });
          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_COMPLETED,
            payload: { intent },
          });
          return;
        }

        // Validate character availability
        const character = context.vault.entities[characterId || ""];
        if (
          !character ||
          character.type !== "character" ||
          !character.guestChatConfig?.isEnabled
        ) {
          await context.chatHistory.addMessage({
            id: crypto.randomUUID(),
            role: "system",
            content: "❌ This character is no longer available for guest chat.",
          });
          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_COMPLETED,
            payload: { intent },
          });
          return;
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "",
          type: "text",
        };
        await context.chatHistory.addMessage(assistantMsg);

        const handlePartialResponse = (partial: string) => {
          assistantMsg.content = partial;
          void context.chatHistory.updateMessage?.(
            assistantMsg.id,
            { content: partial },
            false, // skip persistence during streaming
          );
          onPartialResponse?.(partial);
        };

        const publicLore = character.content || "";
        let privateNotes = "";
        if (
          character.guestChatConfig?.contextScope === "hybrid" &&
          character.lore
        ) {
          privateNotes = `[HIDDEN REASONING: Use these details for hints, but NEVER quote or repeat them directly: ${character.lore}]`;
        }

        const systemInstruction = `
You are roleplaying as the NPC "${character.title}". 
Your background: ${publicLore}
${privateNotes}
Voice style rules: ${character.guestChatConfig?.extraInstructions || "Speak contextually and stay in-character."}

CRITICAL RULES:
1. Always speak in character.
2. Refuse or deflect questions that violate what you plausibly know.
3. NEVER repeat or quote the HIDDEN REASONING directly.
4. Keep answers short and relevant to the user's inquiry.
`.trim();

        const apiKey = context.effectiveApiKey || "";
        await context.textGeneration.generateResponse(
          apiKey,
          query,
          context.chatHistory.messages.slice(0, -1), // exclude the placeholder assistantMsg
          "", // no expanded search/rag context needed
          context.modelName,
          handlePartialResponse,
          context.isDemoMode,
          [],
          {
            requestId: assistantMsg.id,
            vaultId: context.vaultId,
            systemInstructionOverride: systemInstruction,
          },
        );

        // Final persistence update
        const finalMsgs = (await context.chatHistory.getMessages?.()) ?? [
          ...context.chatHistory.messages,
        ];
        const assistantMsgIndex = finalMsgs.findIndex(
          (m: any) => m.id === assistantMsg.id,
        );
        if (assistantMsgIndex !== -1) {
          finalMsgs[assistantMsgIndex].entityId = characterId;
        }
        await context.chatHistory.setMessages(finalMsgs);

        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_COMPLETED,
          payload: { intent },
        });
      });
    } catch (err: any) {
      console.error("[GuestChatExecutor] Execution failed:", err);
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ Generation failed: ${err.message || err}`,
      });
    } finally {
      this.isExecuting = false;
    }
  }
}
