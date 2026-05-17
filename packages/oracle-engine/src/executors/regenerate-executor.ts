import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
  ChatMessage,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";
import type { OracleGenerator } from "../oracle-generator";

export class RegenerateExecutor
  extends BaseExecutor
  implements OracleCommandExecutor
{
  private isExecuting = false;

  constructor(private generator?: OracleGenerator) {
    super();
  }

  async execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
    onPartialResponse?: (partial: string) => void,
  ): Promise<void> {
    if (this.isExecuting) {
      console.warn(
        "[RegenerateExecutor] Execution skipped: already in progress.",
      );
      return;
    }

    this.isExecuting = true;
    try {
      await this.executeWithStack(intent, context, async () => {
        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_STARTED,
          payload: { intent },
        });

        try {
          const entityId = intent.entityId || context.vault.selectedEntityId;
          if (!entityId) {
            throw new Error(
              "Please select an entity in the graph or sidebar to regenerate its content.",
            );
          }

          const entity = context.vault.entities[entityId];
          if (!entity) throw new Error("Entity not found in vault.");

          if (context.vault.isGuest)
            throw new Error("Guest users cannot regenerate content.");

          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "",
            entityId,
          };
          await context.chatHistory.addMessage(assistantMsg);

          const handlePartial = (partial: string) => {
            assistantMsg.content = partial;
            void context.chatHistory.updateMessage?.(
              assistantMsg.id,
              { content: partial },
              false,
            );
            onPartialResponse?.(partial);
          };

          const generator =
            this.generator ||
            context.generator ||
            context.draftingEngine?.generator;
          if (!generator)
            throw new Error("Generator not available in context.");

          await generator.generateRegenerationResponse(
            entityId,
            context,
            handlePartial,
          );

          // Final update to set the proposals/metadata
          const finalMsgs = (await context.chatHistory.getMessages?.()) ?? [
            ...context.chatHistory.messages,
          ];
          const idx = finalMsgs.findIndex(
            (m: ChatMessage) => m.id === assistantMsg.id,
          );
          if (idx !== -1) {
            finalMsgs[idx].content = assistantMsg.content;
          }
          await context.chatHistory.setMessages(finalMsgs);

          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_COMPLETED,
            payload: { intent },
          });
        } catch (err: any) {
          const error = err.message || "Regeneration failed";
          await context.chatHistory.addMessage({
            id: crypto.randomUUID(),
            role: "system",
            content: `❌ ${error}`,
          });
          await this.emit(context, {
            type: ORACLE_EVENTS.COMMAND_FAILED,
            payload: { intent, error },
          });
        }
      });
    } finally {
      this.isExecuting = false;
    }
  }
}
