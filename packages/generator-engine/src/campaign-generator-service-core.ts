import { isTitleBanned } from "./campaign-generator-registry";
import { getThemeDefaults } from "./campaign-generator-theme";
import type {
  AIGeneratorGateway,
  AIGeneratorCompleteResult,
  AIPolicy,
  CampaignGeneratorDefinition,
  GeneratedDraft,
  GenerationEvent,
  GeneratorPromptMetrics,
  GeneratorOutput,
  GeneratorRunRequest,
} from "./campaign-generator-types";
import { generateTomeTwoPass } from "./public-tome";
import type { TomePrompt } from "./public-tome";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { DungeonStagedStats } from "./dungeon-staged";
import type { LanguageGenerationResultV1, StatSheet } from "schema";

export function completeText(
  result: string | AIGeneratorCompleteResult,
): string {
  return typeof result === "string" ? result : result.text;
}

async function completeTomeEditorialPass(
  gateway: AIGeneratorGateway,
  message: string,
  instruction: string,
  signal: AbortSignal | undefined,
  enqueue: (event: GenerationEvent) => void,
): Promise<string> {
  const completeStream = gateway.completeStream;
  if (!completeStream) throw new Error("Tome streaming is unavailable");
  let buffer = "";
  let completed = false;
  for await (const event of completeStream.call(gateway, message, instruction, {
    signal,
  })) {
    if (signal?.aborted) throw new Error("Tome generation cancelled");
    const outcome = handleTomeEditorialEvent(event, buffer, enqueue);
    buffer = outcome.buffer;
    completed ||= outcome.completed;
  }
  if (!completed) throw new Error("Editorial stream ended without completion");
  return buffer;
}

function handleTomeEditorialEvent(
  event: GenerationEvent,
  currentText: string,
  enqueue: (event: GenerationEvent) => void,
): { buffer: string; completed: boolean } {
  switch (event.type) {
    case "delta":
      enqueue(event);
      return { buffer: currentText + event.text, completed: false };
    case "field":
      enqueue(event);
      return { buffer: currentText, completed: false };
    case "complete":
      return { buffer: event.text || currentText, completed: true };
    case "error":
      throw new Error(event.error);
    default:
      return { buffer: currentText, completed: false };
  }
}

export function canStreamTomeWithAI(
  request: GeneratorRunRequest,
  policy: AIPolicy,
  gateway: AIGeneratorGateway | undefined,
): gateway is AIGeneratorGateway & {
  completeStream: NonNullable<AIGeneratorGateway["completeStream"]>;
} {
  return Boolean(
    request.useAI &&
    policy.isEnabled &&
    policy.isAvailable &&
    gateway?.completeStream,
  );
}

export function canStreamGenericWithAI(
  request: GeneratorRunRequest,
  policy: AIPolicy,
  gateway: AIGeneratorGateway | undefined,
): gateway is AIGeneratorGateway & {
  completeStream: NonNullable<AIGeneratorGateway["completeStream"]>;
} {
  return Boolean(
    isGenericStreamable(request.generatorId) &&
    request.useAI &&
    policy.isEnabled &&
    policy.isAvailable &&
    gateway?.completeStream,
  );
}

export function mergeGeneratorRequest(
  request: GeneratorRunRequest,
  generatorId = request.generatorId,
): GeneratorRunRequest {
  return {
    ...request,
    options: {
      ...getThemeDefaults(request.themeId, generatorId),
      ...request.options,
    },
  };
}

export const mergeGenericRequest = (request: GeneratorRunRequest) =>
  mergeGeneratorRequest(request);

export type GenericStreamAttemptResult = {
  raw: string;
  interactionId?: string;
  replayed: boolean;
  completed: boolean;
  failed: boolean;
  cancelled: boolean;
};

export function captureGenericStreamCompletion(
  event: GenerationEvent,
  result: GenericStreamAttemptResult,
): void {
  if (event.type !== "complete") return;
  result.raw = event.text;
  result.interactionId = event.interactionId;
  result.replayed = !!event.replayed;
  result.completed = true;
}

export type GenericStreamResolution =
  | { type: "retry" }
  | { type: "fallback" }
  | { type: "draft"; draft: GeneratedDraft };

export function mapReviewedTomeDraft(
  reviewed: Awaited<ReturnType<typeof generateTomeTwoPass>>,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  bannedNames: Set<string>,
  generateLocal: () => GeneratedDraft,
): GeneratedDraft {
  if (!reviewed || isTitleBanned(reviewed.title, bannedNames)) {
    return generateLocal();
  }
  return generator.mapOutputToDraft(
    { ...reviewed, summary: reviewed.summary ?? "" },
    request,
  );
}

function createTomePassRunner(
  gateway: AIGeneratorGateway,
  enqueue: (event: GenerationEvent) => void,
) {
  let passNumber = 0;
  return async (
    instruction: string,
    message: string,
    signal?: AbortSignal,
  ): Promise<string> => {
    if (++passNumber === 1) {
      return completeText(
        await gateway.complete(message, instruction, { signal }),
      );
    }
    return completeTomeEditorialPass(
      gateway,
      message,
      instruction,
      signal,
      enqueue,
    );
  };
}

export function startStreamedTomeReview(
  prompt: TomePrompt,
  gateway: AIGeneratorGateway,
  signal: AbortSignal | undefined,
  enqueue: (event: GenerationEvent) => void,
) {
  return generateTomeTwoPass(
    prompt,
    createTomePassRunner(gateway, enqueue),
    signal,
  );
}

export function normalizeDungeonOutput(
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

export function withGeneratorRequest(input: string, prompt: string): string {
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

export function promptMetrics(params: {
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
 * Builds the full prompt and (when the request carries one) the delta-lore
 * interaction turn for a generic single-call generator — shared by
 * `generateDraft`'s generic branch and `generateDraftStream` so the two
 * can't silently diverge on what prompt/interaction shape actually gets
 * sent to the model, same rationale as `parseGenericGeneratorOutput` above.
 */
export function buildGenericGeneratorPrompt(
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
      statSheet?: StatSheet;
      systemId?: string;
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
  /** Called when staged dungeon generation finishes or falls back. */
  onDungeonStagedStats?: (stats: DungeonStagedStats) => void;
}

/** Max AI generation attempts when the model keeps returning a banned name. */
export const MAX_AI_ATTEMPTS = 3;

function isGenericStreamable(generatorId: string): boolean {
  return !["dungeon", "language", "tome", "point-crawl"].includes(generatorId);
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
export class CampaignGeneratorCore {
  protected readonly vault?: GeneratorVaultGateway;
  protected readonly aiGateway?: AIGeneratorGateway;
  protected readonly onInteractionResult?: (
    result: AIGeneratorCompleteResult,
  ) => void;
  protected readonly onPromptMetrics?: (
    metrics: GeneratorPromptMetrics,
  ) => void;
  protected readonly _deps: CampaignGeneratorServiceDeps;

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
}
