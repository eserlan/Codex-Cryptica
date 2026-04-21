import { aiClientManager as defaultAiClientManager } from "./client-manager";
import {
  TIER_MODES,
  type RelatedEntityContext,
  type TextGenerationService,
} from "schema";
import { buildQueryExpansionPrompt } from "./prompts/query-expansion";
import { buildSystemInstruction } from "./prompts/system-instructions";
import { buildMergeProposalPrompt } from "./prompts/merge-proposal";
import { buildPlotAnalysisPrompt } from "./prompts/plot-analysis";
import { buildContextDistillationPrompt } from "./prompts/context-distillation";
import { buildEntityReconciliationPrompt } from "./prompts/entity-reconciliation";
import { contextRetrievalService as defaultContextRetrievalService } from "./context-retrieval.service";
import { isAIEnabled, assertAIEnabled } from "./capability-guard";

export class DefaultTextGenerationService implements TextGenerationService {
  constructor(
    private aiClientManager = defaultAiClientManager,
    private contextRetrievalService = defaultContextRetrievalService,
  ) {}

  async expandQuery(
    apiKey: string,
    query: string,
    history: any[],
  ): Promise<string> {
    if (!isAIEnabled()) return query;
    try {
      const basicModel = await this.aiClientManager.getModel(
        apiKey,
        TIER_MODES.lite,
      );

      const conversationContext = history
        .slice(-4)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
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
  ): Promise<{ body: string; lore?: string }> {
    assertAIEnabled();
    const model = await this.aiClientManager.getModel(apiKey, modelName);

    const targetContext = `--- TARGET: ${target.title} (${target.type}) ---\n${this.contextRetrievalService.getConsolidatedContext(target)}`;
    const sourceContext = sources
      .map(
        (s, i) =>
          `--- SOURCE ${i + 1}: ${s.title} (${s.type}) ---\n${this.contextRetrievalService.getConsolidatedContext(s)}`,
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
  ): Promise<{
    content: string;
    lore: string;
  }> {
    assertAIEnabled();
    const model = await this.aiClientManager.getModel(apiKey, modelName);
    const prompt = buildEntityReconciliationPrompt(
      entity,
      incoming,
      relatedEntities,
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
      }>;

      return {
        content:
          parsed.content?.trim() || incoming.chronicle || entity.content || "",
        lore: parsed.lore?.trim() || incoming.lore || entity.lore || "",
      };
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
  ): Promise<string> {
    assertAIEnabled();
    const model = await this.aiClientManager.getModel(apiKey, modelName);

    const MAX_SUBJECT_CONTEXT_CHARS = 2000;
    const MAX_CONNECTED_ENTITIES = 20;
    const MAX_CONNECTION_CONTEXT_CHARS = 500;

    const subjectContextStr = `--- SUBJECT: ${subject.title} (${subject.type}) ---\n${this.contextRetrievalService.getConsolidatedContext(subject).slice(0, MAX_SUBJECT_CONTEXT_CHARS)}`;

    const limitedConnections = connectedEntities.slice(
      0,
      MAX_CONNECTED_ENTITIES,
    );
    const omittedCount = connectedEntities.length - limitedConnections.length;

    let connectionsContext =
      limitedConnections.length > 0
        ? limitedConnections
            .map(({ entity, connectionType, label, direction }) => {
              const dirStr = direction === "outbound" ? "→" : "←";
              const relStr = label || connectionType;
              return `--- CONNECTED (${dirStr} ${relStr}): ${entity.title} (${entity.type}) ---\n${this.contextRetrievalService.getConsolidatedContext(entity).slice(0, MAX_CONNECTION_CONTEXT_CHARS)}`;
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

    const prompt = buildPlotAnalysisPrompt(
      subjectContextStr,
      connectionsContext,
      userQuery,
    );

    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      console.error("[TextGenerationService] Plot analysis failed:", err);
      throw new Error(`Plot analysis failed: ${err.message}`, { cause: err });
    }
  }

  async generateResponse(
    apiKey: string,
    query: string,
    history: any[],
    context: string,
    modelName: string,
    onUpdate: (partial: string) => void,
    demoMode = false,
  ): Promise<void> {
    assertAIEnabled();
    const systemInstruction = buildSystemInstruction(demoMode);
    const model = await this.aiClientManager.getModel(
      apiKey,
      modelName,
      systemInstruction,
    );

    const sanitizedHistory: {
      role: "user" | "model";
      parts: { text: string }[];
    }[] = [];

    for (const m of history) {
      if (m.role !== "user" && m.role !== "assistant") continue;

      const role = m.role === "assistant" ? "model" : "user";
      const content = m.content?.trim() || "(empty message)";

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
      const finalQuery = context
        ? `[NEW LORE CONTEXT]\n${context}\n\n${prefixContext}\n[USER QUERY]\n${query}`
        : `${prefixContext}\n${query}`;

      const result = await chat.sendMessageStream(finalQuery);

      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        onUpdate(fullText);
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
