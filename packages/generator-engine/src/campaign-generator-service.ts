import {
  buildCampaignDungeonPrompt,
  buildCampaignTomePrompt,
  getGenerator,
  isTitleBanned,
} from "./campaign-generator-registry";
import { getThemeDefaults } from "./campaign-generator-theme";
import { suggestName } from "./name-candidates";
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
} from "./campaign-generator-types";
import { SYSTEM_INSTRUCTION } from "./campaign-generator-registry";
// #3184: lives in ./campaign-connections so council-vote generation can use
// it without a service ↔ generation cycle; re-exported to preserve imports.
import { parseConnections } from "./campaign-connections";
export { parseConnections };
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { StarSystemBody } from "./public-star-system";
import { parseLanguageResponse } from "./public-language";
import { generateTomeTwoPass } from "./public-tome";
import {
  buildLanguageRepairPrompt,
  classifyAILanguageQuality,
  validateLanguageInputFidelity,
  validateLanguageNameBans,
} from "./language-profile";
import {
  generateCampaignHeist,
  streamCampaignHeist,
} from "./campaign-heist-generation";
import {
  generateCouncilVoteWithAI,
  generateCouncilVoteWithAIStream,
} from "./campaign-council-vote-generation";
import type { LanguageGenerationResultV1 } from "schema";
import { normalizeHolidayGenericOutput } from "./public-holiday";
import {
  LANGUAGE_GENERATION_CONFIG,
  LanguageGenerationError,
  assertValidLanguageFallback,
  languageGeneratorOutput,
  languageOptions,
  languageResultFromOutput,
} from "./campaign-generator-language";

export {
  LanguageGenerationError,
  assertValidLanguageFallback,
} from "./campaign-generator-language";

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
      draft.sourceGeneratorId === "dungeon" ||
      draft.sourceGeneratorId === "heist"
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
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (generatorId === "holiday") normalizeHolidayGenericOutput(parsed);

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

  const observanceFields = [
    "name",
    "type",
    "when",
    "observers",
    "traditions",
    "tension",
  ] as const;
  const observances = Array.isArray(parsed.observances)
    ? parsed.observances.every(
        (entry) =>
          entry !== null &&
          typeof entry === "object" &&
          observanceFields.every((field) => {
            const value = (entry as Record<string, unknown>)[field];
            return typeof value === "string" && value.trim().length > 0;
          }),
      )
      ? parsed.observances
      : undefined
    : undefined;

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
    observances,
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

function isGenericStreamable(generatorId: string): boolean {
  return !["dungeon", "language", "tome"].includes(generatorId);
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
   * Runs the fast name-only pre-pass (see `name-candidates.ts`) and returns the
   * request to build the main prompt from. Falls back to the request unchanged
   * whenever no name is wanted or the pre-pass fails.
   */
  private async withNameSuggestion(
    request: GeneratorRunRequest,
  ): Promise<GeneratorRunRequest> {
    if (!this.aiGateway) return request;
    const nameSuggestion = await suggestName(this.aiGateway, request);
    return nameSuggestion ? { ...request, nameSuggestion } : request;
  }

  private async generateTomeWithAI(
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    signal?: AbortSignal,
  ): Promise<GeneratedDraft | null> {
    const gateway = this.aiGateway;
    if (!gateway) return null;
    try {
      const prompt = buildCampaignTomePrompt(request);
      const reviewed = await generateTomeTwoPass(
        prompt,
        async (instruction, message, passSignal) =>
          completeText(
            await gateway.complete(message, instruction, {
              signal: passSignal,
            }),
          ),
        signal,
      );
      if (!reviewed || isTitleBanned(reviewed.title, bannedNames)) return null;

      this.onPromptMetrics?.(
        promptMetrics({
          request,
          fullPrompt: prompt.userMessage,
          sentPrompt: prompt.userMessage,
          usedInteraction: false,
          replayed: false,
        }),
      );
      return generator.mapOutputToDraft(
        { ...reviewed, summary: reviewed.summary ?? "" },
        request,
      );
    } catch {
      // An invalid first or second pass falls back to local generation.
      return null;
    }
  }

  private async generateAIDraft(
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    signal?: AbortSignal,
  ): Promise<GeneratedDraft | null> {
    const gateway = this.aiGateway;
    if (!gateway) return null;

    switch (request.generatorId) {
      case "tome":
        return this.generateTomeWithAI(generator, request, bannedNames, signal);
      case "heist":
        try {
          const output = await generateCampaignHeist(request, gateway);
          return generator.mapOutputToDraft(
            { ...output, summary: output.summary ?? "" },
            request,
          );
        } catch {
          return null;
        }
      case "dungeon":
        return this.generateDungeonWithAI(generator, request);
      case "language":
        return this.generateLanguageWithAI(generator, request, bannedNames);
      case "council-vote":
        return generateCouncilVoteWithAI(gateway, generator, request);
      default:
        return this.generateGenericWithAI(generator, request, bannedNames);
    }
  }

  private async generateAIDraftIfAvailable(
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    signal?: AbortSignal,
  ): Promise<GeneratedDraft | null> {
    const canUseAI =
      request.useAI &&
      this.aiPolicy.isEnabled &&
      this.aiPolicy.isAvailable &&
      !!this.aiGateway;
    request.useAI = canUseAI;
    return canUseAI
      ? this.generateAIDraft(generator, request, bannedNames, signal)
      : null;
  }

  private generateLocalDraft(
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
  ): GeneratedDraft {
    let output: GeneratorOutput;
    try {
      output = generator.generate(request);
    } catch (error) {
      if (request.generatorId === "language") {
        throw new LanguageGenerationError(
          "The local language generator could not produce a valid profile. Please try again.",
        );
      }
      throw error;
    }
    if (request.generatorId === "language") {
      assertValidLanguageFallback(output, bannedNames);
      return generator.mapOutputToDraft(output, request);
    }
    for (
      let attempt = 0;
      attempt < 5 && isTitleBanned(output.title, bannedNames);
      attempt++
    ) {
      output = generator.generate(request);
    }
    return generator.mapOutputToDraft(output, request);
  }

  private async generateGenericWithAI(
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
  ): Promise<GeneratedDraft | null> {
    const gateway = this.aiGateway;
    if (!gateway) return null;
    const { fullPrompt, interaction } = buildGenericGeneratorPrompt(
      generator,
      await this.withNameSuggestion(request),
    );
    return this.retryGenericAttempts(
      gateway,
      generator,
      request,
      bannedNames,
      fullPrompt,
      interaction,
    );
  }

  private async retryGenericAttempts(
    gateway: NonNullable<CampaignGeneratorService["aiGateway"]>,
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
  ): Promise<GeneratedDraft | null> {
    for (let attempt = 0; attempt < MAX_AI_ATTEMPTS; attempt++) {
      const result = await this.runGenericAttempt(
        gateway,
        generator,
        request,
        bannedNames,
        fullPrompt,
        interaction,
      );
      if (result.kind === "draft") return result.draft;
      if (result.kind === "stop") return null;
    }
    return null;
  }

  private async runGenericAttempt(
    gateway: NonNullable<CampaignGeneratorService["aiGateway"]>,
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
  ): Promise<
    | { kind: "draft"; draft: GeneratedDraft }
    | { kind: "retry" }
    | { kind: "stop" }
  > {
    try {
      const result = await gateway.complete(fullPrompt, SYSTEM_INSTRUCTION, {
        interaction,
      });
      const output = parseGenericGeneratorOutput(
        completeText(result),
        request.generatorId,
      );
      if (!output) return { kind: "stop" };
      if (isTitleBanned(output.title, bannedNames)) return { kind: "retry" };
      this.recordGenericMetrics(result, request, fullPrompt, interaction);
      return {
        kind: "draft",
        draft: generator.mapOutputToDraft(output, request),
      };
    } catch {
      return { kind: "stop" };
    }
  }

  private recordGenericMetrics(
    result: Awaited<
      ReturnType<NonNullable<CampaignGeneratorService["aiGateway"]>["complete"]>
    >,
    request: GeneratorRunRequest,
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
  ): void {
    const interactionResult = this.getGenericInteractionResult(result);
    if (interactionResult) this.onInteractionResult?.(interactionResult);
    this.onPromptMetrics?.(
      promptMetrics({
        request,
        fullPrompt,
        sentPrompt: this.getGenericSentPrompt(result, fullPrompt, interaction),
        usedInteraction: !!interactionResult,
        replayed: this.isGenericReplay(result),
      }),
    );
  }

  private getGenericInteractionResult(
    result: Awaited<
      ReturnType<NonNullable<CampaignGeneratorService["aiGateway"]>["complete"]>
    >,
  ) {
    if (typeof result === "string" || !result.usedInteraction) return undefined;
    return result;
  }

  private isGenericReplay(
    result: Awaited<
      ReturnType<NonNullable<CampaignGeneratorService["aiGateway"]>["complete"]>
    >,
  ): boolean {
    return typeof result !== "string" && !!result.replayed;
  }

  private getGenericSentPrompt(
    result: Awaited<
      ReturnType<NonNullable<CampaignGeneratorService["aiGateway"]>["complete"]>
    >,
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
  ): string {
    return this.isGenericReplay(result)
      ? (interaction?.replayPrompt ?? fullPrompt)
      : (interaction?.input ?? fullPrompt);
  }

  /**
   * Produce a transient draft. When `useAI` is true and both AI policy and
   * gateway are available, calls the AI gateway and parses JSON output.
   * Falls back to local table generation on any AI failure.
   * Throws {@link UnsupportedGeneratorError} for unknown generator ids.
   * Does not write to the vault.
   */
  async generateDraft(
    request: GeneratorRunRequest,
    signal?: AbortSignal,
  ): Promise<GeneratedDraft> {
    const generator = getGenerator(request.generatorId);
    const themeDefaults = getThemeDefaults(
      request.themeId,
      request.generatorId,
    );
    const mergedRequest: GeneratorRunRequest = {
      ...request,
      options: { ...themeDefaults, ...request.options },
    };

    const bannedNames = new Set([
      ...(mergedRequest.vaultContext?.bannedNames ?? []),
      ...(mergedRequest.vaultContext?.existingTitles ?? []),
    ]);

    const aiDraft = await this.generateAIDraftIfAvailable(
      generator,
      mergedRequest,
      bannedNames,
      signal,
    );
    signal?.throwIfAborted();
    return (
      aiDraft ?? this.generateLocalDraft(generator, mergedRequest, bannedNames)
    );
  }

  /**
   * Streaming counterpart to `generateDraft` (#2423), for the *generic*
   * single-call generator branch only (excluding dungeon, language, and tome,
   * which use multi-pass repair loops, plus council-vote's chat session).
   * Yields `GenerationEvent`s
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
    if (request.generatorId === "heist") {
      if (signal?.aborted) return;
      yield { type: "started" };
      const mergedRequest = {
        ...request,
        options: {
          ...getThemeDefaults(request.themeId, "heist"),
          ...request.options,
        },
      };
      const generator = getGenerator("heist");
      if (
        request.useAI &&
        this.aiPolicy.isEnabled &&
        this.aiPolicy.isAvailable &&
        this.aiGateway
      ) {
        try {
          const output = yield* streamCampaignHeist(
            mergedRequest,
            this.aiGateway,
            signal,
          );
          if (!signal?.aborted)
            yield {
              type: "draft",
              draft: generator.mapOutputToDraft(
                { ...output, summary: output.summary ?? "" },
                mergedRequest,
              ),
            };
          return;
        } catch {
          if (signal?.aborted) return;
        }
      }
      if (!signal?.aborted)
        yield {
          type: "draft",
          draft: await this.generateDraft({ ...mergedRequest, useAI: false }),
        };
      return;
    }
    if (request.generatorId === "council-vote") {
      yield* generateCouncilVoteWithAIStream(
        request,
        {
          aiPolicy: this.aiPolicy,
          aiGateway: this.aiGateway,
          generateDraft: (r) => this.generateDraft(r),
        },
        signal,
      );
      return;
    }

    // Multi-pass tomes must not stream an unreviewed draft as final output.
    const isStreamableGenericGenerator = isGenericStreamable(
      request.generatorId,
    );

    if (!this.aiGateway?.completeStream || !isStreamableGenericGenerator) {
      yield { type: "started" };
      let draft: GeneratedDraft;
      try {
        draft = await this.generateDraft(request, signal);
      } catch (error) {
        if (signal?.aborted) return;
        throw error;
      }
      if (!signal?.aborted) yield { type: "draft", draft };
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

    const promptRequest = await this.withNameSuggestion(mergedRequest);
    if (signal?.aborted) return; // Cancelled during the name pre-pass.
    const { fullPrompt, interaction } = buildGenericGeneratorPrompt(
      generator,
      promptRequest,
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
