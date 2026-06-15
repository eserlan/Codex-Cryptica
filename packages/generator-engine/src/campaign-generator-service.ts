import { getGenerator, isTitleBanned } from "./campaign-generator-registry";
import { getThemeDefaults } from "./campaign-generator-theme";
import {
  type AIGeneratorGateway,
  type AIPolicy,
  type DraftSaveRequest,
  type DraftSaveResult,
  type GeneratedDraft,
  type GeneratorOutput,
  type GeneratorRunRequest,
  type SuggestedConnection,
} from "./campaign-generator-types";
import { SYSTEM_INSTRUCTION } from "./campaign-generator-registry";

/** Validate and normalise the model's "connections" array. */
function parseConnections(value: unknown): SuggestedConnection[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .filter(
      (c): c is SuggestedConnection =>
        !!c &&
        typeof c === "object" &&
        typeof (c as SuggestedConnection).targetTitle === "string" &&
        (c as SuggestedConnection).targetTitle.trim().length > 0,
    )
    .map((c) => ({
      targetTitle: c.targetTitle.trim(),
      relationship:
        typeof c.relationship === "string" && c.relationship.trim()
          ? c.relationship.trim()
          : "related",
    }));
  return out.length ? out : undefined;
}

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
  /**
   * Current AI policy. May be a plain object or a getter-backed object so
   * the caller can supply a reactive reference without re-instantiating the
   * service on every policy change.
   */
  aiPolicy?: AIPolicy;
  /** Optional AI gateway; required for AI-assisted generation. */
  aiGateway?: AIGeneratorGateway;
}

/** Max AI generation attempts when the model keeps returning a banned name. */
const MAX_AI_ATTEMPTS = 3;

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
  private readonly aiGateway?: AIGeneratorGateway;
  private readonly _deps: CampaignGeneratorServiceDeps;

  /** Returns the current AI policy, reading through any getter on the deps object. */
  get aiPolicy(): AIPolicy {
    return this._deps.aiPolicy ?? { isEnabled: false, isAvailable: false };
  }

  constructor(deps: CampaignGeneratorServiceDeps = {}) {
    this._deps = deps;
    this.vault = deps.vault;
    this.aiGateway = deps.aiGateway;
  }

  /**
   * Produce a transient draft. When `useAI` is true and both AI policy and
   * gateway are available, calls the AI gateway and parses JSON output.
   * Falls back to local table generation on any AI failure.
   * Throws {@link UnsupportedGeneratorError} for unknown generator ids.
   * Does not write to the vault.
   */
  async generateDraft(request: GeneratorRunRequest): Promise<GeneratedDraft> {
    const generator = getGenerator(request.generatorId);
    const themeDefaults = getThemeDefaults(
      request.themeId,
      request.generatorId,
    );
    const mergedRequest: GeneratorRunRequest = {
      ...request,
      options: { ...themeDefaults, ...request.options },
    };

    const canUseAI =
      request.useAI &&
      this.aiPolicy.isEnabled &&
      this.aiPolicy.isAvailable &&
      !!this.aiGateway;

    // Propagate the resolved AI flag so the merged request reflects reality.
    mergedRequest.useAI = canUseAI;

    const bannedNames = new Set([
      ...(mergedRequest.vaultContext?.bannedNames ?? []),
      ...(mergedRequest.vaultContext?.existingTitles ?? []),
    ]);

    if (canUseAI && this.aiGateway) {
      const prompt = generator.buildPrompt(mergedRequest);
      // Retry a few times if the model returns a banned name (including
      // derivatives like "Vane-Smithe"); fall through to local generation if it
      // keeps doing so.
      for (let attempt = 0; attempt < MAX_AI_ATTEMPTS; attempt++) {
        try {
          const raw = await this.aiGateway.complete(prompt, SYSTEM_INSTRUCTION);
          const parsed = JSON.parse(raw) as Partial<GeneratorOutput>;
          if (
            typeof parsed.title === "string" &&
            typeof parsed.summary === "string" &&
            typeof parsed.lore === "string"
          ) {
            if (isTitleBanned(parsed.title, bannedNames)) continue;
            const output: GeneratorOutput = {
              title: parsed.title,
              summary: parsed.summary,
              lore: parsed.lore,
              labels: Array.isArray(parsed.labels) ? parsed.labels : [],
              connections: parseConnections(parsed.connections),
            };
            return generator.mapOutputToDraft(output, mergedRequest);
          }
          break; // Valid JSON but wrong shape — fall through to local.
        } catch {
          break; // Network/parse failure — fall through to local.
        }
      }
    }

    let output = generator.generate(mergedRequest);
    // Retry up to 5× if the generated title collides with a banned name.
    for (let i = 0; i < 5 && isTitleBanned(output.title, bannedNames); i++) {
      output = generator.generate(mergedRequest);
    }
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
        content: draft.lore,
        lore: draft.lore,
        labels: draft.labels,
      },
    );

    let relationshipCreated = false;
    if (request.createRelationship && draft.sourceEntityId) {
      // Link OUTBOUND from the new entity to its source, so the originating
      // relationship shows in the new entity's own bonds alongside any
      // AI-suggested connections (which are also outbound). The source still
      // surfaces it via its inbound-connection index.
      await this.vault.addConnection(
        entityId,
        draft.sourceEntityId,
        request.relationshipLabel || draft.relationshipLabel || "related",
      );
      relationshipCreated = true;
    }

    return { entityId, relationshipCreated };
  }
}

/** Default singleton with no vault wired; the web app injects a real gateway. */
export const campaignGeneratorService = new CampaignGeneratorService();
