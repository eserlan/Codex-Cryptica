import { CampaignGeneratorStreamingService } from "./campaign-generator-service-streaming";
import {
  DraftSaveError,
  composeDraftVaultFields,
} from "./campaign-generator-service-core";
import type {
  DraftSaveRequest,
  DraftSaveResult,
} from "./campaign-generator-types";

export class CampaignGeneratorPersistenceService extends CampaignGeneratorStreamingService {
  /**
   * Save a reviewed draft through the injected vault gateway. Validates
   * required fields and write permission first, preserves the draft on failure
   * (by throwing without side effects), and only creates a relationship after
   * the entity is created.
   */
  async saveDraft(request: DraftSaveRequest): Promise<DraftSaveResult> {
    this.validateSaveRequest(request);
    const entityId = await this.createDraftEntity(request);
    const relationshipCreated = await this.createDraftRelationship(
      request,
      entityId,
    );
    return { entityId, relationshipCreated };
  }

  private validateSaveRequest(request: DraftSaveRequest): void {
    const { draft } = request;
    if (!this.vault) {
      throw new DraftSaveError("Saving is unavailable: no campaign is open.");
    }
    if (!draft.title?.trim()) {
      throw new DraftSaveError("A title is required before saving.");
    }
    if (!draft.entityType?.trim()) {
      throw new DraftSaveError("An entity type is required before saving.");
    }
    if (!this.vault.canWrite()) {
      throw new DraftSaveError(
        "This campaign is read-only, so generated drafts can't be saved.",
      );
    }
  }

  private async createDraftEntity(request: DraftSaveRequest): Promise<string> {
    const { draft } = request;
    const vaultFields = composeDraftVaultFields(draft);
    return this.vault!.createEntity(draft.entityType, draft.title, {
      ...vaultFields,
      labels: draft.labels,
      kind:
        draft.sourceGeneratorId === "language" ||
        draft.sourceGeneratorId === "dungeon" ||
        draft.sourceGeneratorId === "point-crawl"
          ? draft.sourceGeneratorId
          : undefined,
      languageProfile: draft.languageProfile,
      languageProfileVersion: draft.languageProfileVersion,
      statSheet: draft.statSheet,
      systemId: draft.systemId,
      ...(request.start_date ? { start_date: request.start_date } : {}),
    });
  }

  private async createDraftRelationship(
    request: DraftSaveRequest,
    entityId: string,
  ): Promise<boolean> {
    const { draft } = request;
    if (!request.createRelationship || !draft.sourceEntityId) return false;
    // Link outbound from the new entity to its source, matching AI-suggested
    // connections and keeping the source visible through its inbound index.
    await this.vault!.addConnection(
      entityId,
      draft.sourceEntityId,
      request.relationshipLabel || draft.relationshipLabel || "related",
    );
    return true;
  }
}
