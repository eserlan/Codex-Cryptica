import { aiClientManager } from "./client-manager";
import { TIER_MODES, type TextGenerationService } from "schema";
import { buildQueryExpansionPrompt } from "./prompts/query-expansion";
import { buildSystemInstruction } from "./prompts/system-instructions";
import { buildMergeProposalPrompt } from "./prompts/merge-proposal";
import { buildPlotAnalysisPrompt } from "./prompts/plot-analysis";
import { EXPAND_KEYWORDS } from "../../config/oracle-constants";
import { contextRetrievalService } from "./context-retrieval.service";
import { isAIEnabled, assertAIEnabled } from "./capability-guard";

class DefaultTextGenerationService implements TextGenerationService {
  async expandQuery(
    apiKey: string,
    query: string,
    history: any[],
  ): Promise<string> {
    if (!isAIEnabled()) return query;
    try {
      const liteModel = aiClientManager.getModel(apiKey, TIER_MODES.lite);

      const conversationContext = history
        .slice(-4)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

      const prompt = buildQueryExpansionPrompt(conversationContext, query);

      const result = await liteModel.generateContent(prompt);
      const expanded = result.response.text().trim();
      console.log(`[TextGenerationService] Expanded query: "${query}" -> "${expanded}"`);
      return expanded;
    } catch (err) {
      console.error("[TextGenerationService] Query expansion failed, using original:", err);
      return query;
    }
  }

  async generateMergeProposal(
    apiKey: string,
    modelName: string,
    target: any,
    sources: any[],
  ): Promise<{ body: string; lore?: string }> {
    assertAIEnabled();
    const model = aiClientManager.getModel(apiKey, modelName);

    const targetContext = `--- TARGET: ${target.title} (${target.type}) ---\n${contextRetrievalService.getConsolidatedContext(target)}`;
    const sourceContext = sources
      .map(
        (s, i) =>
          `--- SOURCE ${i + 1}: ${s.title} (${s.type}) ---\n${contextRetrievalService.getConsolidatedContext(s)}`,
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
  ): Promise<string> {
    assertAIEnabled();
    const model = aiClientManager.getModel(apiKey, modelName);

    const MAX_SUBJECT_CONTEXT_CHARS = 2000;
    const MAX_CONNECTED_ENTITIES = 20;
    const MAX_CONNECTION_CONTEXT_CHARS = 500;

    const subjectContextStr = `--- SUBJECT: ${subject.title} (${subject.type}) ---\n${contextRetrievalService.getConsolidatedContext(subject).slice(0, MAX_SUBJECT_CONTEXT_CHARS)}`;

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
              return `--- CONNECTED (${dirStr} ${relStr}): ${entity.title} (${entity.type}) ---\n${contextRetrievalService.getConsolidatedContext(entity).slice(0, MAX_CONNECTION_CONTEXT_CHARS)}`;
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

    const prompt = buildPlotAnalysisPrompt(subjectContextStr, connectionsContext, userQuery);

    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      console.error("[TextGenerationService] Plot analysis failed:", err);
      throw new Error(`Plot analysis failed: ${err.message}`, { cause: err });
    }
  }

  private isExpandRequest(query: string): boolean {
    const q = query.toLowerCase().trim();
    return EXPAND_KEYWORDS.some((keyword) => q.includes(keyword));
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
    const model = aiClientManager.getModel(apiKey, modelName, systemInstruction);

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

    const chat = model.startChat({
      history: sanitizedHistory,
    });

    try {
      const isExpand = this.isExpandRequest(query);
      const instruction = isExpand
        ? "[INSTRUCTION: PROVIDE DETAILED LORE]"
        : "[INSTRUCTION: BE CONCISE. SHORT IS PREFERRED, MEDIUM IS ALLOWED IF NEEDED]";

      const finalQuery = context
        ? `[NEW LORE CONTEXT]\n${context}\n\n${prefixContext}${instruction}\n[USER QUERY]\n${query}`
        : `${prefixContext}${instruction}\n${query}`;

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