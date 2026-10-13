import type { ChatMessage, OracleExecutionContext } from "./types";
import {
  ASPECT_RATIO_DIMENSIONS,
  composeImagePrompt,
  formatForProvider,
  isEntityVisible,
  type AspectRatio,
  type ComposedPromptMetadata,
  type ImageProviderId,
  type StyleReferenceMode,
} from "schema";
import {
  DEFAULT_CF_IMAGE_MODEL,
  DEFAULT_CUSTOM_IMAGE_MODEL,
} from "./image-defaults";
import { resolveFocusQuery } from "./conversation-focus";
import { oracleConversationId } from "./conversation-id";

interface VisualEntityLike {
  id?: string;
  title: string;
  type?: string;
  categoryId?: string;
  labels?: string[];
  content?: string;
  lore?: string;
  artDirection?: string;
  imageArtDirection?: { statureId?: string };
  parent?: string;
  connections?: Array<{ target: string }>;
}

/** How far up a parent chain a look is inherited before giving up. */
const MAX_ART_DIRECTION_DEPTH = 4;

/** Entity types whose look is meant to be shared by what belongs to them. */
const LOOK_DEFINING_TYPES = new Set([
  "faction",
  "organization",
  "organisation",
  "culture",
  "world",
]);

export interface PreparedVisualizationPrompt {
  /** The composed positive prompt, before provider formatting. */
  prompt: string;
  /** Provider-neutral negative terms. */
  negativeTerms: string[];
  /** Art Direction v2 inputs, stored alongside the generated image. */
  metadata: ComposedPromptMetadata;
}

/**
 * A prompt a user has seen and possibly edited, carrying the parts of the
 * composition that are not recoverable from its text.
 */
export interface ReviewedVisualizationPrompt {
  prompt: string;
  negativeTerms?: string[];
  aspectRatio?: AspectRatio;
}

export type VisualizationPromptInput =
  string | PreparedVisualizationPrompt | ReviewedVisualizationPrompt;

/** Advanced overrides an entry point may pass through to the composer. */
export interface VisualizationPromptOptions {
  ignoreSavedArtDirection?: boolean;
  cameraVariant?: string;
  styleReferenceMode?: StyleReferenceMode;
  /** Overrides the stature the entity's labels imply. */
  stature?: string;
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

  /**
   * Resolves the look an entity should be drawn with: its own block, else one
   * inherited from what it belongs to.
   *
   * A knight of a faction drawn on their own otherwise gets the plain vault
   * theme and looks nothing like the faction portrait beside it. Inheritance
   * runs up the parent chain first — the hierarchy the user built by hand — and
   * then to connected factions, cultures and worlds, whose whole purpose is a
   * shared look. It deliberately does not inherit from an arbitrary connection:
   * being linked to a character is not a reason to look like them.
   */
  private resolveArtDirection(
    entity: VisualEntityLike,
    entities: Record<string, VisualEntityLike> | undefined,
  ): { text?: string; inherited: boolean } {
    const own = this.extractEntityArtDirection(entity);
    if (own) return { text: own, inherited: false };
    if (!entities) return { inherited: false };

    const seen = new Set<string>([entity.id || ""]);

    let ancestor = entity.parent ? entities[entity.parent] : undefined;
    for (let depth = 0; ancestor && depth < MAX_ART_DIRECTION_DEPTH; depth++) {
      if (seen.has(ancestor.id || "")) break;
      seen.add(ancestor.id || "");
      const inheritedText = this.extractEntityArtDirection(ancestor);
      if (inheritedText) return { text: inheritedText, inherited: true };
      ancestor = ancestor.parent ? entities[ancestor.parent] : undefined;
    }

    for (const connection of entity.connections || []) {
      const linked = entities[connection.target];
      if (!linked || seen.has(linked.id || "")) continue;
      if (!LOOK_DEFINING_TYPES.has((linked.type || "").toLowerCase())) continue;
      const inheritedText = this.extractEntityArtDirection(linked);
      if (inheritedText) return { text: inheritedText, inherited: true };
    }

    return { inherited: false };
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
    /** Set when the query was read as a follow-up about this record. */
    focusTitle?: string;
  }> {
    const { primaryEntityId, sourceIds, searchQuery, focusTitle } =
      await this.retrieveForQuery(query, context);
    return { primaryEntityId, sourceIds, searchQuery, focusTitle };
  }

  /**
   * Resolves the query and runs retrieval once per turn. The same result
   * feeds both the primary-entity choice and the lore sent to the model.
   */
  private async retrieveForQuery(
    query: string,
    context: OracleExecutionContext,
    pinnedEntityIds: string[] = [],
  ) {
    const lastEntityId = context.chatHistory.messages.findLast(
      (m: ChatMessage) => m.entityId,
    )?.entityId;

    const { searchQuery, focusTitle } = await this.buildSearchQuery(
      query,
      context,
      lastEntityId,
    );

    // Pins are only passed when present, so plain turns keep the same call.
    const pinOption = pinnedEntityIds.length > 0 ? [{ pinnedEntityIds }] : [];
    const retrieved = await context.contextRetrieval.retrieveContext(
      searchQuery,
      // Lore is re-sent every turn on purpose: the stateless path has no
      // memory between calls, and the Interactions path tracks what it has
      // already sent per conversation (LoreDeltaTracker).
      new Set<string>(),
      context.vault,
      lastEntityId,
      false,
      ...pinOption,
    );

    return { ...retrieved, searchQuery, focusTitle };
  }

  /**
   * Resolves a follow-up against the focus entity's id first; free-text
   * pronoun expansion only runs when there is no usable focus (#4055).
   */
  private async buildSearchQuery(
    query: string,
    context: OracleExecutionContext,
    lastEntityId?: string,
  ): Promise<{ searchQuery: string; focusTitle?: string }> {
    const focus = this.getVisibleEntity(context, lastEntityId);
    const focusQuery =
      focus &&
      resolveFocusQuery(
        query,
        focus,
        context.vault.allEntities || Object.values(context.vault.entities),
      );
    if (focusQuery) return { searchQuery: focusQuery, focusTitle: focus.title };

    if (context.chatHistory.messages.length > 2 && context.textGeneration) {
      const searchQuery = await context.textGeneration.expandQuery(
        context.effectiveApiKey || "",
        query,
        context.chatHistory.messages.slice(0, -2),
      );
      return { searchQuery };
    }
    return { searchQuery: query };
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
      /** Entities the user picked with `@` in the composer (#4052). */
      pinnedEntityIds?: string[];
    } = {},
  ): Promise<{ primaryEntityId?: string; sourceIds: string[] }> {
    const apiKey = context.effectiveApiKey || "";

    // 1. Resolve the query, pick the primary entity and gather its lore
    const {
      primaryEntityId,
      sourceIds,
      focusTitle,
      content: aiContext,
      entries: loreEntries,
      noRelevantMatch,
    } = await this.retrieveForQuery(query, context, options.pinnedEntityIds);

    // 2. Trigger Generation
    const categoryList = this.getCategoryIds(context);

    // The model only sees the raw query, so name the record the follow-up is
    // about rather than leaving it to guess from similar names in the lore.
    const modelQuery = noRelevantMatch
      ? `${query}\n\n[VAULT RETRIEVAL STATUS] No matching Vault evidence was found for this question. Do not treat unrelated records, a list of available titles, or earlier conversation lore as evidence for this subject. If the user requests creative ideas, offer them clearly as proposals rather than established canon.`
      : focusTitle
        ? `${query}\n\n[CONVERSATION FOCUS] Pronouns here most likely refer to "${focusTitle}", the subject of the previous answer, unless the user says otherwise.`
        : query;

    await context.textGeneration.generateResponse(
      apiKey,
      modelQuery,
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
        // Keep normal Oracle context namespaced away from Adventure sessions
        // and any future Oracle surfaces that use the same worker.
        conversationId: oracleConversationId(context.vaultId),
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
    const apiKey = context.effectiveApiKey || "";

    const {
      primaryEntityId,
      sourceIds,
      content: aiContext,
    } = await this.retrieveForQuery(query, context);

    const categoryList = this.getCategoryIds(context);

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

    // Stage 1: the model resolves vault canon into physical description, and
    // reads the standing that canon implies. It is the only stage that sees the
    // lore, so it is the only one that can tell a god from a well-armed
    // soldier.
    const distilled = await context.imageGeneration.distillVisualSubject(
      apiKey,
      this.buildEntitySubjectSeed(entity, entity.labels),
      aiContext,
      context.modelName,
      context.isDemoMode,
    );

    const artDirection = options.ignoreSavedArtDirection
      ? { inherited: false }
      : this.resolveArtDirection(entity, context.vault?.entities);

    // Stage 2: deterministic composition around that subject.
    const composed = composeImagePrompt({
      subject: distilled.subject,
      category: entity.categoryId || entity.type,
      theme: context?.uiStore?.activeThemeId,
      // Labels already steer the distiller; a label like "deity" now also
      // steers the layers the subject text cannot reach. The model's reading of
      // the canon fills in only where neither says anything.
      stature: options.stature,
      statureLabels: entity.labels,
      // The stature recorded on the last image wins over a fresh reading: a
      // model that classifies an entity divine today and mythic next week
      // produces a gallery that does not match itself, which is worse than
      // being wrong once. A label or an explicit choice still overrides it.
      inferredStature: entity.imageArtDirection?.statureId || distilled.stature,
      cameraVariant: options.cameraVariant,
      styleReferenceMode: options.styleReferenceMode,
      styleOverride: artDirection.text,
      styleOverrideSource: artDirection.inherited ? "inherited" : undefined,
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

    const distilled = await context.imageGeneration.distillVisualSubject(
      apiKey,
      command.subject,
      aiContext,
      context.modelName,
      context.isDemoMode,
    );

    const composed = composeImagePrompt({
      subject: distilled.subject,
      category: command.categoryId,
      theme: context.uiStore?.activeThemeId,
      // A free-text draw command has no entity and therefore no labels; the
      // model's reading of the retrieved canon is the only implicit signal.
      stature: options.stature,
      inferredStature: distilled.stature,
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
    input: VisualizationPromptInput,
    context: OracleExecutionContext,
  ): Promise<Blob> {
    // A bare string is the last-resort form and carries nothing with it. The
    // review dialog used to send one, which silently dropped every negative
    // term and the composed framing on the path most images actually take.
    const reviewed = typeof input === "string" ? { prompt: input } : input;
    const composed = {
      prompt: reviewed.prompt,
      negativeTerms: reviewed.negativeTerms || [],
    };
    const aspectRatio =
      "metadata" in reviewed
        ? reviewed.metadata?.aspectRatio
        : reviewed.aspectRatio;

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

  private getCategoryIds(context: OracleExecutionContext): string[] {
    return Array.from(
      new Set(
        (context.categories || [])
          .map((c: any) => String(c?.id || "").trim())
          .filter(Boolean),
      ),
    );
  }

  /** The entity behind a focus id, if it exists and this viewer may see it. */
  private getVisibleEntity(context: OracleExecutionContext, entityId?: string) {
    const entity = entityId ? context.vault.entities?.[entityId] : undefined;
    if (!entity) return undefined;
    if (
      context.vault.isGuest &&
      !isEntityVisible(entity, {
        sharedMode: true,
        defaultVisibility: context.vault.defaultVisibility,
      })
    ) {
      return undefined;
    }
    return entity;
  }
}
