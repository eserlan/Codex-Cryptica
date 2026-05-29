import { extractProposals } from "editor-core";
import type { Entity } from "schema";
import { DEFAULT_CATEGORIES, DEFAULT_ENTITY_TYPE } from "schema";
import { isAIEnabled } from "./ai/capability-guard";

export interface IEntityProposalService {
  extractProposals(
    markdown: string,
    existingEntityTitles: Set<string>,
  ): string[];
  acceptProposal(
    title: string,
    sourceContext: string,
    apiKey?: string,
  ): Promise<{ entity: Entity; categoryInferred: boolean }>;
}

export interface EntityProposalServiceDeps {
  aiClientManager?: any;
  entityTemplateService?: any;
  vault?: any;
}

export class EntityProposalService implements IEntityProposalService {
  constructor(private deps: EntityProposalServiceDeps = {}) {}

  extractProposals(
    markdown: string,
    existingEntityTitles: Set<string> = new Set(),
  ): string[] {
    return extractProposals(markdown, existingEntityTitles);
  }

  async acceptProposal(
    title: string,
    sourceContext: string,
    apiKey?: string,
  ): Promise<{ entity: Entity; categoryInferred: boolean }> {
    let categoryId = DEFAULT_ENTITY_TYPE;
    let categoryInferred = false;

    if (isAIEnabled() && apiKey && this.deps.aiClientManager) {
      try {
        const model = await this.deps.aiClientManager.getModel(
          apiKey,
          "gemini-2.5-flash",
        );
        const categoriesStr = DEFAULT_CATEGORIES.map(
          (c) => `- ${c.id}: ${c.label}`,
        ).join("\n");
        const prompt = `You are an AI assistant for a world-building app. The user wants to create a new entity named "${title}".
Based on the following source context where this entity was mentioned, guess the most appropriate category ID from the list below.
Return ONLY the exact category ID, nothing else. If you are unsure, return "${DEFAULT_ENTITY_TYPE}".

Categories:
${categoriesStr}

Source Context:
${sourceContext.slice(0, 3000)}`;

        const result = await model.generateContent(prompt);
        const guessedCategory = result.response.text().trim().toLowerCase();

        if (DEFAULT_CATEGORIES.some((c) => c.id === guessedCategory)) {
          categoryId = guessedCategory;
          categoryInferred = true;
        }
      } catch (e) {
        console.warn(
          "AI category inference failed, falling back to default:",
          e,
        );
      }
    }

    let templateContent = "";
    if (this.deps.entityTemplateService) {
      templateContent =
        await this.deps.entityTemplateService.resolveTemplate(categoryId);
    }

    if (!this.deps.vault) {
      throw new Error("Vault is required to create entity");
    }

    const entityId = await this.deps.vault.createEntity(categoryId, title, {
      content: templateContent,
      discoverySource: "Proposed from text",
    });

    const entity = this.deps.vault.entities[entityId] || { id: entityId, title, categoryId };
    return { entity, categoryInferred };
  }
}

// Lazy bind global singletons
import { aiClientManager } from "./ai/client-manager";
import { entityTemplateService } from "./EntityTemplateService.svelte";
import { vault } from "$lib/stores/vault.svelte";

export const entityProposalService = new EntityProposalService({
  get aiClientManager() {
    return aiClientManager;
  },
  get entityTemplateService() {
    return entityTemplateService;
  },
  get vault() {
    return vault;
  },
});
