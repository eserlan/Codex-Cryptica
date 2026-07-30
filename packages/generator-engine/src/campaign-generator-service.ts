import {
  buildCampaignDungeonPrompt,
  getGenerator,
  isTitleBanned,
} from "./campaign-generator-registry";
import { getThemeDefaults } from "./campaign-generator-theme";
import {
  buildDungeonCoherencePrompt,
  buildDungeonRetryMessage,
  parseDungeonResponseDetailed,
} from "./public-dungeon";
import {
  type AIGeneratorGateway,
  type AIGeneratorCompleteResult,
  type AIPolicy,
  type CampaignGeneratorDefinition,
  type DraftSaveRequest,
  type DraftSaveResult,
  type GeneratedDraft,
  type GeneratorPromptMetrics,
  type GeneratorOutput,
  type GeneratorRunRequest,
  type SuggestedConnection,
} from "./campaign-generator-types";
import { SYSTEM_INSTRUCTION } from "./campaign-generator-registry";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import {
  parseLanguageResponse,
  type LanguageGeneratorOptions,
} from "./public-language";
import {
  parseLanguageGenerationResult,
  validateAILanguageQuality,
  validateFallbackLanguageQuality,
  validateLanguageInputFidelity,
  validateLanguageNameBans,
} from "./language-profile";
import type { LanguageGenerationResultV1 } from "schema";

function completeText(result: string | AIGeneratorCompleteResult): string {
  return typeof result === "string" ? result : result.text;
}

function normalizeDungeonOutput(
  output: PublicGeneratorOutput,
): GeneratorOutput {
  const summary =
    output.summary?.trim() ||
    output.content
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/^#+\s*/gm, "").trim())
      .find(Boolean) ||
    output.lore
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/^#+\s*/gm, "").trim())
      .find(Boolean) ||
    output.title;
  return {
    title: output.title,
    summary,
    content: output.content,
    lore: output.lore,
    labels: output.labels,
  };
}

function withGeneratorRequest(input: string, prompt: string): string {
  const marker = "[GENERATOR REQUEST]";
  const index = input.lastIndexOf(marker);
  if (index === -1) return `${input}\n\n${marker}\n${prompt}`;
  return `${input.slice(0, index)}${marker}\n${prompt}`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Translate generator presentation fields into the two fields stored by vault
 * entities. Dungeon generators expose a player-facing summary, a full keyed
 * location document, and a separate GM reference; the latter two both belong
 * in vault lore.
 */
export function composeDraftVaultFields(draft: GeneratedDraft): {
  content: string;
  lore: string;
} {
  return {
    content: draft.summary || "",
    lore:
      draft.sourceGeneratorId === "dungeon"
        ? [draft.content, draft.lore].filter(Boolean).join("\n\n")
        : draft.lore || "",
  };
}

function promptMetrics(params: {
  request: GeneratorRunRequest;
  fullPrompt: string;
  sentPrompt: string;
  usedInteraction: boolean;
  replayed: boolean;
}): GeneratorPromptMetrics {
  const estimatedFullPromptTokens = estimateTokens(params.fullPrompt);
  const estimatedSentPromptTokens = estimateTokens(params.sentPrompt);
  return {
    generatorId: params.request.generatorId,
    usedInteraction: params.usedInteraction,
    replayed: params.replayed,
    fullPromptChars: params.fullPrompt.length,
    sentPromptChars: params.sentPrompt.length,
    savedPromptChars: Math.max(
      0,
      params.fullPrompt.length - params.sentPrompt.length,
    ),
    estimatedFullPromptTokens,
    estimatedSentPromptTokens,
    estimatedSavedTokens: Math.max(
      0,
      estimatedFullPromptTokens - estimatedSentPromptTokens,
    ),
  };
}

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
      kind?: string;
      languageProfile?: LanguageGenerationResultV1["profile"];
      languageProfileVersion?: 1;
      start_date?: { year: number; month: number; day: number };
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
  /** Called after an interaction-backed AI response succeeds. */
  onInteractionResult?: (result: AIGeneratorCompleteResult) => void;
  /** Called after successful AI generation so callers can compare prompt size. */
  onPromptMetrics?: (metrics: GeneratorPromptMetrics) => void;
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

/** User-readable error raised when neither AI nor local language output is safe. */
export class LanguageGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LanguageGenerationError";
  }
}

function languageResultFromOutput(
  output: PublicGeneratorOutput,
): LanguageGenerationResultV1 {
  return parseLanguageGenerationResult({
    version: output.languageProfileVersion,
    title: output.title,
    summary: output.summary,
    labels: output.labels,
    profile: output.languageProfile,
  });
}

function languageGeneratorOutput(
  output: PublicGeneratorOutput,
): GeneratorOutput {
  return {
    title: output.title,
    summary: output.summary ?? "",
    content: output.content,
    lore: output.lore,
    labels: output.labels,
    languageProfile: output.languageProfile,
    languageProfileVersion: output.languageProfileVersion,
  };
}

function languageOptions(
  request: GeneratorRunRequest,
): LanguageGeneratorOptions {
  const option = (key: string, fallback: string): string => {
    const value = request.options[key];
    return typeof value === "string" && value.trim() ? value : fallback;
  };
  return {
    genre: option("genre", "Classic Fantasy"),
    tone: option("tone", "Lyrical & Vowel-rich"),
    role: option("role", "Common Speech"),
    structure: option("structure", "Compound Words"),
  };
}

function languageRepairPrompt(raw: string, issues: string[]): string {
  return `Repair the following language-generator response. Return one complete replacement JSON object matching LanguageGenerationResultV1, with no markdown fence or commentary.

Validation problems:
${issues.map((issue) => `- ${issue}`).join("\n")}

Previous response:
${raw}`;
}

export function assertValidLanguageFallback(
  output: GeneratorOutput,
  bannedNames: Iterable<string> = [],
): LanguageGenerationResultV1 {
  try {
    const result = parseLanguageGenerationResult({
      version: output.languageProfileVersion,
      title: output.title,
      summary: output.summary,
      labels: output.labels,
      profile: output.languageProfile,
    });
    const issues = [
      ...validateFallbackLanguageQuality(result).issues,
      ...validateLanguageNameBans(result, bannedNames).issues,
    ];
    if (issues.length) {
      throw new LanguageGenerationError(
        `The local language generator could not produce a safe, complete profile: ${issues.join(" ")}`,
      );
    }
    return result;
  } catch (error) {
    if (error instanceof LanguageGenerationError) throw error;
    throw new LanguageGenerationError(
      "The local language generator could not produce a valid profile. Please try again.",
    );
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
  private readonly onInteractionResult?: (
    result: AIGeneratorCompleteResult,
  ) => void;
  private readonly onPromptMetrics?: (metrics: GeneratorPromptMetrics) => void;
  private readonly _deps: CampaignGeneratorServiceDeps;

  /** Returns the current AI policy, reading through any getter on the deps object. */
  get aiPolicy(): AIPolicy {
    return this._deps.aiPolicy ?? { isEnabled: false, isAvailable: false };
  }

  constructor(deps: CampaignGeneratorServiceDeps = {}) {
    this._deps = deps;
    this.vault = deps.vault;
    this.aiGateway = deps.aiGateway;
    this.onInteractionResult = deps.onInteractionResult;
    this.onPromptMetrics = deps.onPromptMetrics;
  }

  private assessLanguageResponse(
    raw: string,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
  ):
    | { output: GeneratorOutput; issues: [] }
    | { output?: undefined; issues: string[] } {
    try {
      const publicOutput = parseLanguageResponse(raw);
      const result = languageResultFromOutput(publicOutput);
      const expected = languageOptions(request);
      const issues = [
        ...validateAILanguageQuality(result).issues,
        ...validateLanguageInputFidelity(result, expected).issues,
        ...validateLanguageNameBans(result, bannedNames).issues,
      ];
      if (issues.length) return { issues };
      return { output: languageGeneratorOutput(publicOutput), issues: [] };
    } catch (error) {
      return {
        issues: [
          error instanceof Error
            ? `Structural validation failed: ${error.message}`
            : "Structural validation failed.",
        ],
      };
    }
  }

  private async generateLanguageWithAI(
    generator: CampaignGeneratorDefinition,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
  ): Promise<GeneratedDraft | null> {
    if (!this.aiGateway) return null;
    const fullPrompt = generator.buildPrompt({
      ...request,
      interaction: undefined,
    });
    const prompt = request.interaction
      ? generator.buildPrompt(request)
      : fullPrompt;
    const interaction = request.interaction
      ? {
          ...request.interaction,
          input: withGeneratorRequest(request.interaction.input, prompt),
          replayPrompt: request.interaction.replayPrompt ?? fullPrompt,
        }
      : undefined;

    try {
      const initial = await this.aiGateway.complete(
        fullPrompt,
        SYSTEM_INSTRUCTION,
        { interaction },
      );
      const first = this.assessLanguageResponse(
        completeText(initial),
        request,
        bannedNames,
      );
      if (first.output) {
        if (typeof initial !== "string" && initial.usedInteraction) {
          this.onInteractionResult?.(initial);
        }
        this.onPromptMetrics?.(
          promptMetrics({
            request,
            fullPrompt,
            sentPrompt:
              typeof initial !== "string" && initial.replayed
                ? (interaction?.replayPrompt ?? fullPrompt)
                : (interaction?.input ?? fullPrompt),
            usedInteraction:
              typeof initial !== "string" && initial.usedInteraction,
            replayed: typeof initial !== "string" && !!initial.replayed,
          }),
        );
        return generator.mapOutputToDraft(first.output, request);
      }

      try {
        const repair = await this.aiGateway.complete(
          languageRepairPrompt(completeText(initial), first.issues),
          SYSTEM_INSTRUCTION,
        );
        const repaired = this.assessLanguageResponse(
          completeText(repair),
          request,
          bannedNames,
        );
        if (repaired.output) {
          return generator.mapOutputToDraft(repaired.output, request);
        }
      } catch {
        // A failed repair call still leaves the one clean regeneration attempt.
      }

      try {
        const regeneration = await this.aiGateway.complete(
          fullPrompt,
          SYSTEM_INSTRUCTION,
        );
        const regenerated = this.assessLanguageResponse(
          completeText(regeneration),
          request,
          bannedNames,
        );
        return regenerated.output
          ? generator.mapOutputToDraft(regenerated.output, request)
          : null;
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  private async generateDungeonWithAI(
    generator: CampaignGeneratorDefinition,
    request: GeneratorRunRequest,
  ): Promise<GeneratedDraft | null> {
    if (!this.aiGateway) return null;

    const prompt = buildCampaignDungeonPrompt(request);
    const interaction = request.interaction
      ? {
          ...request.interaction,
          input: withGeneratorRequest(
            request.interaction.input,
            prompt.userMessage,
          ),
          replayPrompt: request.interaction.replayPrompt ?? prompt.userMessage,
        }
      : undefined;

    try {
      const result = await this.aiGateway.complete(
        prompt.userMessage,
        prompt.systemInstruction,
        { interaction },
      );
      const first = parseDungeonResponseDetailed(
        completeText(result),
        prompt.options,
        undefined,
        prompt.resolved,
      );
      let output = first.output;
      let acceptedInteractionResult: AIGeneratorCompleteResult | undefined =
        typeof result !== "string" && result.usedInteraction
          ? result
          : undefined;

      if (first.rejected) {
        // Structurally unusable — nothing to repair it into, so ask for a
        // fresh attempt against the original prompt plus what went wrong.
        const retry = await this.aiGateway.complete(
          buildDungeonRetryMessage(prompt.userMessage, first.problems),
          prompt.systemInstruction,
        );
        const second = parseDungeonResponseDetailed(
          completeText(retry),
          prompt.options,
          undefined,
          prompt.resolved,
        );
        if (second.problems.length === 0 || !second.rejected) {
          output = second.output;
          // The corrective retry is stateless. Do not advance the interaction
          // from the rejected response that it replaced.
          acceptedInteractionResult = undefined;
        }
      } else if (first.structured) {
        // Passed hard validation, but hard validation only catches what code
        // can check (sector ids, required fields, placeholder names) — the
        // failures that actually recur (an item placed in a sector whose own
        // Lore never names it, a self-siege goal, an invented obstacle) are
        // semantic and produce zero `problems`. Gating this pass behind
        // `problems.length > 0` meant it never ran for exactly the responses
        // most likely to need it, so it always runs once: a targeted
        // proofread/repair pass, not a full regenerate, so the parts that
        // already work are left alone.
        const coherence = buildDungeonCoherencePrompt(
          first.structured,
          prompt.resolved,
        );
        const repair = await this.aiGateway.complete(
          coherence.userMessage,
          coherence.systemInstruction,
        );
        const repaired = parseDungeonResponseDetailed(
          completeText(repair),
          prompt.options,
          undefined,
          prompt.resolved,
        );
        if (!repaired.rejected) {
          output = repaired.output;
          // The repair pass is stateless, same reasoning as the retry above.
          acceptedInteractionResult = undefined;
        }
      }

      if (acceptedInteractionResult) {
        this.onInteractionResult?.(acceptedInteractionResult);
      }
      this.onPromptMetrics?.(
        promptMetrics({
          request,
          fullPrompt: prompt.userMessage,
          sentPrompt:
            typeof result !== "string" && result.replayed
              ? (interaction?.replayPrompt ?? prompt.userMessage)
              : (interaction?.input ?? prompt.userMessage),
          usedInteraction: typeof result !== "string" && result.usedInteraction,
          replayed: typeof result !== "string" && !!result.replayed,
        }),
      );
      return generator.mapOutputToDraft(
        normalizeDungeonOutput(output),
        request,
      );
    } catch {
      return null;
    }
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

    if (canUseAI && this.aiGateway && mergedRequest.generatorId === "dungeon") {
      const dungeonDraft = await this.generateDungeonWithAI(
        generator,
        mergedRequest,
      );
      if (dungeonDraft) return dungeonDraft;
    }

    if (
      canUseAI &&
      this.aiGateway &&
      mergedRequest.generatorId === "language"
    ) {
      const languageDraft = await this.generateLanguageWithAI(
        generator,
        mergedRequest,
        bannedNames,
      );
      if (languageDraft) return languageDraft;
    }

    if (
      canUseAI &&
      this.aiGateway &&
      mergedRequest.generatorId !== "dungeon" &&
      mergedRequest.generatorId !== "language"
    ) {
      const fullPrompt = generator.buildPrompt({
        ...mergedRequest,
        interaction: undefined,
      });
      const prompt = mergedRequest.interaction
        ? generator.buildPrompt(mergedRequest)
        : fullPrompt;
      const interaction = mergedRequest.interaction
        ? {
            ...mergedRequest.interaction,
            input: withGeneratorRequest(
              mergedRequest.interaction.input,
              prompt,
            ),
            replayPrompt: mergedRequest.interaction.replayPrompt ?? fullPrompt,
          }
        : undefined;
      // Retry a few times if the model returns a banned name (including
      // derivatives like "Vane-Smithe"); fall through to local generation if it
      // keeps doing so.
      for (let attempt = 0; attempt < MAX_AI_ATTEMPTS; attempt++) {
        try {
          const result = await this.aiGateway.complete(
            fullPrompt,
            SYSTEM_INSTRUCTION,
            {
              interaction,
            },
          );
          const raw = completeText(result);
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
              content:
                typeof parsed.content === "string" ? parsed.content : undefined,
              labels: Array.isArray(parsed.labels) ? parsed.labels : [],
              connections: parseConnections(parsed.connections),
            };
            if (typeof result !== "string" && result.usedInteraction) {
              this.onInteractionResult?.(result);
            }
            this.onPromptMetrics?.(
              promptMetrics({
                request: mergedRequest,
                fullPrompt,
                sentPrompt:
                  typeof result !== "string" && result.replayed
                    ? (interaction?.replayPrompt ?? fullPrompt)
                    : (interaction?.input ?? fullPrompt),
                usedInteraction:
                  typeof result !== "string" && result.usedInteraction,
                replayed: typeof result !== "string" && !!result.replayed,
              }),
            );
            return generator.mapOutputToDraft(output, mergedRequest);
          }
          break; // Valid JSON but wrong shape — fall through to local.
        } catch {
          break; // Network/parse failure — fall through to local.
        }
      }
    }

    let output: GeneratorOutput;
    try {
      output = generator.generate(mergedRequest);
    } catch (error) {
      if (mergedRequest.generatorId === "language") {
        throw new LanguageGenerationError(
          "The local language generator could not produce a valid profile. Please try again.",
        );
      }
      throw error;
    }
    if (mergedRequest.generatorId === "language") {
      assertValidLanguageFallback(output, bannedNames);
      return generator.mapOutputToDraft(output, mergedRequest);
    }
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

    const vaultFields = composeDraftVaultFields(draft);
    const entityId = await this.vault.createEntity(
      draft.entityType,
      draft.title,
      {
        ...vaultFields,
        labels: draft.labels,
        kind:
          draft.sourceGeneratorId === "language" ||
          draft.sourceGeneratorId === "dungeon"
            ? draft.sourceGeneratorId
            : undefined,
        languageProfile: draft.languageProfile,
        languageProfileVersion: draft.languageProfileVersion,
        ...(request.start_date ? { start_date: request.start_date } : {}),
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
