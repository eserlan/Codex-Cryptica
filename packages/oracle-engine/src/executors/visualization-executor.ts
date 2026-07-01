import type {
  OracleCommandExecutor,
  OracleIntent,
  OracleExecutionContext,
} from "../types";
import { BaseExecutor } from "./base-executor";
import { ORACLE_EVENTS } from "../events";
import type { OracleGenerator } from "../oracle-generator";
import type { Clock } from "../runtime";

export class VisualizationExecutor
  extends BaseExecutor
  implements OracleCommandExecutor
{
  constructor(
    private generator?: OracleGenerator,
    clock?: Clock,
  ) {
    super(clock);
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

    const generator = this.generator || context.generator;
    if (!generator) throw new Error("Generator not available in context.");

    try {
      const blob = await generator.generateEntityVisualization(
        entityId,
        context,
      );

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
    } catch (err: any) {
      if (err.message && err.message.startsWith("MISSING_KEY_PROMPT|")) {
        const prompt = err.message.split("MISSING_KEY_PROMPT|")[1];
        await context.chatHistory.addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Image generation requires an API key. You can copy and paste the generated prompt below into an external image generator:\n\n\`\`\`text\n${prompt}\n\`\`\``,
        });
        await context.vault.updateEntity(entityId, {
          artDirection: prompt,
        });
        return;
      }
      throw err;
    }
  }

  async prepareEntityPrompt(
    entityId: string,
    context: OracleExecutionContext,
    options: { ignoreSavedArtDirection?: boolean } = {},
  ) {
    const entity = context.vault.entities[entityId];
    if (!entity) return null;

    const generator = this.generator || context.generator;
    if (!generator) throw new Error("Generator not available in context.");

    return generator.prepareEntityVisualizationPrompt(
      entityId,
      context,
      options,
    );
  }

  async generateEntityFromPrompt(
    entityId: string,
    prompt: string,
    context: OracleExecutionContext,
  ) {
    const entity = context.vault.entities[entityId];
    if (!entity) return;

    const generator = this.generator || context.generator;
    if (!generator) throw new Error("Generator not available in context.");

    try {
      const blob = await generator.generateVisualizationFromPrompt(
        prompt,
        context,
      );

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
    } catch (err: any) {
      if (err.message && err.message.startsWith("MISSING_KEY_PROMPT|")) {
        await context.chatHistory.addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Image generation requires an API key. You can copy and paste the generated prompt below into an external image generator:\n\n\`\`\`text\n${prompt}\n\`\`\``,
        });
        await context.vault.updateEntity(entityId, {
          artDirection: prompt,
        });
        return;
      }
      throw err;
    }
  }

  async drawMessage(messageId: string, context: OracleExecutionContext) {
    const msgIndex = context.chatHistory.messages.findIndex(
      (m: any) => m.id === messageId,
    );
    if (msgIndex === -1) return;

    const message = context.chatHistory.messages[msgIndex];
    const generator = this.generator || context.generator;
    if (!generator) throw new Error("Generator not available in context.");

    try {
      const blob = await generator.generateMessageVisualization(
        message,
        context,
      );
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
    } catch (err: any) {
      if (err.message && err.message.startsWith("MISSING_KEY_PROMPT|")) {
        const prompt = err.message.split("MISSING_KEY_PROMPT|")[1];
        await context.chatHistory.addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Image generation requires an API key. You can copy and paste the generated prompt below into an external image generator:\n\n\`\`\`text\n${prompt}\n\`\`\``,
        });

        // Update the message state to remove the drawing state
        const updatedMsgs = [...context.chatHistory.messages];
        updatedMsgs[msgIndex] = {
          ...message,
          isDrawing: false,
        };
        context.chatHistory.setMessages(updatedMsgs);
        return;
      }
      throw err;
    }
  }

  async prepareMessagePrompt(
    messageId: string,
    context: OracleExecutionContext,
  ) {
    const msgIndex = context.chatHistory.messages.findIndex(
      (m: any) => m.id === messageId,
    );
    if (msgIndex === -1) return null;

    const generator = this.generator || context.generator;
    if (!generator) throw new Error("Generator not available in context.");

    return generator.prepareMessageVisualizationPrompt(
      context.chatHistory.messages[msgIndex],
      context,
    );
  }

  async generateMessageFromPrompt(
    messageId: string,
    prompt: string,
    context: OracleExecutionContext,
  ) {
    const msgIndex = context.chatHistory.messages.findIndex(
      (m: any) => m.id === messageId,
    );
    if (msgIndex === -1) return;

    const message = context.chatHistory.messages[msgIndex];
    const generator = this.generator || context.generator;
    if (!generator) throw new Error("Generator not available in context.");

    try {
      const blob = await generator.generateVisualizationFromPrompt(
        prompt,
        context,
      );
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
    } catch (err: any) {
      if (err.message && err.message.startsWith("MISSING_KEY_PROMPT|")) {
        await context.chatHistory.addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Image generation requires an API key. You can copy and paste the generated prompt below into an external image generator:\n\n\`\`\`text\n${prompt}\n\`\`\``,
        });

        const updatedMsgs = [...context.chatHistory.messages];
        updatedMsgs[msgIndex] = {
          ...message,
          isDrawing: false,
        };
        context.chatHistory.setMessages(updatedMsgs);
        return;
      }
      throw err;
    }
  }
}
