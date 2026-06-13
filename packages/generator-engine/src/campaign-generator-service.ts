import { getGenerator } from "./campaign-generator-registry";
import { getThemeDefaults } from "./campaign-generator-theme";
import {
  type AIPolicy,
  type DraftSaveRequest,
  type DraftSaveResult,
  type GeneratedDraft,
  type GeneratorRunRequest,
} from "./campaign-generator-types";

/**
 * Vault persistence boundary injected by the web app. The package never imports
 * vault stores directly; the host wires real implementations and tests pass
 * mocks. Mirrors the existing `vault.createEntity` / `vault.addConnection`.
 */
export interface GeneratorVaultGateway {
  /** Returns true when the active campaign can be written to. */
  canWrite(): boolean;
  /** Creates an entity and returns its new id. */
  createEntity(
    type: string,
    title: string,
    initialData: {
      summary?: string;
      content?: string;
      lore?: string;
      labels?: string[];
    },
  ): Promise<string>;
  /** Creates a relationship from source to target. */
  addConnection(
    sourceId: string,
    targetId: string,
    type: string,
  ): Promise<unknown>;
}

export interface CampaignGeneratorServiceDeps {
  vault?: GeneratorVaultGateway;
  /** Optional AI policy; when absent, AI is treated as unavailable/disabled. */
  aiPolicy?: AIPolicy;
}

/** User-readable error raised when a save is blocked or invalid. */
export class DraftSaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftSaveError";
  }
}

/**
 * Orchestrates draft generation and save. Generation is pure and never mutates
 * vault data; only {@link saveDraft} writes, and only through the injected
 * gateway after an explicit user action.
 */
export class CampaignGeneratorService {
  private readonly vault?: GeneratorVaultGateway;
  readonly aiPolicy: AIPolicy;

  constructor(deps: CampaignGeneratorServiceDeps = {}) {
    this.vault = deps.vault;
    this.aiPolicy = deps.aiPolicy ?? { isEnabled: false, isAvailable: false };
  }

  /**
   * Produce a transient draft. Throws {@link UnsupportedGeneratorError} for
   * unknown generator ids. Does not write to the vault.
   */
  generateDraft(request: GeneratorRunRequest): GeneratedDraft {
    const generator = getGenerator(request.generatorId);
    // Merge theme defaults under user-provided options so user edits always win.
    const themeDefaults = getThemeDefaults(
      request.themeId,
      request.generatorId,
    );
    const mergedRequest: GeneratorRunRequest = {
      ...request,
      options: { ...themeDefaults, ...request.options },
    };
    // Local-first: AI is never required to produce a draft. When AI is
    // unavailable/disabled the non-AI generator path always runs.
    const output = generator.generate(mergedRequest);
    return generator.mapOutputToDraft(output, mergedRequest);
  }

  /**
   * Save a reviewed draft through the injected vault gateway. Validates
   * required fields and write permission first, preserves the draft on failure
   * (by throwing without side effects), and only creates a relationship after
   * the entity is created.
   */
  async saveDraft(request: DraftSaveRequest): Promise<DraftSaveResult> {
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

    const entityId = await this.vault.createEntity(
      draft.entityType,
      draft.title,
      {
        summary: draft.summary,
        content: draft.summary,
        lore: draft.lore,
        labels: draft.labels,
      },
    );

    let relationshipCreated = false;
    if (request.createRelationship && draft.sourceEntityId) {
      await this.vault.addConnection(
        draft.sourceEntityId,
        entityId,
        request.relationshipLabel || draft.relationshipLabel || "related",
      );
      relationshipCreated = true;
    }

    return { entityId, relationshipCreated };
  }
}

/** Default singleton with no vault wired; the web app injects a real gateway. */
export const campaignGeneratorService = new CampaignGeneratorService();
