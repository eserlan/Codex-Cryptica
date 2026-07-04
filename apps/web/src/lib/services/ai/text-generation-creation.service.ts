import { aiClientManager as defaultAiClientManager } from "./client-manager";
import type { ConnectedEntityPromptContext } from "schema";
import { buildMergeProposalPrompt } from "./prompts/merge-proposal";
import {
  buildPlotCanonResolutionPrompt,
  buildPlotGenerationPrompt,
} from "./prompts/plot-analysis";
import {
  buildCreationLoreSynthesisPrompt,
  buildStructuredDraftingPrompt,
} from "./prompts/entity-creation";
import { buildRelatedEntityGenerationPrompt } from "./prompts/related-entity-generation";
import { isAIEnabled } from "./capability-guard";
import {
  safeSnapshot,
  getConsolidatedContext,
} from "./text-generation-context";

/** Generates new entity content: merge proposals, plot hooks, structured drafts, and related entities. */
export class TextGenerationCreationService {
  constructor(private aiClientManager = defaultAiClientManager) {}

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

    const targetContext = `--- TARGET: ${cleanTarget.title} (${cleanTarget.type}) ---\n${getConsolidatedContext(cleanTarget, { isGuest: options?.isGuest })}`;
    const sourceContext = cleanSources
      .map(
        (s, i) =>
          `--- SOURCE ${i + 1}: ${s.title} (${s.type}) ---\n${getConsolidatedContext(s, { isGuest: options?.isGuest })}`,
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

    const subjectContextStr = `--- SUBJECT: ${cleanSubject.title} (${cleanSubject.type}) ---\n${getConsolidatedContext(cleanSubject, { isGuest: options?.isGuest }).slice(0, MAX_SUBJECT_CONTEXT_CHARS)}`;

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
              return `--- CONNECTED (${dirStr} ${relStr}): ${entity.title} (${entity.type}) ---\n${getConsolidatedContext(entity, { isGuest: options?.isGuest }).slice(0, MAX_CONNECTION_CONTEXT_CHARS)}`;
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
}
