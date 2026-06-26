import {
  aiClientManager as defaultAiClientManager,
  InteractionExpiredError,
} from "./client-manager";
import { interactionSessions } from "./interaction-session";
import {
  buildInteractionInput,
  buildRevisionInteractionInput,
  relatedToLoreEntries,
  type LoreEntry,
} from "@codex/oracle-engine";
import { classifyApiError } from "./api-error-classifier";
import { u } from "./prompts/user-content";
import {
  TIER_MODES,
  type RelatedEntityContext,
  type TextGenerationService,
  type ChatHistoryMessage,
  type ConnectedEntityPromptContext,
} from "schema";
import { buildQueryExpansionPrompt } from "./prompts/query-expansion";
import { buildSystemInstruction } from "./prompts/system-instructions";
import { buildMergeProposalPrompt } from "./prompts/merge-proposal";
import {
  buildPlotCanonResolutionPrompt,
  buildPlotGenerationPrompt,
} from "./prompts/plot-analysis";
import { buildContextDistillationPrompt } from "./prompts/context-distillation";
import {
  buildEntityRevisionSystemInstruction,
  buildEntityRevisionPromptCore,
  buildEntityRevisionUserPrompt,
} from "./prompts/entity-revision";
import { resolveTemplateSync } from "../EntityTemplateConstants";
import {
  buildCreationLoreSynthesisPrompt,
  buildStructuredDraftingPrompt,
} from "./prompts/entity-creation";
import { buildRelatedEntityGenerationPrompt } from "./prompts/related-entity-generation";
import {
  buildPlotEntitiesExtractionPrompt,
  type PlotEntityStub,
} from "./prompts/plot-entities";
import { isAIEnabled } from "./capability-guard";
import { resolvePronounsLocally } from "./resolve-pronouns";

function safeSnapshot<T>(obj: T): T {
  if (obj == null) return obj;
  try {
    return structuredClone(obj);
  } catch {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  }
}

export class DefaultTextGenerationService implements TextGenerationService {
  constructor(private aiClientManager = defaultAiClientManager) {}

  private getConsolidatedContext(
    entity: any,
    options?: {
      isGuest?: boolean;
      source?: string;
      instructions?: string;
      priority?: "instructions-first" | "incoming-first" | "preserve-existing";
    },
  ): string {
    const parts = [];
    if (!options?.isGuest && entity.lore?.trim())
      parts.push(entity.lore.trim());
    if (entity.content?.trim()) parts.push(entity.content.trim());
    return parts.join("\n\n");
  }

  async expandQuery(
    apiKey: string,
    query: string,
    history: ChatHistoryMessage[],
  ): Promise<string> {
    const cleanHistory = history ? safeSnapshot(history) : history;

    // Define pronouns to check for resolution
    const PRONOUN_REGEX =
      /\b(he|she|it|they|him|her|them|his|its|their|theirs|that place|this place|that person|this person|the entity)\b/i;
    const hasPronouns = PRONOUN_REGEX.test(query);

    // If there are no pronouns to resolve at all, it's already a standalone search query!
    if (!hasPronouns) {
      console.log(
        `[TextGenerationService] No pronouns detected in query: "${query}". Returning as-is.`,
      );
      return query;
    }

    // Try offline resolution first with Compromise.js
    let locallyResolved = query;
    try {
      locallyResolved = await resolvePronounsLocally(query, cleanHistory);
    } catch (e) {
      console.error(
        "[TextGenerationService] Local pronoun resolution failed, falling back to AI:",
        e,
      );
    }

    // A local resolution is considered "good" if the query was successfully modified
    // and no unresolved pronouns remain in the resolved output.
    const isLocalResolutionGood =
      locallyResolved !== query && !PRONOUN_REGEX.test(locallyResolved);

    if (isLocalResolutionGood) {
      console.log(
        `[TextGenerationService] Primary local compromise resolver successfully expanded query: "${query}" -> "${locallyResolved}"`,
      );
      return locallyResolved;
    }

    // If local resolution was not successful, fall back to AI-powered query expansion
    if (!isAIEnabled()) {
      return locallyResolved;
    }

    try {
      console.log(
        `[TextGenerationService] Local resolver insufficient for query "${query}". Falling back to AI query expansion.`,
      );
      const basicModel = await this.aiClientManager.getModel(
        apiKey,
        TIER_MODES.lite,
      );

      const conversationContext = cleanHistory
        .slice(-4)
        .map((m) => {
          const role = m.role.toUpperCase();
          const content =
            m.content.length > 2000
              ? m.content.slice(0, 2000) + "... [truncated for length]"
              : m.content;
          return `${role}: ${content}`;
        })
        .join("\n");

      const prompt = buildQueryExpansionPrompt(conversationContext, query);

      const result = await basicModel.generateContent(prompt);
      const expanded = result.response.text().trim();
      console.log(
        `[TextGenerationService] AI Expanded query: "${query}" -> "${expanded}"`,
      );
      return expanded;
    } catch (err) {
      console.error(
        "[TextGenerationService] Fallback AI Query expansion failed, returning local resolution:",
        err,
      );
      return locallyResolved;
    }
  }

  async distillContext(
    apiKey: string,
    context: string,
    modelName: string,
  ): Promise<string> {
    if (!isAIEnabled()) return context;
    if (!context.trim()) return context;

    const model = await this.aiClientManager.getModel(apiKey, modelName);
    const prompt = buildContextDistillationPrompt(context);

    try {
      const result = await model.generateContent(prompt);
      const distilled = result.response.text().trim();
      return distilled || context;
    } catch (err) {
      console.warn(
        "[TextGenerationService] Context distillation failed, using raw context.",
        err,
      );
      return context;
    }
  }

  async generateMergeProposal(
    apiKey: string,
    modelName: string,
    target: any,
    sources: any[],
    options?: { isGuest?: boolean },
  ): Promise<{ body: string; lore?: string }> {
    const cleanTarget = target ? safeSnapshot(target) : target;
    const cleanSources = sources ? safeSnapshot(sources) : sources;

    const model = await this.aiClientManager.getModel(apiKey, modelName);

    const targetContext = `--- TARGET: ${cleanTarget.title} (${cleanTarget.type}) ---\n${this.getConsolidatedContext(cleanTarget, { isGuest: options?.isGuest })}`;
    const sourceContext = cleanSources
      .map(
        (s, i) =>
          `--- SOURCE ${i + 1}: ${s.title} (${s.type}) ---\n${this.getConsolidatedContext(s, { isGuest: options?.isGuest })}`,
      )
      .join("\n\n");

    const prompt = buildMergeProposalPrompt(targetContext, sourceContext);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        return { body: text };
      }
    } catch (err: any) {
      console.error("[TextGenerationService] Merge generation failed:", err);
      throw new Error(`Merge failed: ${err.message}`, { cause: err });
    }
  }

  async reviseEntityUpdate(
    apiKey: string,
    modelName: string,
    entity: any,
    incoming: {
      chronicle: string;
      lore: string;
    },
    relatedEntities: RelatedEntityContext[] = [],
    categories: { id: string; label?: string; description?: string }[] = [],
    options?: {
      isGuest?: boolean;
      source?: string;
      instructions?: string;
      priority?: "instructions-first" | "incoming-first" | "preserve-existing";
      themeId?: string;
      interactionsEnabled?: boolean;
    },
  ): Promise<{
    content: string;
    lore: string;
    categoryId?: string;
  }> {
    console.log("[ReconPipeline] Starting revision step...");
    console.log("[ReconPipeline] Existing Entity State:", {
      id: entity?.id,
      title: entity?.title,
      type: entity?.type,
      contentLength: entity?.content?.length ?? 0,
      loreLength: entity?.lore?.length ?? 0,
    });
    console.log("[ReconPipeline] Incoming Update:", {
      chronicleLength: incoming?.chronicle?.length ?? 0,
      loreLength: incoming?.lore?.length ?? 0,
      hasInstructions: Boolean(options?.instructions?.trim()),
      source: options?.source,
    });

    const cleanEntity = entity ? safeSnapshot(entity) : entity;
    const cleanIncoming = incoming ? safeSnapshot(incoming) : incoming;
    const cleanRelatedEntities = relatedEntities
      ? safeSnapshot(relatedEntities)
      : relatedEntities;
    const cleanCategories = categories ? safeSnapshot(categories) : categories;

    const systemInstruction = buildEntityRevisionSystemInstruction();
    const model = await this.aiClientManager.getModel(
      apiKey,
      modelName,
      systemInstruction,
    );

    const allowedCategoryIds = new Set(
      cleanCategories.map((category) => category.id),
    );

    // Enforce guest data restriction: exclude existing lore if in guest mode
    const sanitizedEntity = options?.isGuest
      ? { ...cleanEntity, lore: "" }
      : cleanEntity;

    const loreTemplate = sanitizedEntity?.type
      ? resolveTemplateSync(sanitizedEntity.type, options?.themeId) || undefined
      : undefined;
    const promptCore = buildEntityRevisionPromptCore(
      sanitizedEntity,
      cleanIncoming,
      cleanCategories,
      {
        source: options?.source,
        instructions: options?.instructions,
        priority: options?.priority,
        loreTemplate,
      },
    );
    const userPrompt = buildEntityRevisionUserPrompt(
      sanitizedEntity,
      cleanIncoming,
      cleanRelatedEntities,
      cleanCategories,
      {
        source: options?.source,
        instructions: options?.instructions,
        priority: options?.priority,
        loreTemplate,
      },
    );

    console.log(
      "[ReconPipeline] Constructed LLM prompt of length:",
      systemInstruction.length + userPrompt.length,
    );

    try {
      const interactionsEnabled =
        Boolean(options?.interactionsEnabled) && !apiKey && Boolean(entity?.id);
      const text = interactionsEnabled
        ? await this.reviseViaInteraction(
            modelName,
            systemInstruction,
            entity.id,
            promptCore,
            cleanRelatedEntities,
          )
        : await model
            .generateContent(userPrompt)
            .then((r) => r.response.text());
      if (import.meta.env.DEV) {
        console.log("[ReconPipeline] Raw LLM response metadata:", {
          textLength: text.length,
        });
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Missing JSON payload");
      }

      const parsed = JSON.parse(jsonMatch[0]) as Partial<{
        content: string;
        lore: string;
        categoryId: string;
      }>;
      if (import.meta.env.DEV) {
        console.log("[ReconPipeline] Parsed JSON metadata:", {
          contentLength: parsed.content?.length ?? 0,
          loreLength: parsed.lore?.length ?? 0,
          hasCategoryId: Boolean(parsed.categoryId?.toString().trim()),
        });
      }

      const categoryId = String(parsed.categoryId || "").trim();

      const revised: {
        content: string;
        lore: string;
        categoryId?: string;
      } = {
        content:
          parsed.content?.trim() ||
          cleanIncoming.chronicle ||
          cleanEntity.content ||
          "",
        lore:
          parsed.lore?.trim() || cleanIncoming.lore || cleanEntity.lore || "",
      };
      if (allowedCategoryIds.has(categoryId)) {
        revised.categoryId = categoryId;
      }

      console.log("[ReconPipeline] Revision complete. Final Output:", {
        contentLength: revised.content.length,
        loreLength: revised.lore.length,
        categoryId: revised.categoryId,
      });

      return revised;
    } catch (err: any) {
      console.error("[ReconPipeline] Revision pipeline failed:", err);
      throw new Error(`Entity revision failed: ${err.message}`, {
        cause: err,
      });
    }
  }

  private async reviseViaInteraction(
    modelName: string,
    systemInstruction: string,
    entityId: string,
    promptCore: string,
    relatedEntities: RelatedEntityContext[],
  ): Promise<string> {
    const session = interactionSessions.getSession(entityId);
    const loreEntries = relatedToLoreEntries(relatedEntities);

    const send = async (input: string, previousId: string | null) =>
      this.aiClientManager.sendInteraction({
        model: modelName,
        input,
        systemInstruction,
        previousInteractionId: previousId,
      });

    try {
      let partition = session.tracker.partition(loreEntries);
      let result;

      try {
        result = await send(
          buildRevisionInteractionInput(promptCore, partition),
          session.previousInteractionId,
        );
      } catch (err) {
        if (!(err instanceof InteractionExpiredError)) throw err;
        interactionSessions.resetSession(entityId);
        partition = session.tracker.partition(loreEntries);
        result = await send(
          buildRevisionInteractionInput(promptCore, partition),
          null,
        );
      }

      session.previousInteractionId = result.id;
      session.tracker.commit(loreEntries);

      if (import.meta.env.DEV) {
        const total = loreEntries.length;
        const sent = total - partition.unchanged.length;
        console.log(
          `[Interactions] revision related sent ${sent}/${total} (${partition.unchanged.length} retained)`,
        );
      }

      return result.text;
    } catch (err: unknown) {
      console.error("Gemini Interactions Error:", err);
      const classified = classifyApiError(err);
      throw new Error(classified.message, { cause: err });
    }
  }

  async generatePlotAnalysis(
    apiKey: string,
    modelName: string,
    subject: any,
    connectedEntities: any[],
    userQuery: string,
    options?: { isGuest?: boolean },
  ): Promise<string> {
    const cleanSubject = subject ? safeSnapshot(subject) : subject;
    const cleanConnectedEntities = connectedEntities
      ? safeSnapshot(connectedEntities)
      : connectedEntities;

    const model = await this.aiClientManager.getModel(apiKey, modelName);

    const MAX_SUBJECT_CONTEXT_CHARS = 2000;
    const MAX_CONNECTED_ENTITIES = 20;
    const MAX_CONNECTION_CONTEXT_CHARS = 500;

    const subjectContextStr = `--- SUBJECT: ${cleanSubject.title} (${cleanSubject.type}) ---\n${this.getConsolidatedContext(cleanSubject, { isGuest: options?.isGuest }).slice(0, MAX_SUBJECT_CONTEXT_CHARS)}`;

    const limitedConnections = cleanConnectedEntities.slice(
      0,
      MAX_CONNECTED_ENTITIES,
    );
    const omittedCount =
      cleanConnectedEntities.length - limitedConnections.length;

    let connectionsContext =
      limitedConnections.length > 0
        ? limitedConnections
            .map(({ entity, connectionType, label, direction }) => {
              const dirStr = direction === "outbound" ? "→" : "←";
              const relStr = label || connectionType;
              return `--- CONNECTED (${dirStr} ${relStr}): ${entity.title} (${entity.type}) ---\n${this.getConsolidatedContext(entity, { isGuest: options?.isGuest }).slice(0, MAX_CONNECTION_CONTEXT_CHARS)}`;
            })
            .join("\n\n")
        : "No connected entities found.";

    if (omittedCount > 0) {
      const suffix = `\n\n[${omittedCount} additional connected ${
        omittedCount === 1 ? "entity" : "entities"
      } omitted for brevity.]`;
      connectionsContext =
        connectionsContext === "No connected entities found."
          ? suffix.trimStart()
          : connectionsContext + suffix;
    }

    try {
      console.log("[TextGenerationService] Stage 1: Resolving plot canon...");

      // Stage 1: Interpretation Layer - Resolve Plot Canon
      const resolutionPrompt = buildPlotCanonResolutionPrompt(
        subjectContextStr,
        connectionsContext,
        userQuery,
      );
      const resolutionResult = await model.generateContent(resolutionPrompt);
      const canonSummary = resolutionResult.response.text().trim();

      console.log("[TextGenerationService] Stage 2: Generating plot hooks...");

      // Stage 2: Generation Layer - Plot Generation
      const generationPrompt = buildPlotGenerationPrompt(
        canonSummary,
        userQuery,
      );

      const result = await model.generateContent(generationPrompt);
      return result.response.text();
    } catch (err: any) {
      console.error("[TextGenerationService] Plot generation failed:", err);
      throw new Error(`Plot analysis failed: ${err.message}`, { cause: err });
    }
  }

  async generateStructuredEntity(
    apiKey: string,
    query: string,
    context: string,
    modelName: string,
    onUpdate: (partial: string) => void,
    categories?: string[],
  ): Promise<void> {
    if (!isAIEnabled()) return;

    const model = await this.aiClientManager.getModel(apiKey, modelName);

    console.log(
      "[TextGenerationService] Stage 1: Resolving canonical synthesis...",
    );

    // Stage 1: Interpretation Layer - Resolve Canonical Synthesis
    const synthesisPrompt = buildCreationLoreSynthesisPrompt(query, context);
    const synthesisResult = await model.generateContent(synthesisPrompt);
    const synthesisSummary = synthesisResult.response.text().trim();

    console.log(
      "[TextGenerationService] Stage 2: Drafting structured record...",
    );

    // Stage 2: Generation Layer - Structured Record Drafting
    const draftingPrompt = buildStructuredDraftingPrompt(
      synthesisSummary,
      query,
      categories,
    );

    try {
      const result = await model.generateContent(draftingPrompt);
      const text = result.response.text();
      await onUpdate(text);
    } catch (err: any) {
      console.error("[TextGenerationService] Structured drafting failed:", err);
      throw new Error(`Drafting failed: ${err.message}`, { cause: err });
    }
  }

  async generateResponse(
    apiKey: string,
    query: string,
    history: any[],
    context: string,
    modelName: string,
    onUpdate: (partial: string) => void | Promise<void>,
    demoMode = false,
    categories?: string[],
    _options?: {
      requestId?: string;
      vaultId?: string;
      existingEntities?: any[];
      systemInstructionOverride?: string;
      loreEntries?: LoreEntry[];
      conversationId?: string;
      interactionsEnabled?: boolean;
    },
  ): Promise<void> {
    const cleanHistory = history ? safeSnapshot(history) : history;

    const systemInstruction =
      _options?.systemInstructionOverride ||
      buildSystemInstruction(demoMode, categories);

    // Interactions API path (proxy only, flag-gated): send just the new/changed
    // lore and the new turn; prior turns + unchanged lore are retained
    // server-side via `previous_interaction_id`.
    if (
      _options?.interactionsEnabled &&
      !apiKey &&
      _options?.conversationId &&
      _options?.loreEntries
    ) {
      await this.generateViaInteraction(
        query,
        cleanHistory,
        modelName,
        systemInstruction,
        _options.conversationId,
        _options.loreEntries,
        onUpdate,
      );
      return;
    }

    const model = await this.aiClientManager.getModel(
      apiKey,
      modelName,
      systemInstruction,
    );

    const slidingWindowSize = 10;
    // 1. Sliding Window: Limit history to keep payload lean
    const slidingHistory = cleanHistory.slice(-slidingWindowSize);

    const sanitizedHistory: {
      role: "user" | "model";
      parts: { text: string }[];
    }[] = [];

    for (const m of slidingHistory) {
      if (m.role !== "user" && m.role !== "assistant") continue;

      const role = m.role === "assistant" ? "model" : "user";
      const rawContent = m.content?.trim() || "(empty message)";
      const content =
        rawContent.length > 4000
          ? rawContent.slice(0, 4000) + "\n\n... [truncated for length]"
          : rawContent;

      if (sanitizedHistory.length === 0) {
        if (role === "user") {
          sanitizedHistory.push({ role, parts: [{ text: content }] });
        }
      } else {
        const last = sanitizedHistory[sanitizedHistory.length - 1];
        if (last.role === role) {
          last.parts[0].text += "\n\n" + content;
        } else {
          sanitizedHistory.push({ role, parts: [{ text: content }] });
        }
      }
    }

    let prefixContext = "";
    if (
      sanitizedHistory.length > 0 &&
      sanitizedHistory[sanitizedHistory.length - 1].role === "user"
    ) {
      const lastUser = sanitizedHistory.pop();
      prefixContext = `[PREVIOUS UNANSWERED QUERY]:\n${lastUser!.parts[0].text}\n\n`;
    }

    const chat = (model as any).startChat
      ? model.startChat({
          history: sanitizedHistory,
        })
      : {
          sendMessageStream: async (q: string) => {
            console.error(
              "[TextGenerationService] model.startChat missing! Falling back to generateContent",
              model,
            );
            const res = await model.generateContent(q);
            return {
              stream: (async function* () {
                yield { text: () => res.response.text() };
              })(),
            };
          },
        };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("You appear to be offline. Generation is unavailable.");
    }

    try {
      // 2. Prefix Stability: Always place dynamic Lore Context AFTER history
      // but BEFORE the current query. This keeps the history prefix stable
      // for Gemini's implicit caching.
      const finalQuery = context
        ? `[VAULT LORE CONTEXT]\n${u(context.trim())}\n\n${prefixContext}[USER QUERY]\n${u(query)}`
        : `${prefixContext}${u(query)}`;

      const result = await chat.sendMessageStream(finalQuery);
      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        await onUpdate(fullText);
      }
    } catch (err: unknown) {
      console.error("Gemini API Error:", err);
      const classified = classifyApiError(err);
      throw new Error(classified.message, { cause: err });
    }
  }

  /**
   * Drive one chat turn through the Gemini Interactions API. Sends only the
   * new/changed lore plus the user query, threading server-side conversation
   * state. On an expired interaction id, resets and replays full history + lore
   * once (see ADR 018, plan Phase 3.4).
   */
  private async generateViaInteraction(
    query: string,
    history: any[],
    modelName: string,
    systemInstruction: string,
    conversationId: string,
    loreEntries: LoreEntry[],
    onUpdate: (partial: string) => void | Promise<void>,
  ): Promise<void> {
    const session = interactionSessions.getSession(conversationId);

    const send = async (input: string, previousId: string | null) => {
      const result = await this.aiClientManager.sendInteraction({
        model: modelName,
        input,
        systemInstruction,
        previousInteractionId: previousId,
      });
      return result;
    };

    try {
      let partition = session.tracker.partition(loreEntries);
      const input = buildInteractionInput(query, partition);

      let result;
      try {
        result = await send(input, session.previousInteractionId);
      } catch (err) {
        if (!(err instanceof InteractionExpiredError)) throw err;
        // Retention window elapsed: drop server state and replay full history +
        // full lore in a single fresh interaction, then resume delta mode.
        interactionSessions.resetSession(conversationId);
        // After reset the tracker is empty, so partition.newOrChanged holds
        // every entry. buildInteractionInput will include the full lore context;
        // prepend the conversation transcript so the model can re-establish context.
        partition = session.tracker.partition(loreEntries);
        const replayInput =
          this.formatHistoryTranscript(history) +
          buildInteractionInput(query, partition);
        result = await send(replayInput, null);
      }

      session.previousInteractionId = result.id;
      session.tracker.commit(loreEntries);
      await onUpdate(result.text);

      // Rollout metric (plan 6.2): how much lore the delta flow kept off the
      // wire. Uses the partition actually sent (post-replay if it occurred).
      if (import.meta.env.DEV) {
        const total = loreEntries.length;
        const sent = total - partition.unchanged.length;
        console.log(
          `[Interactions] lore records sent ${sent}/${total} (${partition.unchanged.length} retained server-side)`,
        );
      }
    } catch (err: unknown) {
      console.error("Gemini Interactions Error:", err);
      const classified = classifyApiError(err);
      throw new Error(classified.message, { cause: err });
    }
  }

  /** Render prior chat turns as a plain-text transcript for replay. */
  private formatHistoryTranscript(history: any[]): string {
    if (!history?.length) return "";
    const lines = history
      .filter((m) => m?.role === "user" || m?.role === "assistant")
      .map((m) => {
        const who = m.role === "assistant" ? "Oracle" : "User";
        const content = (m.content || "").trim();
        return content ? `${who}: ${content}` : "";
      })
      .filter(Boolean);
    if (lines.length === 0) return "";
    return `[CONVERSATION SO FAR]\n${lines.join("\n")}\n\n`;
  }

  async generateRelatedEntity(
    apiKey: string,
    modelName: string,
    sourceEntity: {
      title: string;
      type: string;
      content?: string;
      lore?: string;
    },
    targetType: string,
    relationship: string,
    customInstructions = "",
    connectedEntities: ConnectedEntityPromptContext[] = [],
    categories: { id: string; label?: string }[] = [],
    templateOutline = "",
    options?: { isGuest?: boolean; aiDisabled?: boolean },
  ): Promise<{
    name: string;
    type: string;
    summary: string;
    description: string;
    labels?: string[];
    plotHook?: string;
    relationshipBack?: string;
  }> {
    if (options?.aiDisabled ?? !isAIEnabled()) {
      throw new Error("AI features are currently disabled.");
    }

    const cleanSource = sourceEntity
      ? safeSnapshot(sourceEntity)
      : sourceEntity;
    const cleanConnected = connectedEntities
      ? safeSnapshot(connectedEntities)
      : [];
    const cleanCategories = categories ? safeSnapshot(categories) : [];

    // Enforce guest data restriction: exclude lore if in guest mode
    const sanitizedSource = options?.isGuest
      ? { ...cleanSource, lore: "" }
      : cleanSource;

    const prompt = buildRelatedEntityGenerationPrompt(
      sanitizedSource,
      targetType,
      relationship,
      customInstructions,
      cleanConnected,
      cleanCategories,
      templateOutline,
    );

    const model = await this.aiClientManager.getModel(apiKey, modelName);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Missing JSON payload from AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const name =
        String(parsed.name || "").trim() || `New Related ${targetType}`;
      const resolvedType = String(parsed.type || targetType).trim();
      const summary = String(parsed.summary || "").trim();
      const description = String(parsed.description || "").trim();

      const labels: string[] = [];
      if (Array.isArray(parsed.labels)) {
        for (const l of parsed.labels) {
          const trimmed = String(l).trim();
          if (trimmed) {
            labels.push(trimmed);
          }
        }
      }

      const plotHook = parsed.plotHook
        ? String(parsed.plotHook).trim()
        : undefined;
      const relationshipBack = parsed.relationshipBack
        ? String(parsed.relationshipBack).trim()
        : relationship;

      return {
        name,
        type: resolvedType,
        summary,
        description,
        labels,
        plotHook,
        relationshipBack,
      };
    } catch (err: any) {
      console.error(
        "[TextGenerationService] Related entity generation failed:",
        err,
      );
      throw new Error(`Related entity generation failed: ${err.message}`, {
        cause: err,
      });
    }
  }
  async generateEntitiesFromPlot(
    apiKey: string,
    modelName: string,
    plotHookText: string,
    sourceEntityTitle: string,
    availableCategories: string[],
  ): Promise<PlotEntityStub[]> {
    const model = await this.aiClientManager.getModel(apiKey, modelName);
    const prompt = buildPlotEntitiesExtractionPrompt(
      plotHookText,
      sourceEntityTitle,
      availableCategories,
    );
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    // Strip any accidental markdown fences
    const json = raw
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) throw new Error("Expected array");
      return parsed.filter(
        (e: any) => typeof e.title === "string" && typeof e.type === "string",
      );
    } catch {
      throw new Error("Failed to parse entity stubs from plot response");
    }
  }
}

export const textGenerationService = new DefaultTextGenerationService();
