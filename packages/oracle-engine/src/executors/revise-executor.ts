import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
  ChatMessage,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";
import type { OracleGenerator } from "../oracle-generator";
import { buildRelatedEntityContext } from "../revision-context";
import type { Clock, IdGenerator } from "../runtime";

export class ReviseExecutor
  extends BaseExecutor
  implements OracleCommandExecutor
{
  private isExecuting = false;

  constructor(
    private generator?: OracleGenerator,
    clock?: Clock,
    idGenerator?: IdGenerator,
  ) {
    super(clock, idGenerator);
  }

  async execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
    onPartialResponse?: (partial: string) => void,
  ): Promise<void> {
    if (this.isExecuting) {
      await context.chatHistory.addMessage({
        id: this.idGenerator.uuid(),
        role: "system",
        content:
          "Revision is already in progress. Please wait for it to finish.",
      });
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
              "Please select an entity in the graph or sidebar to revise its content.",
            );
          }

          const entity = context.vault.entities[entityId];
          if (!entity) throw new Error("Entity not found in vault.");

          if (context.vault.isGuest)
            throw new Error("Guest users cannot revise content.");

          const assistantMsg: ChatMessage = {
            id: this.idGenerator.uuid(),
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

          if (!context.textGeneration?.reviseEntityUpdate) {
            throw new Error("Entity revision is not available in context.");
          }

          const relatedContext = buildRelatedEntityContext({
            entity,
            incoming: { chronicle: "", lore: "" },
            vault: context.vault,
            getConsolidatedContext: (related) =>
              context.contextRetrieval?.getConsolidatedContext?.(related) ||
              related.content ||
              "",
          });
          const categories = (context.categories || []).map(
            (category: any) => ({
              id: category.id,
              label: category.label,
              description: category.description,
            }),
          );
          const revised = await context.textGeneration.reviseEntityUpdate(
            context.effectiveApiKey || "",
            context.modelName,
            entity,
            { chronicle: "", lore: "" },
            relatedContext,
            categories,
            {
              source: "revise",
              instructions: intent.instructions,
              priority: "instructions-first",
              isGuest: context.vault.isGuest,
              themeId: context.uiStore?.activeThemeId,
            },
          );
          handlePartial(
            `**Chronicle:** ${revised.content}\n\n**Lore:** ${revised.lore}`,
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
          const error = err.message || "Revision failed";
          await context.chatHistory.addMessage({
            id: this.idGenerator.uuid(),
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
