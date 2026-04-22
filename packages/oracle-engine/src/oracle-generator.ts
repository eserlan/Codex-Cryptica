import type { ChatMessage, OracleExecutionContext } from "./types";

export class OracleGenerator {
  private buildEntityVisualQuery(entity: {
    title: string;
    labels?: string[];
  }): string {
    const labels = (entity.labels || []).filter(Boolean);
    if (labels.length === 0) {
      return `A visualization of ${entity.title}`;
    }

    return `A visualization of ${entity.title}

HIGH-PRIORITY VISUAL LABELS:
${labels.map((label) => `- ${label}`).join("\n")}

Treat these labels as strong visual direction. If they imply mood, genre, attire, symbolism, environment, or composition, prioritize them in the final image prompt.`;
  }

  /**
   * Identifies the primary entity and gathered source IDs for a query
   * without triggering a full text generation cycle.
   */
  async identifyPrimaryEntity(
    query: string,
    context: OracleExecutionContext,
  ): Promise<{
    primaryEntityId?: string;
    sourceIds: string[];
    searchQuery: string;
  }> {
    const alreadySentTitles = this.getSentTitles(context.chatHistory.messages);
    const apiKey = context.effectiveApiKey || "";

    // 1. Expand query if follow-up
    let searchQuery = query;
    if (context.chatHistory.messages.length > 2 && context.textGeneration) {
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

    return { primaryEntityId, sourceIds, searchQuery };
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

    const apiKey = context.effectiveApiKey || "";

    // 1. Identify primary entity and gather context metadata
    const { primaryEntityId, sourceIds, searchQuery } =
      await this.identifyPrimaryEntity(query, context);

    // 2. Retrieve the actual context content for the identified entities
    // (Optimization: we could fold this into identifyPrimaryEntity if needed,
    // but keeping them distinct for clarity here).
    const lastEntityId = context.chatHistory.messages.findLast(
      (m: ChatMessage) => m.entityId,
    )?.entityId;

    const { content: aiContext } =
      await context.contextRetrieval.retrieveContext(
        searchQuery, // Use expanded search query for specific retrieval here
        alreadySentTitles,
        context.vault,
        lastEntityId,
        false,
      );

    // 3. Trigger Generation
    const categoryList = context.categories?.list?.map((c: any) => c.id);

    await context.textGeneration.generateResponse(
      apiKey,
      query,
      context.chatHistory.messages.slice(0, -2),
      aiContext,
      context.modelName,
      onPartial,
      context.isDemoMode,
      categoryList,
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
    const apiKey = context.effectiveApiKey || "";

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
      this.buildEntityVisualQuery(entity),
      aiContext,
      context.modelName,
      context.isDemoMode,
    );

    return await context.imageGeneration.generateImage(
      apiKey,
      visualPrompt,
      "gemini-3.1-flash-image-preview",
    );
  }

  /**
   * Orchestrates the creation of a visual visualization for a chat message.
   */
  async generateMessageVisualization(
    message: ChatMessage,
    context: OracleExecutionContext,
  ): Promise<Blob> {
    const apiKey = context.effectiveApiKey || "";

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
      entity ? this.buildEntityVisualQuery(entity) : message.content,
      aiContext,
      context.modelName,
      context.isDemoMode,
    );

    return await context.imageGeneration.generateImage(
      apiKey,
      visualPrompt,
      "gemini-3.1-flash-image-preview",
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
