import type { ChatMessage, OracleExecutionContext } from "./types";
import {
  ASPECT_RATIO_DIMENSIONS,
  composeImagePrompt,
  formatForProvider,
  type ComposedPromptMetadata,
  type ImageProviderId,
  type StyleReferenceMode,
} from "schema";
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
  /** The composed positive prompt, before provider formatting. */
  prompt: string;
  /** Provider-neutral negative terms. */
  negativeTerms: string[];
  /** Art Direction v2 inputs, stored alongside the generated image. */
  metadata: ComposedPromptMetadata;
}

/** Advanced overrides an entry point may pass through to the composer. */
export interface VisualizationPromptOptions {
  ignoreSavedArtDirection?: boolean;
  cameraVariant?: string;
  styleReferenceMode?: StyleReferenceMode;
}

export class OracleGenerator {
  /**
   * Builds the seed sent to the subject distiller. This is a request for a
   * description, not a prompt — the distiller answers with physical facts and
   * the composer supplies everything else.
   */
  private buildEntitySubjectSeed(
    entity: VisualEntityLike,
    labels?: string[],
  ): string {
    const descriptors = [
      entity.type ? `a ${entity.type}` : "",
      `named "${entity.title}"`,
    ]
      .filter(Boolean)
      .join(" ");

    return this.appendVisualLabels(
      `Describe what ${descriptors} physically looks like, for an illustration.`,
      labels,
    );
  }

  private appendVisualLabels(basePrompt: string, labels?: string[]): string {
    const cleanLabels = (labels || []).filter(Boolean);
    if (cleanLabels.length === 0) return basePrompt;

    return `${basePrompt}

HIGH-PRIORITY VISUAL LABELS:
${cleanLabels.map((label) => `- ${label}`).join("\n")}

Treat these labels as strong direction for the subject's appearance, attire, and condition.`;
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
    const prepared = await this.prepareEntityVisualizationPrompt(
      entityId,
      context,
    );
    return this.generateVisualizationFromPrompt(prepared, context);
  }

  async prepareEntityVisualizationPrompt(
    entityId: string,
    context: OracleExecutionContext,
    options: VisualizationPromptOptions = {},
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

    // Stage 1: the model resolves vault canon into physical description only.
    const subject = await context.imageGeneration.distillVisualSubject(
      apiKey,
      this.buildEntitySubjectSeed(entity, entity.labels),
      aiContext,
      context.modelName,
      context.isDemoMode,
    );

    // Stage 2: deterministic composition around that subject.
    const composed = composeImagePrompt({
      subject,
      category: entity.categoryId || entity.type,
      theme: context?.uiStore?.activeThemeId,
      cameraVariant: options.cameraVariant,
      styleReferenceMode: options.styleReferenceMode,
      styleOverride: options.ignoreSavedArtDirection
        ? undefined
        : this.extractEntityArtDirection(entity),
      subjectOptions: {
        names: [entity.title],
        descriptor: entity.type ? `a ${entity.type}` : undefined,
      },
    });

    return {
      prompt: composed.prompt,
      negativeTerms: composed.negativeTerms,
      metadata: composed.metadata,
    };
  }

  /**
   * Orchestrates the creation of a visual visualization for a chat message.
   */
  async generateMessageVisualization(
    message: ChatMessage,
    context: OracleExecutionContext,
  ): Promise<Blob> {
    const prepared = await this.prepareMessageVisualizationPrompt(
      message,
      context,
    );
    return this.generateVisualizationFromPrompt(prepared, context);
  }

  async prepareMessageVisualizationPrompt(
    message: ChatMessage,
    context: OracleExecutionContext,
    options: VisualizationPromptOptions = {},
  ): Promise<PreparedVisualizationPrompt> {
    if (message.entityId && context.vault.entities[message.entityId]) {
      return this.prepareEntityVisualizationPrompt(
        message.entityId,
        context,
        options,
      );
    }

    const apiKey = context.effectiveApiKey || "";
    const command = this.extractDrawCommandSubject(message.content);

    const { content: aiContext } =
      await context.contextRetrieval.retrieveContext(
        message.content.slice(0, 100),
        new Set(),
        context.vault,
        message.entityId,
        true,
      );

    const subject = await context.imageGeneration.distillVisualSubject(
      apiKey,
      command.subject,
      aiContext,
      context.modelName,
      context.isDemoMode,
    );

    const composed = composeImagePrompt({
      subject,
      category: command.categoryId,
      theme: context.uiStore?.activeThemeId,
      cameraVariant: options.cameraVariant,
      styleReferenceMode: options.styleReferenceMode,
      styleOverride: this.extractArtDirectionFromText(message.content),
    });

    return {
      prompt: composed.prompt,
      negativeTerms: composed.negativeTerms,
      metadata: composed.metadata,
    };
  }

  /**
   * Accepts either a composed prompt with its negatives, or a bare string for
   * the manual-override path where the user has hand-edited the prompt.
   */
  async generateVisualizationFromPrompt(
    input: string | PreparedVisualizationPrompt,
    context: OracleExecutionContext,
  ): Promise<Blob> {
    const composed =
      typeof input === "string"
        ? { prompt: input, negativeTerms: [] as string[] }
        : input;
    const aspectRatio =
      typeof input === "string" ? undefined : input.metadata?.aspectRatio;

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

    // Negatives are attached in whichever form this provider understands:
    // a dedicated field, or inline in the prompt.
    const payload = formatForProvider(
      composed,
      context.imageProvider as ImageProviderId | undefined,
    );

    if (needsKey) {
      throw new Error(`MISSING_KEY_PROMPT|${payload.prompt}`);
    }

    return await context.imageGeneration.generateImage(
      targetKey,
      payload.prompt,
      targetModel,
      {
        provider: context.imageProvider,
        baseUrl: context.customImageBaseUrl,
        negativePrompt: payload.negativePrompt,
        // The hand-edited prompt path has no composed metadata; the provider
        // default applies there.
        dimensions: aspectRatio
          ? ASPECT_RATIO_DIMENSIONS[aspectRatio]
          : undefined,
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
