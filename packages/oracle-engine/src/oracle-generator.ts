import type { ChatMessage, OracleExecutionContext } from "./types";

export class OracleGenerator {
  /**
   * Orchestrates the construction of context and the generation of an AI chat response.
   */
  async generateChatResponse(
    query: string,
    context: OracleExecutionContext,
    onPartial: (partial: string) => void,
  ): Promise<{ primaryEntityId?: string; sourceIds: string[] }> {
    const alreadySentTitles = this.getSentTitles(context.chatHistory.messages);

    // 1. Expand query if follow-up
    let searchQuery = query;
    if (context.chatHistory.messages.length > 2) {
      searchQuery = await context.textGeneration.expandQuery(
        context.effectiveApiKey!,
        query,
        context.chatHistory.messages.slice(0, -2),
      );
    }

    // 2. Identify focus entity
    let lastEntityId: string | undefined;
    for (let i = context.chatHistory.messages.length - 1; i >= 0; i--) {
      if (context.chatHistory.messages[i].entityId) {
        lastEntityId = context.chatHistory.messages[i].entityId;
        break;
      }
    }

    // 3. Retrieve RAG Context
    const {
      content: aiContext,
      primaryEntityId,
      sourceIds,
    } = await context.contextRetrieval.retrieveContext(
      searchQuery,
      alreadySentTitles,
      context.vault,
      lastEntityId,
      false,
    );

    // 4. Trigger Generation
    await context.textGeneration.generateResponse(
      context.effectiveApiKey!,
      query,
      context.chatHistory.messages.slice(0, -2),
      aiContext,
      context.modelName,
      onPartial,
      context.isDemoMode,
    );

    return { primaryEntityId, sourceIds };
  }

  /**
   * Orchestrates the creation of a visual visualization for an entity.
   */
  async generateEntityVisualization(
    entityId: string,
    context: OracleExecutionContext,
  ): Promise<Blob> {
    const entity = context.vault.entities[entityId];
    const { content: aiContext } = await context.contextRetrieval.retrieveContext(
      entity.title,
      new Set(),
      context.vault,
      entityId,
      true,
    );

    const visualPrompt = await context.imageGeneration.distillVisualPrompt(
      context.effectiveApiKey!,
      `A visualization of ${entity.title}`,
      aiContext,
      context.modelName,
      context.isDemoMode,
    );

    return await context.imageGeneration.generateImage(
      context.effectiveApiKey!,
      visualPrompt,
      "gemini-2.5-flash-image",
    );
  }

  /**
   * Orchestrates the creation of a visual visualization for a chat message.
   */
  async generateMessageVisualization(
    message: ChatMessage,
    context: OracleExecutionContext,
  ): Promise<Blob> {
    const entity = message.entityId
      ? context.vault.entities[message.entityId]
      : null;
    const searchQuery = entity ? entity.title : message.content.slice(0, 100);

    const { content: aiContext } = await context.contextRetrieval.retrieveContext(
      searchQuery,
      new Set(),
      context.vault,
      message.entityId,
      true,
    );

    const visualPrompt = await context.imageGeneration.distillVisualPrompt(
      context.effectiveApiKey!,
      message.content,
      aiContext,
      context.modelName,
      context.isDemoMode,
    );

    return await context.imageGeneration.generateImage(
      context.effectiveApiKey!,
      visualPrompt,
      "gemini-2.5-flash-image",
    );
  }

  private getSentTitles(messages: ChatMessage[]): Set<string> {
    const titles = new Set<string>();
    messages.forEach((m) => {
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
