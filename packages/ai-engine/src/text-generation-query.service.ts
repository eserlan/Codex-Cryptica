import { aiClientManager as defaultAiClientManager } from "./client-manager";
import type { ChatHistoryMessage } from "schema";
import { buildQueryExpansionPrompt } from "./prompts/query-expansion";
import { buildContextDistillationPrompt } from "./prompts/context-distillation";
import { isAIEnabled } from "./capability-guard";
import { resolvePronounsLocally } from "./resolve-pronouns";
import { safeSnapshot } from "./text-generation-context";
import { TIER_MODES } from "schema";

/** Query expansion (pronoun resolution) and context distillation. */
export class TextGenerationQueryService {
  constructor(private aiClientManager = defaultAiClientManager) {}

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
}
