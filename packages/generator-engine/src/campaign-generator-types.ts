/**
 * Shared contracts for the campaign generator engine.
 *
 * This package is framework-free and MUST NOT import web-app stores. The web
 * app builds the bounded {@link GeneratorVaultContext} and injects vault
 * persistence dependencies into {@link CampaignGeneratorService}.
 */

export type GeneratorId = "npc" | "faction" | "settlement" | "magic-item";

export const SUPPORTED_GENERATOR_IDS: readonly GeneratorId[] = [
  "npc",
  "faction",
  "settlement",
  "magic-item",
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

/** Raw structured output produced by a generator before draft mapping. */
export interface GeneratorOutput {
  title: string;
  summary: string;
  lore: string;
  labels: string[];
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
  | "titles"
  | "labels";

export type TemplateSource = "none" | "system" | "vault-custom";

/** Bounded campaign context built by the web app and passed into generation. */
export interface GeneratorVaultContext {
  themeId?: string;
  themeName?: string;
  targetEntityType?: string;
  categoryLabels: Array<{ id: string; label: string }>;
  templateOutline?: string;
  templateSource?: TemplateSource;
  applyTemplate: boolean;
  sourceEntity?: VaultContextEntityExcerpt;
  neighbors: VaultContextEntityExcerpt[];
  existingTitles: string[];
  labelSuggestions: string[];
  includedContext: IncludedContextCategory[];
}

export type LaunchMode = "workspace" | "contextual";

/** A request to generate a draft. */
export interface GeneratorRunRequest {
  generatorId: GeneratorId;
  options: Record<string, unknown>;
  useAI: boolean;
  /**
   * Required. Defaults to "workspace" (the neutral world theme) when the
   * campaign has no active world theme.
   */
  themeId: string;
  launchMode?: LaunchMode;
  sourceEntityId?: string;
  relationshipLabel?: string;
  vaultContext?: GeneratorVaultContext;
}

/** A transient, reviewable result produced before save. */
export interface GeneratedDraft {
  title: string;
  entityType: string;
  summary: string;
  lore: string;
  labels: string[];
  sourceGeneratorId: GeneratorId;
  sourceEntityId?: string;
  relationshipLabel?: string;
  templateOutline?: string;
  templateApplied: boolean;
  unmappedDetails?: string;
}

/** The user's explicit decision to save a reviewed draft. */
export interface DraftSaveRequest {
  draft: GeneratedDraft;
  createRelationship: boolean;
  relationshipLabel?: string;
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
  icon: string;
  options: GeneratorOptionDefinition[];
  defaults: Record<string, unknown>;
  generate: (request: GeneratorRunRequest) => GeneratorOutput;
  mapOutputToDraft: (
    output: GeneratorOutput,
    request: GeneratorRunRequest,
  ) => GeneratedDraft;
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
