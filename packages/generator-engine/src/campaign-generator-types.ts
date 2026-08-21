/**
 * Shared contracts for the campaign generator engine.
 *
 * This package is framework-free and MUST NOT import web-app stores. The web
 * app builds the bounded {@link GeneratorVaultContext} and injects vault
 * persistence dependencies into {@link CampaignGeneratorService}.
 */
import type { LanguageProfileV1 } from "schema";
import type { StarSystemBody } from "./public-star-system";

export type GeneratorId =
  | "npc"
  | "faction"
  | "settlement"
  | "magic-item"
  | "minor-magic-item"
  | "event"
  | "ship"
  | "language"
  | "news-sheet"
  | "dungeon"
  | "adventure"
  | "quest"
  | "plot-twist"
  | "villain"
  | "world"
  | "council-vote"
  | "secret-society"
  | "star-system"
  | "alien-race"
  | "random-table";

export const SUPPORTED_GENERATOR_IDS: readonly GeneratorId[] = [
  "npc",
  "faction",
  "settlement",
  "magic-item",
  "minor-magic-item",
  "event",
  "ship",
  "language",
  "news-sheet",
  "dungeon",
  "adventure",
  "quest",
  "plot-twist",
  "villain",
  "world",
  "council-vote",
  "secret-society",
  "star-system",
  "alien-race",
  "random-table",
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
  visibleWhen?: {
    optionId: string;
    values?: string[];
    notValues?: string[];
  };
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
  /** Canonical rules for language generators; markdown fields are derived. */
  languageProfile?: LanguageProfileV1;
  languageProfileVersion?: 1;
  /**
   * Structured major-body data for the star-system generator, driving its
   * orbital diagram. Absent for every other generator.
   */
  bodies?: StarSystemBody[];
  /** Star-system generator's primary star spectral class, e.g. "G", "Neutron Star". */
  starType?: string;
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

/** One explicitly selected saved language, structured or legacy-readable. */
export interface SelectedLanguageContext extends VaultContextEntityExcerpt {
  languageProfile?: LanguageProfileV1;
  languageProfileVersion?: 1;
  legacy: boolean;
}

export type IncludedContextCategory =
  | "theme"
  | "categories"
  | "source"
  | "neighbors"
  | "world"
  | "titles"
  | "labels"
  | "languages";

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
  /** Authoritative only after an explicit user selection. */
  selectedLanguage?: SelectedLanguageContext;
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
  /** Explicit primary language choice; absent means no authoritative profile. */
  primaryLanguageId?: string;
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
  /** Canonical language rules carried unchanged through review and save. */
  languageProfile?: LanguageProfileV1;
  languageProfileVersion?: 1;
  primaryLanguageId?: string;
  primaryLanguageTitle?: string;
  /** Carried through from {@link GeneratorOutput.bodies} for the star-system generator's orbital diagram. */
  bodies?: StarSystemBody[];
  /** Carried through from {@link GeneratorOutput.starType}. */
  starType?: string;
  /**
   * Source and direct neighbor entity references supplied from the vault context
   * that grounded this generation.
   */
  contextProvenance?: Array<{ id: string; title: string }>;
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
  /**
   * Opens a real multi-turn chat session (#2033/#2034/#2035): each `send()`
   * on the returned session is a turn on the same underlying conversation, so
   * a later pass sees an earlier pass's actual output as history rather than
   * a hand-summarized re-injection of it. Distinct from `complete()`'s
   * `interaction`/`previousInteractionId` option, which is server-side state
   * scoped to continuity across separate `generateDraft()` calls (e.g. UI
   * re-rolls) — this is in-process state for chaining passes within a single
   * generation, and the two should not be mixed. Optional so existing
   * `complete()`-only gateway implementations and test doubles keep working;
   * generators requiring a chat session should treat its absence the same as
   * `aiGateway` being unset (AI path unavailable, fall back to local tables).
   */
  startChat?(systemInstruction: string): Promise<AIGeneratorChatSession>;
}

export interface AIGeneratorChatSession {
  /** Sends one turn and returns its text, awaiting the full response. */
  send(userMessage: string): Promise<string>;
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
  generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
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

/**
 * Context provided to the random table generator.
 */
export interface RandomTableGenerationContext {
  /** The theme or topic of the table (e.g. "Docklands Encounters", "Smuggler Rumors") */
  topic: string;
  /** Number of entries to generate (2-50, defaults to standard dice sizes like 6, 8, 10, 12, 20) */
  count?: number;
  /** Freeform user instructions or campaign notes taking highest priority */
  campaignContext?: string;
  /** Names of existing tables and decks available for sub-table reference emission */
  availableTables?: string[];
  /** Relevant entities retrieved from the active vault for lore grounding */
  worldEntities?: Array<{
    title: string;
    category?: string;
    summary?: string;
  }>;
  /** The active visual/genre theme for stylistic tone matching */
  theme?: string;
}

/**
 * A generated candidate entry awaiting user review.
 */
export interface CandidateTableEntry {
  /** Unique transient client ID for UI selection & editing tracking */
  id: string;
  /** Generated entry text (may contain {table_name} nested references) */
  text: string;
  /** Inferred default weight (usually 1) */
  weight: number;
  /** Discovered entity names referenced in the text */
  matchedEntities?: string[];
  /** Discovered sub-table names referenced in the text */
  matchedSubTables?: string[];
  /** Selection status in the review preview (defaults to true) */
  selected: boolean;
}

/**
 * Structured output schema from the AI model.
 */
export interface GeneratedTableOutput {
  /** Suggested table title based on the topic */
  title: string;
  /** Suggested short description */
  description?: string;
  /** List of generated row texts */
  entries: Array<{
    text: string;
    weight?: number;
  }>;
}
