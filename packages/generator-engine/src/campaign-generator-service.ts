import {
  buildCampaignDungeonPrompt,
  councilVoteFoundationPrompt,
  councilVoteFoundationRepairPrompt,
  councilVotePathsPrompt,
  councilVotePathsRepairPrompt,
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
  type GenerationEvent,
  type GeneratorPromptMetrics,
  type GeneratorOutput,
  type GeneratorRunRequest,
  type SuggestedConnection,
} from "./campaign-generator-types";
import { SYSTEM_INSTRUCTION } from "./campaign-generator-registry";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { StarSystemBody } from "./public-star-system";
import {
  parseLanguageResponse,
  type LanguageGeneratorOptions,
} from "./public-language";
import {
  buildLanguageRepairPrompt,
  classifyAILanguageQuality,
  parseLanguageGenerationResult,
  validateFallbackLanguageQuality,
  validateLanguageInputFidelity,
  validateLanguageNameBans,
} from "./language-profile";
import type { LanguageGenerationResultV1 } from "schema";

const LANGUAGE_GENERATION_CONFIG = {
  temperature: 0.35,
  topP: 0.8,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
} as const;

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
 * Parses and validates a generic (non-dungeon/language/council-vote)
 * generator's raw AI response into a `GeneratorOutput`, shared by
 * `generateDraft`'s buffered generic branch and `generateDraftStream`'s
 * streaming counterpart so the two never silently diverge on what counts as
 * a valid response. Returns `null` for invalid JSON or a response missing
 * required fields — the caller decides what "invalid" means next (retry,
 * fall through to local generation, etc.), this function only classifies.
 */
function parseGenericGeneratorOutput(
  raw: string,
  generatorId: string,
): GeneratorOutput | null {
  let parsed: Partial<GeneratorOutput>;
  try {
    parsed = JSON.parse(raw) as Partial<GeneratorOutput>;
  } catch {
    return null;
  }

  const requiresCompleteSocietyDossier = generatorId === "secret-society";
  const isValidShape =
    typeof parsed.title === "string" &&
    typeof parsed.summary === "string" &&
    typeof parsed.lore === "string" &&
    (!requiresCompleteSocietyDossier ||
      (parsed.lore.trim().length > 0 &&
        typeof parsed.content === "string" &&
        parsed.content.trim().length > 0));
  if (!isValidShape) return null;

  return {
    title: parsed.title as string,
    summary: parsed.summary as string,
    lore: parsed.lore as string,
    content: typeof parsed.content === "string" ? parsed.content : undefined,
    labels: Array.isArray(parsed.labels) ? parsed.labels : [],
    connections: parseConnections(parsed.connections),
    // Only the star-system generator's schema asks for these; every other
    // generator's response simply won't include them.
    bodies: Array.isArray(parsed.bodies)
      ? parsed.bodies.filter(
          (b): b is StarSystemBody =>
            typeof (b as { name?: unknown })?.name === "string" &&
            typeof (b as { type?: unknown })?.type === "string",
        )
      : undefined,
    starType: typeof parsed.starType === "string" ? parsed.starType : undefined,
  };
}

/**
 * Builds the full prompt and (when the request carries one) the delta-lore
 * interaction turn for a generic single-call generator — shared by
 * `generateDraft`'s generic branch and `generateDraftStream` so the two
 * can't silently diverge on what prompt/interaction shape actually gets
 * sent to the model, same rationale as `parseGenericGeneratorOutput` above.
 */
function buildGenericGeneratorPrompt(
  generator: CampaignGeneratorDefinition,
  mergedRequest: GeneratorRunRequest,
): {
  fullPrompt: string;
  interaction: GeneratorRunRequest["interaction"];
} {
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
        input: withGeneratorRequest(mergedRequest.interaction.input, prompt),
        replayPrompt: mergedRequest.interaction.replayPrompt ?? fullPrompt,
      }
    : undefined;

  return { fullPrompt, interaction };
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
    | {
        output: GeneratorOutput;
        blockingIssues: string[];
        advisoryIssues: string[];
        issues: string[];
      }
    | {
        output?: undefined;
        blockingIssues: string[];
        advisoryIssues: string[];
        issues: string[];
      } {
    try {
      const publicOutput = parseLanguageResponse(raw);
      const result = languageResultFromOutput(publicOutput);
      const expected = languageOptions(request);
      const quality = classifyAILanguageQuality(result);
      const blockingIssues = [
        ...quality.blockingIssues,
        ...validateLanguageInputFidelity(result, expected).issues,
        ...validateLanguageNameBans(result, bannedNames).issues,
      ];
      const advisoryIssues = quality.advisoryIssues;
      return {
        output: languageGeneratorOutput(publicOutput),
        blockingIssues,
        advisoryIssues,
        issues: [...blockingIssues, ...advisoryIssues],
      };
    } catch (error) {
      const blockingIssues = [
        error instanceof Error
          ? `Structural validation failed: ${error.message}`
          : "Structural validation failed.",
      ];
      return {
        blockingIssues,
        advisoryIssues: [],
        issues: blockingIssues,
      };
    }
  }

  private async generateLanguageWithAI(
    generator: CampaignGeneratorDefinition,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
  ): Promise<GeneratedDraft | null> {
    if (!this.aiGateway) return null;
    // Language profiles are independent concepts, not conversational revisions.
    // Passing the previous interaction id caused a changed-role request to keep
    // the prior title and summary verbatim (#1910), so this path always sends
    // the complete resolved request as a stateless call. Targeted repairs
    // below are stateless for the same reason.
    const fullPrompt = generator.buildPrompt({
      ...request,
      interaction: undefined,
    });

    try {
      const initial = await this.aiGateway.complete(
        fullPrompt,
        SYSTEM_INSTRUCTION,
        { generationConfig: LANGUAGE_GENERATION_CONFIG },
      );
      const first = this.assessLanguageResponse(
        completeText(initial),
        request,
        bannedNames,
      );
      if (first.output && first.issues.length === 0) {
        this.onPromptMetrics?.(
          promptMetrics({
            request,
            fullPrompt,
            sentPrompt: fullPrompt,
            usedInteraction: false,
            replayed: false,
          }),
        );
        return generator.mapOutputToDraft(first.output, request);
      }

      let candidateRaw = completeText(initial);
      let candidate = first;
      let lastAcceptableOutput =
        first.output && first.blockingIssues.length === 0
          ? first.output
          : undefined;
      const repairBudget = first.blockingIssues.length ? 2 : 1;
      for (
        let repairAttempt = 0;
        repairAttempt < repairBudget;
        repairAttempt += 1
      ) {
        try {
          const repair = await this.aiGateway.complete(
            buildLanguageRepairPrompt(
              candidateRaw,
              candidate.issues,
              fullPrompt,
            ),
            SYSTEM_INSTRUCTION,
            { generationConfig: LANGUAGE_GENERATION_CONFIG },
          );
          candidateRaw = completeText(repair);
          candidate = this.assessLanguageResponse(
            candidateRaw,
            request,
            bannedNames,
          );
          if (candidate.output && candidate.issues.length === 0) {
            return generator.mapOutputToDraft(candidate.output, request);
          }
          if (candidate.output && candidate.blockingIssues.length === 0) {
            lastAcceptableOutput = candidate.output;
            break;
          }
        } catch {
          // Preserve the last parseable candidate for the remaining repair.
        }
      }
      if (lastAcceptableOutput) {
        return generator.mapOutputToDraft(lastAcceptableOutput, request);
      }
      return null;
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
   * Four-pass AI generation for council-vote (#2033/#2034): foundation,
   * foundation-repair, paths, paths-repair, run as four turns on one real
   * chat session so each pass sees every prior pass's actual output as
   * conversation history rather than a hand-summarized re-injection of it —
   * this is what fixed the repeated contradictions (reversed/invented
   * dependencies, persuasion conditions swapped for unrelated evidence,
   * amendments introduced despite an immutable objective) that kept
   * surviving single-shot prompt tightening. Each repair turn proofreads the
   * pass immediately before it — before the next pass builds on it — since a
   * defect in an earlier pass otherwise gets faithfully inherited by a later
   * one that's correctly following its own rules. Requires
   * `aiGateway.startChat` (optional on the interface); if the injected
   * gateway doesn't implement it, falls through to local generation the same
   * as `aiGateway` being unset.
   */
  private async generateCouncilVoteWithAI(
    generator: CampaignGeneratorDefinition,
    request: GeneratorRunRequest,
  ): Promise<GeneratedDraft | null> {
    if (!this.aiGateway?.startChat) return null;

    try {
      const chat = await this.aiGateway.startChat(SYSTEM_INSTRUCTION);

      const isUsableFoundation = (
        value: Partial<GeneratorOutput>,
      ): value is Partial<GeneratorOutput> & {
        title: string;
        summary: string;
        lore: string;
      } =>
        typeof value.title === "string" &&
        typeof value.summary === "string" &&
        typeof value.lore === "string";

      const foundationRaw = await chat.send(
        councilVoteFoundationPrompt(request),
      );
      const foundationParsed = JSON.parse(
        foundationRaw,
      ) as Partial<GeneratorOutput>;
      if (!isUsableFoundation(foundationParsed)) return null;
      let foundation = foundationParsed;

      // Proofread/repair before the paths pass ever sees the foundation —
      // fixing it after would let paths inherit whatever the repair fixed.
      // A malformed repair reply keeps the original, unrepaired foundation
      // rather than failing the whole generation over a cleanup step.
      try {
        const repairedRaw = await chat.send(
          councilVoteFoundationRepairPrompt(),
        );
        const repaired = JSON.parse(repairedRaw) as Partial<GeneratorOutput>;
        if (isUsableFoundation(repaired)) foundation = repaired;
      } catch {
        // Keep the unrepaired foundation.
      }

      type ParsedPaths = { possiblePaths?: unknown; followUpHooks?: unknown };
      const isUsablePaths = (value: ParsedPaths): boolean =>
        typeof value.possiblePaths === "string" &&
        typeof value.followUpHooks === "string";

      const pathsRaw = await chat.send(councilVotePathsPrompt());
      let paths = JSON.parse(pathsRaw) as ParsedPaths;

      // Same rationale as the foundation repair above, one pass later: fix
      // the paths before they're used, and keep the unrepaired paths if the
      // repair reply itself is unusable.
      try {
        const pathsRepairedRaw = await chat.send(
          councilVotePathsRepairPrompt(),
        );
        const pathsRepaired = JSON.parse(pathsRepairedRaw) as ParsedPaths;
        if (isUsablePaths(pathsRepaired)) paths = pathsRepaired;
      } catch {
        // Keep the unrepaired paths.
      }

      const lore = [
        foundation.lore,
        typeof paths.possiblePaths === "string" ? paths.possiblePaths : "",
        typeof paths.followUpHooks === "string" ? paths.followUpHooks : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const output: GeneratorOutput = {
        title: foundation.title,
        summary: foundation.summary,
        lore,
        content:
          typeof foundation.content === "string"
            ? foundation.content
            : undefined,
        labels: Array.isArray(foundation.labels) ? foundation.labels : [],
        connections: parseConnections(foundation.connections),
      };
      return generator.mapOutputToDraft(output, request);
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
      mergedRequest.generatorId === "council-vote"
    ) {
      const councilVoteDraft = await this.generateCouncilVoteWithAI(
        generator,
        mergedRequest,
      );
      if (councilVoteDraft) return councilVoteDraft;
    }

    if (
      canUseAI &&
      this.aiGateway &&
      mergedRequest.generatorId !== "dungeon" &&
      mergedRequest.generatorId !== "language" &&
      mergedRequest.generatorId !== "council-vote"
    ) {
      const { fullPrompt, interaction } = buildGenericGeneratorPrompt(
        generator,
        mergedRequest,
      );
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
          const output = parseGenericGeneratorOutput(
            raw,
            mergedRequest.generatorId,
          );
          if (output) {
            if (isTitleBanned(output.title, bannedNames)) continue;
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
   * Streaming counterpart to `generateDraft` (#2423), for the *generic*
   * single-call generator branch only (every generator except dungeon,
   * language, and council-vote, which use multi-pass repair loops or a chat
   * session that this v1 doesn't stream). Yields `GenerationEvent`s
   * (`started`/`delta`/`field`/`complete`/`error`) as they arrive so the UI
   * can render progressively, then exactly one final `{ type: "draft" }`
   * event carrying the fully validated `GeneratedDraft` — mirroring
   * `generateDraft`'s exact validation/retry/local-fallback behavior, just
   * reached incrementally instead of after one full await. Falls back to
   * calling `generateDraft` itself (yielding only `started` then `draft`)
   * whenever streaming isn't actually available or applicable, so a caller
   * can always use this method uniformly rather than branching on generator
   * type or gateway capability itself.
   */
  async *generateDraftStream(
    request: GeneratorRunRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<
    GenerationEvent | { type: "draft"; draft: GeneratedDraft }
  > {
    const isStreamableGenericGenerator =
      request.generatorId !== "dungeon" &&
      request.generatorId !== "language" &&
      request.generatorId !== "council-vote";

    if (!this.aiGateway?.completeStream || !isStreamableGenericGenerator) {
      yield { type: "started" };
      yield { type: "draft", draft: await this.generateDraft(request) };
      return;
    }

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
    mergedRequest.useAI = canUseAI;

    if (!canUseAI) {
      yield { type: "started" };
      yield { type: "draft", draft: await this.generateDraft(request) };
      return;
    }

    const bannedNames = new Set([
      ...(mergedRequest.vaultContext?.bannedNames ?? []),
      ...(mergedRequest.vaultContext?.existingTitles ?? []),
    ]);

    const { fullPrompt, interaction } = buildGenericGeneratorPrompt(
      generator,
      mergedRequest,
    );

    // Same retry-on-banned-name policy as generateDraft's generic branch —
    // each attempt is a fresh stream, since a name-ban rejection can only be
    // known after the model's response is fully parsed.
    for (let attempt = 0; attempt < MAX_AI_ATTEMPTS; attempt++) {
      let raw = "";
      let interactionId: string | undefined;
      let replayed = false;
      let sawComplete = false;

      try {
        for await (const event of this.aiGateway.completeStream(
          fullPrompt,
          SYSTEM_INSTRUCTION,
          { interaction, signal },
        )) {
          if (event.type === "complete") {
            raw = event.text;
            interactionId = event.interactionId;
            replayed = !!event.replayed;
            sawComplete = true;
          }
          yield event;
        }
      } catch {
        if (signal?.aborted) return; // User cancelled — no fallback draft.
        break; // Network/stream failure — fall through to local.
      }

      if (signal?.aborted) return; // User cancelled — no fallback draft.
      if (!sawComplete) break; // Adaptor reported an `error` event — fall through to local.

      const output = parseGenericGeneratorOutput(
        raw,
        mergedRequest.generatorId,
      );
      if (!output) break; // Valid stream, wrong shape — fall through to local.
      if (isTitleBanned(output.title, bannedNames)) continue;

      if (interaction && interactionId) {
        this.onInteractionResult?.({
          text: raw,
          interactionId,
          usedInteraction: true,
          replayed,
        });
      }
      this.onPromptMetrics?.(
        promptMetrics({
          request: mergedRequest,
          fullPrompt,
          sentPrompt: replayed
            ? (interaction?.replayPrompt ?? fullPrompt)
            : (interaction?.input ?? fullPrompt),
          usedInteraction: !!interaction,
          replayed,
        }),
      );
      yield {
        type: "draft",
        draft: generator.mapOutputToDraft(output, mergedRequest),
      };
      return;
    }

    yield { type: "draft", draft: await this.generateDraft(request) };
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
