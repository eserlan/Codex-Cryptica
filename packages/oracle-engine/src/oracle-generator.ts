import type { ChatMessage, OracleExecutionContext } from "./types";
import { resolveArtDirection } from "schema";
import {
  DEFAULT_CF_IMAGE_MODEL,
  DEFAULT_CUSTOM_IMAGE_MODEL,
} from "./image-defaults";

interface VisualEntityLike {
  id?: string;
  title: string;
  type?: string;
  categoryId?: string;
  labels?: string[];
  content?: string;
  lore?: string;
  artDirection?: string;
}

export interface PreparedVisualizationPrompt {
  prompt: string;
}

export class OracleGenerator {
  private buildEntityVisualQuery(
    entity: VisualEntityLike,
    context?: OracleExecutionContext,
    options: { ignoreSavedArtDirection?: boolean } = {},
  ): string {
    const artDirection = resolveArtDirection({
      subject: entity.title,
      entityId: entity.id,
      entityTitle: entity.title,
      categoryId: entity.categoryId || entity.type,
      categoryLabel: entity.type,
      themeId: context?.uiStore?.activeThemeId,
      surface: "entity",
      entityArtDirection: options.ignoreSavedArtDirection
        ? undefined
        : this.extractEntityArtDirection(entity),
    });

    return this.appendVisualLabels(artDirection.prompt, entity.labels);
  }

  private buildMessageVisualQuery(
    message: ChatMessage,
    entity: VisualEntityLike | null,
    context: OracleExecutionContext,
  ): string {
    if (entity) {
      return this.buildEntityVisualQuery(entity, context);
    }

    const commandSubject = this.extractDrawCommandSubject(message.content);
    const artDirection = resolveArtDirection({
      subject: commandSubject.subject,
      surface: "chat",
      categoryId: commandSubject.categoryId,
      categoryIdIsHint: Boolean(commandSubject.categoryId),
      themeId: context.uiStore?.activeThemeId,
      userAuthoredArtDirection: this.extractArtDirectionFromText(
        message.content,
      ),
    });

    return artDirection.prompt;
  }

  private appendVisualLabels(basePrompt: string, labels?: string[]): string {
    const cleanLabels = (labels || []).filter(Boolean);
    if (cleanLabels.length === 0) return basePrompt;

    return `${basePrompt}

HIGH-PRIORITY VISUAL LABELS:
${cleanLabels.map((label) => `- ${label}`).join("\n")}

Treat these labels as strong visual direction. If they imply mood, genre, attire, symbolism, environment, or composition, prioritize them in the final image prompt.`;
  }

  private extractEntityArtDirection(entity: VisualEntityLike) {
    return (
      entity.artDirection ||
      this.extractArtDirectionFromText(entity.content) ||
      this.extractArtDirectionFromText(entity.lore)
    );
  }

  private extractArtDirectionFromText(text?: string) {
    if (!text) return undefined;
    const match = text.match(
      /(?:^|\n)#{1,4}\s*(?:art direction|default art style|visual direction)\s*\n+([\s\S]*?)(?=\n#{1,4}\s|\n---|\s*$)/i,
    );
    return match?.[1]?.trim();
  }

  private extractMessageSubject(content: string) {
    const firstLine = content
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);
    return (firstLine || content).slice(0, 180);
  }

  private extractDrawCommandSubject(content: string): {
    subject: string;
    categoryId?: string;
  } {
    const firstLine = this.extractMessageSubject(content);
    const match = firstLine.match(/^\/(?:draw|image)\s+(.+)$/i);
    if (!match) return { subject: firstLine };

    const rawSubject = match[1].trim();
    const categoryMatch = rawSubject.match(
      /^(character|npc|creature|location|place|item|object|faction|event|note|concept|world|cover)\s+(.+)$/i,
    );
    if (!categoryMatch) return { subject: rawSubject };

    return {
      categoryId: categoryMatch[1].toLowerCase(),
      subject: categoryMatch[2].trim(),
    };
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
    options: {
      requestId?: string;
      vaultId?: string;
      existingEntities?: any[];
    } = {},
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

    const { content: aiContext, entries: loreEntries } =
      await context.contextRetrieval.retrieveContext(
        searchQuery, // Use expanded search query for specific retrieval here
        alreadySentTitles,
        context.vault,
        lastEntityId,
        false,
      );

    // 3. Trigger Generation
    const categoryList = Array.from(
      new Set(
        (context.categories || [])
          .map((c: any) => String(c?.id || "").trim())
          .filter(Boolean),
      ),
    );

    await context.textGeneration.generateResponse(
      apiKey,
      query,
      context.chatHistory.messages.slice(0, -2),
      aiContext,
      context.modelName,
      onPartial,
      context.isDemoMode,
      categoryList,
      {
        ...options,
        existingEntities:
          options.existingEntities ||
          Object.values(context.vault.entities || {}),
        // Interactions API delta flow (proxy path; no-op when disabled/keyed).
        // Flag passed explicitly: text generation runs in a worker that can't
        // read a main-thread module-global.
        loreEntries,
        // One oracle worker per tab means one chat session per vault; vaultId
        // is effectively a unique conversation key in the current architecture.
        conversationId: context.vaultId,
        interactionsEnabled: context.interactionsEnabled,
      },
    );

    return { primaryEntityId, sourceIds };
  }

  /**
   * Orchestrates the construction of context and the generation of a structured entity creation response.
   */
  async generateCreationResponse(
    query: string,
    context: OracleExecutionContext,
    onPartial: (partial: string) => void,
  ): Promise<{ primaryEntityId?: string; sourceIds: string[] }> {
    const alreadySentTitles = this.getSentTitles(context.chatHistory.messages);
    const apiKey = context.effectiveApiKey || "";

    const { primaryEntityId, sourceIds, searchQuery } =
      await this.identifyPrimaryEntity(query, context);

    const lastEntityId = context.chatHistory.messages.findLast(
      (m: ChatMessage) => m.entityId,
    )?.entityId;

    const { content: aiContext } =
      await context.contextRetrieval.retrieveContext(
        searchQuery,
        alreadySentTitles,
        context.vault,
        lastEntityId,
        false,
      );

    const categoryList = Array.from(
      new Set(
        (context.categories || [])
          .map((c: any) => String(c?.id || "").trim())
          .filter(Boolean),
      ),
    );

    if (context.textGeneration.generateStructuredEntity) {
      await context.textGeneration.generateStructuredEntity(
        apiKey,
        query,
        aiContext,
        context.modelName,
        onPartial,
        categoryList,
      );
    } else {
      // Fallback to normal response if method not implemented
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
    }

    return { primaryEntityId, sourceIds };
  }

  /**
   * Orchestrates the creation of a visual visualization for an entity.
   */
  async generateEntityVisualization(
    entityId: string,
    context: OracleExecutionContext,
  ): Promise<Blob> {
    const { prompt } = await this.prepareEntityVisualizationPrompt(
      entityId,
      context,
    );
    return this.generateVisualizationFromPrompt(prompt, context);
  }

  async prepareEntityVisualizationPrompt(
    entityId: string,
    context: OracleExecutionContext,
    options: { ignoreSavedArtDirection?: boolean } = {},
  ): Promise<PreparedVisualizationPrompt> {
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

    return {
      prompt: await context.imageGeneration.distillVisualPrompt(
        apiKey,
        this.buildEntityVisualQuery(entity, context, options),
        aiContext,
        context.modelName,
        context.isDemoMode,
      ),
    };
  }

  /**
   * Orchestrates the creation of a visual visualization for a chat message.
   */
  async generateMessageVisualization(
    message: ChatMessage,
    context: OracleExecutionContext,
  ): Promise<Blob> {
    const { prompt } = await this.prepareMessageVisualizationPrompt(
      message,
      context,
    );
    return this.generateVisualizationFromPrompt(prompt, context);
  }

  async prepareMessageVisualizationPrompt(
    message: ChatMessage,
    context: OracleExecutionContext,
  ): Promise<PreparedVisualizationPrompt> {
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

    return {
      prompt: await context.imageGeneration.distillVisualPrompt(
        apiKey,
        this.buildMessageVisualQuery(message, entity, context),
        aiContext,
        context.modelName,
        context.isDemoMode,
      ),
    };
  }

  async generateVisualizationFromPrompt(
    prompt: string,
    context: OracleExecutionContext,
  ): Promise<Blob> {
    const apiKey = context.effectiveApiKey || "";
    const isCustom = context.imageProvider === "custom";
    const isCloudflare = context.imageProvider === "cloudflare";

    let targetKey = apiKey;
    if (isCustom && context.customImageApiKey) {
      targetKey = context.customImageApiKey;
    } else if (isCloudflare) {
      targetKey = "";
    }

    let targetModel = "gemini-2.5-flash-image";
    if (isCustom) {
      targetModel = context.customImageModel || DEFAULT_CUSTOM_IMAGE_MODEL;
    } else if (isCloudflare) {
      targetModel = context.cloudflareModel || DEFAULT_CF_IMAGE_MODEL;
    }

    const needsKey =
      (isCustom && !targetKey) || (!isCustom && !isCloudflare && !targetKey);

    if (needsKey) {
      throw new Error(`MISSING_KEY_PROMPT|${prompt}`);
    }

    return await context.imageGeneration.generateImage(
      targetKey,
      prompt,
      targetModel,
      {
        provider: context.imageProvider,
        baseUrl: context.customImageBaseUrl,
      },
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
