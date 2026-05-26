import { aiClientManager as defaultAiClientManager } from "./client-manager";
import {
  TIER_MODES,
  type RelatedEntityContext,
  type TextGenerationService,
} from "schema";
import { buildQueryExpansionPrompt } from "./prompts/query-expansion";
import { buildSystemInstruction } from "./prompts/system-instructions";
import { buildMergeProposalPrompt } from "./prompts/merge-proposal";
import {
  buildPlotCanonResolutionPrompt,
  buildPlotGenerationPrompt,
} from "./prompts/plot-analysis";
import { buildContextDistillationPrompt } from "./prompts/context-distillation";
import { buildEntityReconciliationPrompt } from "./prompts/entity-reconciliation";
import {
  buildCreationLoreSynthesisPrompt,
  buildStructuredDraftingPrompt,
} from "./prompts/entity-creation";
import { isAIEnabled } from "./capability-guard";

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
    options?: { isGuest?: boolean },
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
    history: any[],
  ): Promise<string> {
    const cleanHistory = history ? safeSnapshot(history) : history;
    if (!isAIEnabled()) return query;
    try {
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
        `[TextGenerationService] Expanded query: "${query}" -> "${expanded}"`,
      );
      return expanded;
    } catch (err) {
      console.error(
        "[TextGenerationService] Query expansion failed, using original:",
        err,
      );
      return query;
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

  async reconcileEntityUpdate(
    apiKey: string,
    modelName: string,
    entity: any,
    incoming: {
      chronicle: string;
      lore: string;
    },
    relatedEntities: RelatedEntityContext[] = [],
    categories: { id: string; label?: string; description?: string }[] = [],
    options?: { isGuest?: boolean },
  ): Promise<{
    content: string;
    lore: string;
    categoryId?: string;
  }> {
    const cleanEntity = entity ? safeSnapshot(entity) : entity;
    const cleanIncoming = incoming ? safeSnapshot(incoming) : incoming;
    const cleanRelatedEntities = relatedEntities
      ? safeSnapshot(relatedEntities)
      : relatedEntities;
    const cleanCategories = categories ? safeSnapshot(categories) : categories;

    const model = await this.aiClientManager.getModel(apiKey, modelName);

    const allowedCategoryIds = new Set(
      cleanCategories.map((category) => category.id),
    );

    // Enforce guest data restriction: exclude existing lore if in guest mode
    const sanitizedEntity = options?.isGuest
      ? { ...cleanEntity, lore: "" }
      : cleanEntity;

    const prompt = buildEntityReconciliationPrompt(
      sanitizedEntity,
      cleanIncoming,
      cleanRelatedEntities,
      cleanCategories,
    );

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Missing JSON payload");
      }

      const parsed = JSON.parse(jsonMatch[0]) as Partial<{
        content: string;
        lore: string;
        categoryId: string;
      }>;
      const categoryId = String(parsed.categoryId || "").trim();

      const reconciled: {
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
        reconciled.categoryId = categoryId;
      }
      return reconciled;
    } catch (err: any) {
      console.error(
        "[TextGenerationService] Entity reconciliation failed:",
        err,
      );
      throw new Error(`Entity reconciliation failed: ${err.message}`, {
        cause: err,
      });
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
    },
  ): Promise<void> {
    const cleanHistory = history ? safeSnapshot(history) : history;

    const systemInstruction = buildSystemInstruction(demoMode, categories);
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

    try {
      // 2. Prefix Stability: Always place dynamic Lore Context AFTER history
      // but BEFORE the current query. This keeps the history prefix stable
      // for Gemini's implicit caching.
      const finalQuery = context
        ? `[VAULT LORE CONTEXT]\n${context.trim()}\n\n${prefixContext}[USER QUERY]\n${query}`
        : `${prefixContext}${query}`;

      const result = await chat.sendMessageStream(finalQuery);
      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        await onUpdate(fullText);
      }
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      if (err.message?.includes("429")) {
        throw new Error("API rate limit exceeded. Please wait a moment.", {
          cause: err,
        });
      }
      throw new Error(`Lore Oracle Error: ${err.message || "Unknown error"}`, {
        cause: err,
      });
    }
  }
}

export const textGenerationService = new DefaultTextGenerationService();
