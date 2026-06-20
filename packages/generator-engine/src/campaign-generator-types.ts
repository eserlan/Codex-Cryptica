/**
 * Shared contracts for the campaign generator engine.
 *
 * This package is framework-free and MUST NOT import web-app stores. The web
 * app builds the bounded {@link GeneratorVaultContext} and injects vault
 * persistence dependencies into {@link CampaignGeneratorService}.
 */

export type GeneratorId =
  | "npc"
  | "faction"
  | "settlement"
  | "magic-item"
  | "event";

export const SUPPORTED_GENERATOR_IDS: readonly GeneratorId[] = [
  "npc",
  "faction",
  "settlement",
  "magic-item",
  "event",
] as const;

/** A user-configurable field for a generator. */
export interface GeneratorOptionDefinition {
  id: string;
  label: string;
  description?: string;
  control: "radio" | "select" | "checkbox" | "text" | "textarea" | "number";
  choices?: Array<{ value: string; label: string }>;
  required?: boolean;
  defaultValue?: unknown;
}

/**
 * A relationship the model proposes between the generated entity and an existing
 * vault entity, referenced by its exact title. The web app resolves the title to
 * an id and may auto-create the edge on save.
 */
export interface SuggestedConnection {
  /** Exact title of an existing entity from the provided world context. */
  targetTitle: string;
  /** Short relationship label, e.g. "ally", "rival", "located in". */
  relationship: string;
}

/** Raw structured output produced by a generator before draft mapping. */
export interface GeneratorOutput {
  title: string;
  summary: string;
  lore: string;
  labels: string[];
  /**
   * Rich, fully-rendered body for public/SEO surfaces. Distinct from {@link
   * summary} (one sentence) and {@link lore} (vault markdown). When absent,
   * consumers should fall back to `lore`.
   */
  content?: string;
  /** Proposed relationships to existing entities (by exact title). */
  connections?: SuggestedConnection[];
  /** Generated details that do not map onto a known template heading. */
  unmappedDetails?: string;
}

/** An excerpt of an existing entity included in {@link GeneratorVaultContext}. */
export interface VaultContextEntityExcerpt {
  id: string;
  title: string;
  type: string;
  relationship?: string;
  contentExcerpt: string;
  loreExcerpt?: string;
  labels?: string[];
}

export type IncludedContextCategory =
  | "theme"
  | "categories"
  | "source"
  | "neighbors"
  | "world"
  | "titles"
  | "labels";

export type TemplateSource = "none" | "system" | "vault-custom";

/** Bounded campaign context built by the web app and passed into generation. */
export interface GeneratorVaultContext {
  themeId?: string;
  themeName?: string;
  /** Current in-world campaign date/year, when the vault's calendar sets one. */
  currentDate?: string;
  targetEntityType?: string;
  categoryLabels: Array<{ id: string; label: string }>;
  templateOutline?: string;
  templateSource?: TemplateSource;
  applyTemplate: boolean;
  sourceEntity?: VaultContextEntityExcerpt;
  neighbors: VaultContextEntityExcerpt[];
  /**
   * A bounded sample of existing vault entities (excerpts) used as positive
   * world grounding — distinct from {@link neighbors} (graph-connected) and
   * {@link existingTitles} (name ban list).
   */
  worldSample: VaultContextEntityExcerpt[];
  existingTitles: string[];
  bannedNames?: string[];
  labelSuggestions: string[];
  includedContext: IncludedContextCategory[];
}

export type LaunchMode = "workspace" | "contextual";

/** A request to generate a draft. */
export interface GeneratorRunRequest {
  generatorId: GeneratorId;
  options: Record<string, unknown>;
  useAI: boolean;
  /** Free-form instructions from the user, applied with highest priority. */
  instructions?: string;
  /**
   * Required. Defaults to "workspace" (the neutral world theme) when the
   * campaign has no active world theme.
   */
  themeId: string;
  launchMode?: LaunchMode;
  sourceEntityId?: string;
  relationshipLabel?: string;
  vaultContext?: GeneratorVaultContext;
  interaction?: GeneratorInteractionRequest;
}

/** A transient, reviewable result produced before save. */
export interface GeneratedDraft {
  title: string;
  entityType: string;
  summary: string;
  lore: string;
  labels: string[];
  /** Rich public/SEO body carried through from {@link GeneratorOutput.content}. */
  content?: string;
  sourceGeneratorId: GeneratorId;
  sourceEntityId?: string;
  relationshipLabel?: string;
  /** Proposed relationships to existing entities (by exact title). */
  connections?: SuggestedConnection[];
  templateOutline?: string;
  templateApplied: boolean;
  unmappedDetails?: string;
}

/** The user's explicit decision to save a reviewed draft. */
export interface DraftSaveRequest {
  draft: GeneratedDraft;
  createRelationship: boolean;
  relationshipLabel?: string;
  start_date?: { year: number; month: number; day: number };
}

export interface DraftSaveResult {
  entityId: string;
  relationshipCreated: boolean;
}

/** One supported generator exposed inside the campaign app. */
export interface CampaignGeneratorDefinition {
  id: GeneratorId;
  label: string;
  description: string;
  /** Vault category id (NOT the generator id). See README/data-model mapping. */
  entityType: string;
  /**
   * Fallback generation brief used when the user provides no instructions, so
   * the model always has direction for this category.
   */
  defaultInstruction: string;
  icon: string;
  options: GeneratorOptionDefinition[];
  defaults: Record<string, unknown>;
  generate: (request: GeneratorRunRequest) => GeneratorOutput;
  mapOutputToDraft: (
    output: GeneratorOutput,
    request: GeneratorRunRequest,
  ) => GeneratedDraft;
  /** Build an AI prompt string from the run request (including vault context). */
  buildPrompt: (request: GeneratorRunRequest) => string;
}

/**
 * AI generation boundary injected by the web app. The package sends a prompt
 * string and receives a raw JSON string; all AI client details stay in the app.
 */
export interface AIGeneratorGateway {
  complete(
    prompt: string,
    systemInstruction: string,
    options?: AIGeneratorCompleteOptions,
  ): Promise<string | AIGeneratorCompleteResult>;
}

export interface GeneratorInteractionRequest {
  input: string;
  previousInteractionId?: string | null;
  store?: boolean;
  /**
   * Full prompt replayed when the server-side interaction id has expired.
   * The gateway owns expiry detection because it wraps the concrete AI client.
   */
  replayPrompt?: string;
}

export interface AIGeneratorCompleteOptions {
  interaction?: GeneratorInteractionRequest;
}

export interface AIGeneratorCompleteResult {
  text: string;
  interactionId?: string;
  usedInteraction: boolean;
  replayed?: boolean;
}

export interface GeneratorPromptMetrics {
  generatorId: GeneratorId;
  usedInteraction: boolean;
  replayed: boolean;
  fullPromptChars: number;
  sentPromptChars: number;
  savedPromptChars: number;
  estimatedFullPromptTokens: number;
  estimatedSentPromptTokens: number;
  estimatedSavedTokens: number;
}

/**
 * Declares whether AI generation is permitted and available in the current
 * session. Injected by the web app; the package MUST NOT read AI stores directly.
 */
export interface AIPolicy {
  /** Whether the user has AI enabled in their settings. */
  isEnabled: boolean;
  /** Whether the AI service is reachable (network / key available). */
  isAvailable: boolean;
}

/** Thrown when an unknown generator id is requested. Safe to show to users. */
export class UnsupportedGeneratorError extends Error {
  constructor(public readonly generatorId: string) {
    super(`That generator ("${generatorId}") is not available.`);
    this.name = "UnsupportedGeneratorError";
  }
}
