import {
  aiClientManager as defaultAiClientManager,
  InteractionExpiredError,
} from "./client-manager";
import { interactionSessions } from "./interaction-session";
import {
  buildRevisionInteractionInput,
  relatedToLoreEntries,
} from "@codex/oracle-engine";
import { classifyApiError } from "./api-error-classifier";
import type { RelatedEntityContext } from "schema";
import {
  buildEntityRevisionSystemInstruction,
  buildEntityRevisionPromptCore,
  buildEntityRevisionUserPrompt,
} from "./prompts/entity-revision";
import { resolveTemplateSync } from "../EntityTemplateConstants";
import {
  safeSnapshot,
  extractJsonFromModelResponse,
} from "./text-generation-context";

/** Revises an existing entity's content/lore from an incoming chronicle update (the "recon pipeline"). */
export class TextGenerationRevisionService {
  constructor(private aiClientManager = defaultAiClientManager) {}

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

      const parsed = extractJsonFromModelResponse<
        Partial<{
          content: string;
          lore: string;
          categoryId: string;
        }>
      >(text);
      if (parsed === undefined) {
        throw new Error("Missing JSON payload");
      }
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
}
