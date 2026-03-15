import type { ChatMessage, OracleExecutionContext } from "./types";

export class OracleGenerator {
  /**
   * Identifies the primary entity and gathered source IDs for a query
   * without triggering a full text generation cycle.
   */
  async identifyPrimaryEntity(
    query: string,
    context: OracleExecutionContext,
  ): Promise<{ primaryEntityId?: string; sourceIds: string[] }> {
    const alreadySentTitles = this.getSentTitles(context.chatHistory.messages);
    const apiKey = context.effectiveApiKey;
    if (!apiKey) return { sourceIds: [] };

    // 1. Expand query if follow-up
    let searchQuery = query;
    if (context.chatHistory.messages.length > 2) {
      searchQuery = await context.textGeneration.expandQuery(
        apiKey,
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
    const { primaryEntityId, sourceIds } =
      await context.contextRetrieval.retrieveContext(
        searchQuery,
        alreadySentTitles,
        context.vault,
        lastEntityId,
        false,
      );

    return { primaryEntityId, sourceIds };
  }

  /**
   * Orchestrates the construction of context and the generation of an AI chat response.
   */
  async generateChatResponse(
    query: string,
    context: OracleExecutionContext,
    onPartial: (partial: string) => void,
  ): Promise<{ primaryEntityId?: string; sourceIds: string[] }> {
    const alreadySentTitles = this.getSentTitles(context.chatHistory.messages);

    const apiKey = context.effectiveApiKey;
    if (!apiKey) {
      await context.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content:
          "⚠️ AI features require an API key. Please configure one in Settings.",
      });
      return { sourceIds: [] };
    }

    // 1. Identify primary entity and gather context metadata
    const { primaryEntityId, sourceIds } = await this.identifyPrimaryEntity(
      query,
      context,
    );

    // 2. Retrieve the actual context content for the identified entities
    // (Optimization: we could fold this into identifyPrimaryEntity if needed,
    // but keeping them distinct for clarity here).
    const lastEntityId = context.chatHistory.messages.findLast(
      (m: ChatMessage) => m.entityId,
    )?.entityId;

    const { content: aiContext } =
      await context.contextRetrieval.retrieveContext(
        query, // Use original query for specific retrieval here
        alreadySentTitles,
        context.vault,
        lastEntityId,
        false,
      );

    // 3. Trigger Generation
    await context.textGeneration.generateResponse(
      apiKey,
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
    const apiKey = context.effectiveApiKey;
    if (!apiKey) throw new Error("API key missing");

    const entity = context.vault.entities[entityId];
    const { content: aiContext } =
      await context.contextRetrieval.retrieveContext(
        entity.title,
        new Set(),
        context.vault,
        entityId,
        true,
      );

    const visualPrompt = await context.imageGeneration.distillVisualPrompt(
      apiKey,
      `A visualization of ${entity.title}`,
      aiContext,
      context.modelName,
      context.isDemoMode,
    );

    return await context.imageGeneration.generateImage(
      apiKey,
      visualPrompt,
      "gemini-3.1-flash-image-preview", // Use Nano Banana 2 specifically for IMAGE modality
    );
  }

  /**
   * Orchestrates the creation of a visual visualization for a chat message.
   */
  async generateMessageVisualization(
    message: ChatMessage,
    context: OracleExecutionContext,
  ): Promise<Blob> {
    const apiKey = context.effectiveApiKey;
    if (!apiKey) throw new Error("API key missing");

    const entity = message.entityId
      ? context.vault.entities[message.entityId]
      : null;
    const searchQuery = entity ? entity.title : message.content.slice(0, 100);

    const { content: aiContext } =
      await context.contextRetrieval.retrieveContext(
        searchQuery,
        new Set(),
        context.vault,
        message.entityId,
        true,
      );

    const visualPrompt = await context.imageGeneration.distillVisualPrompt(
      apiKey,
      message.content,
      aiContext,
      context.modelName,
      context.isDemoMode,
    );

    return await context.imageGeneration.generateImage(
      apiKey,
      visualPrompt,
      "gemini-3.1-flash-image-preview", // Use Nano Banana 2 specifically for IMAGE modality
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
