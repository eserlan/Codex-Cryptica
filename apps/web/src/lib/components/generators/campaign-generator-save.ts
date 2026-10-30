import {
  buildBusinessSavePlan,
  composeDraftVaultFields,
  type GeneratedDraft,
  type CampaignGeneratorService,
} from "generator-engine";
import { vault } from "#lib/stores/vault.svelte.js";
import { layoutUIStore } from "#lib/stores/ui/layout-ui.svelte.js";
import { revisionService } from "#lib/services/RevisionService.svelte.js";
import {
  saveBusinessToVault,
  type BusinessSaveChoices,
} from "#lib/services/generators/business-vault-save.js";
import { savePointCrawlToVault } from "#lib/services/generators/point-crawl-vault-save.js";
import { openSavedEntityInEditor } from "#lib/services/generators/generator-save-handoff.js";
import { publishGeneratedSaved } from "#lib/services/generator-journal-capture.js";
import { systemClock } from "#lib/utils/runtime-deps.js";
import { blobToFile } from "#lib/utils/svg-export.js";
import { entityMapLinkingService } from "#lib/services/entity-map-linking.js";

export interface CampaignSaveOptions {
  selectedNodeIds?: string[];
  openInGraph?: boolean;
  businessChoices?: BusinessSaveChoices;
}

export interface CampaignSaveContext {
  workflow: {
    sourceEntityId: string | null;
    launchMode: "workspace" | "contextual";
    prefillDate?: { year: number; month: number; day: number } | null;
  };
  businessExistingTitles: ReadonlyMap<string, string>;
  businessSource?: {
    entityId: string;
    entityType: "location" | "character" | "faction";
  };
  options?: CampaignSaveOptions;
  exportStarSystem?: () => Promise<Blob | null>;
  exportConstellation?: () => Promise<Blob | null>;
  exportPointCrawl?: () => Promise<Blob | null>;
}

const defaultDeps = {
  vault,
  layoutUIStore,
  revisionService,
  saveBusinessToVault,
  savePointCrawlToVault,
  openSavedEntityInEditor,
  publishGeneratedSaved,
  systemClock,
  blobToFile,
  entityMapLinkingService,
};

/** Persist a reviewed generator result and hand it to the appropriate editor. */
export class CampaignGeneratorSaver {
  constructor(private readonly deps = defaultDeps) {}

  private recordSaved(reviewed: GeneratedDraft) {
    try {
      this.deps.publishGeneratedSaved(
        { title: reviewed.title, category: reviewed.entityType },
        { clock: this.deps.systemClock },
      );
    } catch (err) {
      console.error("Could not record the save:", err);
    }
  }

  private openSaved(entityId: string, title: string, openInGraph = false) {
    const { vault, layoutUIStore, openSavedEntityInEditor } = this.deps;
    if (openInGraph) {
      layoutUIStore.mainViewMode = "visualization";
    } else {
      openSavedEntityInEditor(entityId, title, {
        isFocusMode:
          layoutUIStore.mainViewMode === "focus" || layoutUIStore.isMobile,
        selectEntity: (id) => {
          vault.selectedEntityId = id;
        },
      });
    }
  }

  private async linkDiagram(
    reviewed: GeneratedDraft,
    entityId: string,
    exportPng: (() => Promise<Blob | null>) | undefined,
    errorMessage: string,
  ) {
    if (!exportPng) return;
    try {
      const blob = await exportPng();
      if (!blob) return;
      const file = this.deps.blobToFile(blob, `${reviewed.title}.png`);
      await this.deps.entityMapLinkingService.linkImageToEntity(
        file,
        `${reviewed.title} Map`,
        entityId,
      );
    } catch (err) {
      // An optional image export must never block a successful entity save.
      console.error(errorMessage, err);
    }
  }

  private async linkStandardDiagram(
    reviewed: GeneratedDraft,
    entityId: string,
    context: CampaignSaveContext,
  ) {
    if (reviewed.bodies?.length && context.exportStarSystem) {
      await this.linkDiagram(
        reviewed,
        entityId,
        context.exportStarSystem,
        "Failed to link generated map image:",
      );
    } else if (reviewed.pattern?.stars?.length && context.exportConstellation) {
      await this.linkDiagram(
        reviewed,
        entityId,
        context.exportConstellation,
        "Failed to link generated constellation chart:",
      );
    }
  }

  private async saveBusiness(
    reviewed: GeneratedDraft,
    context: CampaignSaveContext,
  ) {
    const { vault, saveBusinessToVault } = this.deps;
    const plan = buildBusinessSavePlan(reviewed.business!, {
      existingTitles: context.businessExistingTitles,
      source: context.businessSource,
    });
    const result = await saveBusinessToVault(
      plan,
      {
        createEntity: (type, title, data) =>
          vault.createEntity(type, title, data),
        addConnection: (src, tgt, rel, label) =>
          vault.addConnection(src, tgt, rel, label),
        bulkDelete: (ids) => vault.bulkDelete(ids),
      },
      context.options?.businessChoices,
    );
    this.recordSaved(reviewed);
    vault.selectedEntityId = result.businessId;
    this.openSaved(
      result.businessId,
      reviewed.title,
      context.options?.openInGraph,
    );
  }

  private async savePointCrawl(
    reviewed: GeneratedDraft,
    createRelationship: boolean,
    context: CampaignSaveContext,
  ) {
    const { vault, savePointCrawlToVault } = this.deps;
    const result = await savePointCrawlToVault(
      reviewed.pointCrawl!,
      {
        createEntity: (type, title, data) =>
          vault.createEntity(type, title, data),
        addConnection: (src, tgt, rel, label) =>
          vault.addConnection(src, tgt, rel, label),
      },
      {
        selectedNodeIds: context.options?.selectedNodeIds,
        overviewTitle: reviewed.title,
        overviewLabels: reviewed.labels,
        sourceEntityId: context.workflow.sourceEntityId ?? undefined,
        createSourceRelationship: createRelationship,
      },
    );
    this.recordSaved(reviewed);
    await this.linkDiagram(
      reviewed,
      result.overviewNoteId,
      context.exportPointCrawl,
      "Failed to link generated point-crawl diagram:",
    );
    vault.selectedEntityId = result.overviewNoteId;
    this.openSaved(
      result.overviewNoteId,
      reviewed.title,
      context.options?.openInGraph,
    );
  }

  private async addSuggestedConnections(
    reviewed: GeneratedDraft,
    entityId: string,
    sourceEntityId: string | null,
  ) {
    const { vault } = this.deps;
    if (!reviewed.connections?.length) return;
    const byTitle = new Map(
      Object.entries(vault.entities).map(([id, entity]) => [
        entity.title.trim().toLowerCase(),
        id,
      ]),
    );
    for (const connection of reviewed.connections) {
      await this.addSuggestedConnection(
        connection,
        byTitle,
        entityId,
        sourceEntityId,
      );
    }
  }

  private async addSuggestedConnection(
    connection: NonNullable<GeneratedDraft["connections"]>[number],
    byTitle: Map<string, string>,
    entityId: string,
    sourceEntityId: string | null,
  ) {
    const targetId = byTitle.get(connection.targetTitle.trim().toLowerCase());
    if (!targetId || targetId === entityId || targetId === sourceEntityId)
      return;
    try {
      await this.deps.vault.addConnection(
        entityId,
        targetId,
        connection.relationship || "related",
      );
    } catch {
      // Suggested links are best-effort, including already existing connections.
    }
  }

  private stageRevision(reviewed: GeneratedDraft, entityId: string) {
    const { revisionService, systemClock } = this.deps;
    // Push generated content as a pending draft so zen mode shows the
    // proposal diff — user accepts or discards from the editor.
    const vaultFields = composeDraftVaultFields(reviewed);
    revisionService.pendingDraft = {
      entityId,
      source: "revise",
      chronicle: vaultFields.content,
      lore: vaultFields.lore,
      timestamp: systemClock.now(),
      deleteOnDiscard: true,
      generatorSessionCommit: true,
    };
  }

  private async saveStandard(
    reviewed: GeneratedDraft,
    createRelationship: boolean,
    context: CampaignSaveContext,
    service: Pick<CampaignGeneratorService, "saveDraft">,
  ) {
    // Create the entity skeleton (title + type + labels, no content yet).
    const result = await service.saveDraft({
      draft: {
        ...reviewed,
        summary: "",
        content: undefined,
        lore: "",
        sourceEntityId: context.workflow.sourceEntityId ?? undefined,
        relationshipLabel:
          context.workflow.launchMode === "contextual" ? "related" : undefined,
      },
      createRelationship,
      ...(context.workflow.prefillDate
        ? { start_date: context.workflow.prefillDate }
        : {}),
    });
    this.recordSaved(reviewed);
    await this.linkStandardDiagram(reviewed, result.entityId, context);
    await this.addSuggestedConnections(
      reviewed,
      result.entityId,
      context.workflow.sourceEntityId,
    );
    this.stageRevision(reviewed, result.entityId);
    this.openSaved(result.entityId, reviewed.title);
  }

  async save(
    reviewed: GeneratedDraft,
    createRelationship: boolean,
    context: CampaignSaveContext,
    service: Pick<CampaignGeneratorService, "saveDraft">,
  ): Promise<void> {
    if (reviewed.business) return this.saveBusiness(reviewed, context);
    if (reviewed.pointCrawl)
      return this.savePointCrawl(reviewed, createRelationship, context);
    await this.saveStandard(reviewed, createRelationship, context, service);
  }
}

export const campaignGeneratorSaver = new CampaignGeneratorSaver();
