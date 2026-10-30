import { vault } from "#lib/stores/vault.svelte.js";
import { categories } from "#lib/stores/categories.svelte.js";
import { themeStore } from "#lib/stores/theme.svelte.js";
import { calendarStore } from "#lib/stores/calendar.svelte.js";
import { entityTemplateService } from "#lib/services/EntityTemplateService.svelte.js";
import { searchService } from "@codex/search-orchestrator";
import { interactionSessions } from "@codex/ai-engine";
import { generatorSessionManager } from "#lib/services/generators/generator-session-manager.js";
import {
  buildVaultContext,
  latestTemporalYear,
} from "#lib/services/generators/generator-vault-context.js";
import { resolveCultureNaming } from "#lib/services/generators/generator-culture-naming.js";
import {
  getDefaultInstruction,
  resolveEntityType,
  type GeneratorRunRequest,
  type GeneratorVaultContext,
} from "generator-engine";
import type { Entity } from "schema";

export type CampaignGenerateInput = Pick<
  GeneratorRunRequest,
  "generatorId" | "options" | "useAI" | "instructions" | "primaryLanguageId"
>;

/** Include both inbound and outbound links when grounding a source entity. */
export function collectSourceConnections(
  entities: Record<string, Entity>,
  sourceId?: string | null,
): Set<string> {
  const source = sourceId ? entities[sourceId] : undefined;
  const connected = new Set<string>();
  if (!source) return connected;
  for (const connection of source.connections ?? [])
    connected.add(connection.target);
  for (const [id, entity] of Object.entries(entities)) {
    if (
      id !== sourceId &&
      entity.connections?.some((connection) => connection.target === sourceId)
    )
      connected.add(id);
  }
  return connected;
}

const defaultDeps = {
  vault,
  categories,
  themeStore,
  calendarStore,
  entityTemplateService,
  searchService,
  interactionSessions,
  generatorSessionManager,
};

/** Prepare the app's vault, template, calendar and interaction context for a run. */
export class CampaignGeneratorRequestBuilder {
  constructor(private readonly deps = defaultDeps) {}

  private async resolveTemplate(type: string): Promise<string> {
    const { vault, themeStore, entityTemplateService } = this.deps;
    try {
      const folder = await vault.getActiveFolderHandle();
      const handle = await vault.getActiveVaultHandle();
      return await entityTemplateService.resolveTemplate(
        type,
        themeStore.worldThemeId,
        folder ?? handle,
      );
    } catch {
      return entityTemplateService.resolveTemplate(
        type,
        themeStore.worldThemeId,
      );
    }
  }

  private async findRelevantEntities(query: string): Promise<string[]> {
    if (!query.trim()) return [];
    try {
      return (
        await this.deps.searchService.search(query.trim(), { limit: 8 })
      ).map((hit) => hit.id);
    } catch {
      // Search is optional; the context builder falls back to type sampling.
      return [];
    }
  }

  private currentDate(): string | undefined {
    const { calendarStore, vault } = this.deps;
    const cal = calendarStore.config;
    const year =
      typeof cal.presentYear === "number" && cal.presentYear !== 0
        ? cal.presentYear
        : latestTemporalYear(vault.entities);
    return year !== undefined
      ? `${year}${cal.epochLabel ? ` ${cal.epochLabel}` : ""}`
      : undefined;
  }

  private themeContext() {
    const { themeStore } = this.deps;
    return {
      themeId: themeStore.worldThemeId ?? "workspace",
      themeName: themeStore.activeTheme?.name,
      themeDescription: themeStore.activeTheme?.description,
    };
  }

  private async resolveCultureNaming(
    instructions: string | undefined,
    sourceEntity: Entity | undefined,
    sourceConnectedIds: Set<string>,
    targetEntityType: string,
  ) {
    const { vault } = this.deps;
    // Look up the naming conventions the vault records for the entity's
    // culture (labels pick the culture; only its few naming notes are loaded).
    const cultureNaming = resolveCultureNaming({
      allEntities: vault.entities,
      sourceEntity,
      connectedIds: sourceConnectedIds,
      instructions,
      targetEntityType,
    });
    if (cultureNaming) {
      await Promise.all(
        cultureNaming.docIds.map((id) =>
          vault.loadEntityContent(id).catch(() => undefined),
        ),
      );
    }

    return cultureNaming;
  }

  private prepareInteraction(
    req: CampaignGenerateInput,
    instructions: string,
    vaultContext: GeneratorVaultContext,
    getAIPolicy: () => { isEnabled: boolean; isAvailable: boolean },
  ) {
    const aiPolicy = getAIPolicy();
    return req.useAI &&
      aiPolicy.isEnabled &&
      aiPolicy.isAvailable &&
      this.deps.interactionSessions.enabled &&
      this.deps.generatorSessionManager.enabled
      ? this.deps.generatorSessionManager.prepare({
          instruction: instructions,
          vaultContext,
        })
      : null;
  }

  private async buildContext(
    req: CampaignGenerateInput,
    sourceEntityId: string | null,
  ): Promise<GeneratorVaultContext> {
    const { vault, categories } = this.deps;
    const sourceEntity = sourceEntityId
      ? vault.entities[sourceEntityId]
      : undefined;
    const sourceConnectedIds = collectSourceConnections(
      vault.entities,
      sourceEntityId,
    );
    // Resolve the entity template following the normal selection rules
    // (local vault override → theme default → generic) so the AI shapes its
    // output to match the template the user would get from manual creation.
    const targetEntityType = resolveEntityType(
      req.generatorId,
      categories.list.map((c) => c.id),
    );
    // Ships are persisted as locations, but their generated lore needs a
    // vessel-specific outline rather than the generic location template.
    const targetTemplateType =
      req.generatorId === "ship" ? "ship" : targetEntityType;
    const templateOutline = await this.resolveTemplate(targetTemplateType);

    // Use the non-AI search engine to find vault entities relevant to the
    // user's request, so the world-grounding context is about what they asked
    // for (e.g. "plains of shas") rather than a blind type sample.
    const relevantIds = await this.findRelevantEntities(
      req.instructions?.trim() || sourceEntity?.title || "",
    );

    const currentDate = this.currentDate();

    const cultureNaming = await this.resolveCultureNaming(
      req.instructions,
      sourceEntity,
      sourceConnectedIds,
      targetEntityType,
    );

    return buildVaultContext({
      ...this.themeContext(),
      currentDate,
      sourceEntity,
      allEntities: vault.entities,
      connectedIds: sourceConnectedIds,
      categoryLabels: categories.list.map((c) => ({
        id: c.id,
        label: c.label,
      })),
      targetEntityType,
      templateOutline: templateOutline || undefined,
      applyTemplate: !!templateOutline,
      relevantIds,
      primaryLanguageId: req.primaryLanguageId,
      cultureNaming,
    });
  }

  async build(
    req: CampaignGenerateInput,
    sourceEntityId: string | null,
    getAIPolicy: () => { isEnabled: boolean; isAvailable: boolean },
  ): Promise<GeneratorRunRequest> {
    const vaultContext = await this.buildContext(req, sourceEntityId);
    // When the user gives no instructions, fall back to the category's
    // default brief so the model always has direction.
    const instructions =
      req.instructions?.trim() || getDefaultInstruction(req.generatorId);
    const interactionTurn = this.prepareInteraction(
      req,
      instructions,
      vaultContext,
      getAIPolicy,
    );
    return {
      ...req,
      instructions,
      themeId: this.deps.themeStore.worldThemeId ?? "workspace",
      vaultContext,
      interaction: interactionTurn
        ? {
            input: interactionTurn.input,
            previousInteractionId: interactionTurn.previousInteractionId,
            store: true,
          }
        : undefined,
    };
  }
}

export const campaignGeneratorRequestBuilder =
  new CampaignGeneratorRequestBuilder();
