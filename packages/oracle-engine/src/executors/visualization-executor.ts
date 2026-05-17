import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";
import type { OracleGenerator } from "../oracle-generator";

export class VisualizationExecutor
  extends BaseExecutor
  implements OracleCommandExecutor
{
  constructor(private generator?: OracleGenerator) {
    super();
  }

  async execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
  ): Promise<void> {
    await this.executeWithStack(intent, context, async () => {
      await this.emit(context, {
        type: ORACLE_EVENTS.COMMAND_STARTED,
        payload: { intent },
      });

      try {
        if (intent.type === "draw") {
          const entityId = intent.entityId || context.vault.selectedEntityId;
          if (entityId) {
            await this.drawEntity(entityId, context);
          } else {
            throw new Error("Please select an entity to visualize.");
          }
        } else {
          // Handle other visualization intents if any
        }

        await this.emit(context, {
          type: ORACLE_EVENTS.COMMAND_COMPLETED,
          payload: { intent },
        });
      } catch (err: any) {
        const error = err.message || "Visualization failed";
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
  }

  async drawEntity(entityId: string, context: OracleExecutionContext) {
    const entity = context.vault.entities[entityId];
    if (!entity) return;

    const generator =
      this.generator || context.generator || context.draftingEngine?.generator;
    if (!generator) throw new Error("Generator not available in context.");

    const blob = await generator.generateEntityVisualization(entityId, context);

    if (context.isDemoMode) {
      const imageUrl = URL.createObjectURL(blob);
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        type: "image",
        imageUrl,
        imageBlob: blob,
        entityId,
      });
    } else {
      const { image, thumbnail } = await context.vault.saveImageToVault(
        blob,
        entityId,
      );
      await context.vault.updateEntity(entityId, {
        image,
        thumbnail,
      });
    }
  }

  async drawMessage(messageId: string, context: OracleExecutionContext) {
    const msgIndex = context.chatHistory.messages.findIndex(
      (m: any) => m.id === messageId,
    );
    if (msgIndex === -1) return;

    const message = context.chatHistory.messages[msgIndex];
    const generator =
      this.generator || context.generator || context.draftingEngine?.generator;
    if (!generator) throw new Error("Generator not available in context.");

    const blob = await generator.generateMessageVisualization(message, context);
    const imageUrl = URL.createObjectURL(blob);
    const updatedMsgs = [...context.chatHistory.messages];
    updatedMsgs[msgIndex] = {
      ...message,
      type: "image",
      imageUrl,
      imageBlob: blob,
      isDrawing: false,
      hasDrawAction: false,
    };
    context.chatHistory.setMessages(updatedMsgs);
  }
}
