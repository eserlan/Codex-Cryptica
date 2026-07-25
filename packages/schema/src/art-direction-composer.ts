/**
 * Art Direction v2 — the prompt composer.
 *
 * One deterministic function assembles every image prompt. Layer order is
 * fixed and intentional:
 *
 *   subject → category → theme → camera/optics → style reference
 *
 * Identical inputs always produce identical output. Nothing here is provider
 * specific; provider adapters format the result.
 */

import {
  composeThemeLayer,
  getCategory,
  getFactionBlueprint,
  getTheme,
  resolveCategoryId,
  resolveThemeId,
  type ArtCategory,
  type ArtTheme,
} from "./art-direction-catalogue";
import { composeNegativeTerms } from "./art-direction-negatives";
import {
  formatOptics,
  mergeOptics,
  validateOptics,
  type AspectRatio,
  type OpticsOverrides,
  type OpticsPreset,
  type OpticsWarning,
} from "./art-direction-optics";
import {
  getStature,
  resolveStatureFromLabels,
  resolveStatureId,
  type ArtStature,
  type StatureId,
  type StatureSource,
} from "./art-direction-stature";
import {
  prepareSubject,
  type SubjectPreparationOptions,
} from "./art-direction-subject";

/** How named style lineages are handled. */
export type StyleReferenceMode =
  /** Emit the reviewed named references (default). */
  | "named"
  /** Emit the reviewed name-free fallback instead. */
  | "name-free"
  /** Emit no style lineage at all. */
  | "disabled";

/** At most this many named lineages are active at once; more muddies the style. */
export const MAX_ACTIVE_STYLE_REFERENCES = 2;

export const ART_DIRECTION_VERSION = 2 as const;

export interface ComposeImagePromptInput {
  /** Descriptive subject text. Proper names are stripped before use. */
  subject: string;
  /** Entity type, category id, or command hint. */
  category?: string;
  /** Active vault theme id. Aliases and light/dark suffixes are tolerated. */
  theme?: string;
  /**
   * Standing of the subject: mundane, renowned, mythic, or divine. Ids and
   * aliases ("deity", "legendary") are both accepted.
   */
  stature?: string;
  /**
   * Entity labels, read for stature when none is passed explicitly. Highest
   * wins, and labels naming no stature leave the prompt unchanged.
   */
  statureLabels?: readonly string[];
  /**
   * Stature the subject distiller read out of vault canon. Lowest precedence:
   * a label the user typed always beats a model's reading of the lore.
   */
  inferredStature?: string;
  /** Named camera variant from the category, e.g. `portrait`. */
  cameraVariant?: string;
  /** Advanced per-request optics adjustments. */
  opticsOverrides?: OpticsOverrides;
  /** Defaults to `named`. */
  styleReferenceMode?: StyleReferenceMode;
  /**
   * User- or entity-authored style direction. Replaces the theme layer and
   * suppresses the style lineage, so a vault's own art direction wins over
   * shipped theme defaults. Category framing, camera, and negatives still
   * apply.
   */
  styleOverride?: string;
  /** Names to strip from the subject, and the descriptor to fall back on. */
  subjectOptions?: SubjectPreparationOptions;
  /** Include the camera/optics layer. Defaults to true. */
  includeCamera?: boolean;
  /** Include negative terms. Defaults to true. */
  includeNegatives?: boolean;
  /** Hard cap on the composed positive prompt. */
  maxPromptLength?: number;
}

export interface ComposedPromptLayers {
  subject: string;
  /** Register clause. Empty unless the subject carries stature. */
  stature: string;
  category: string;
  theme: string;
  camera: string;
  styleReference: string;
}

export interface ComposedImagePrompt {
  /** The full positive prompt, layers joined in order. */
  prompt: string;
  /** Negative terms, general block first, deduplicated. Provider-neutral. */
  negativeTerms: string[];
  /** Individual layers, for preview and debugging. */
  layers: ComposedPromptLayers;
  /** Reproducibility metadata to store alongside the generated image. */
  metadata: ComposedPromptMetadata;
  /** Contradictory or excessive optics settings, for development warnings. */
  warnings: OpticsWarning[];
}

export interface ComposedPromptMetadata {
  artDirectionVersion: typeof ART_DIRECTION_VERSION;
  categoryId?: string;
  themeId?: string;
  statureId?: StatureId;
  /** Where the stature came from. Absent when none applied. */
  statureSource?: StatureSource;
  cameraPresetId?: string;
  cameraVariant?: string;
  styleReferenceMode: StyleReferenceMode;
  /** True when vault-authored direction replaced the shipped theme layer. */
  styleOverridden: boolean;
  /** Whether the anatomy negative block was included. */
  figureInFrame: boolean;
  /**
   * The composed framing. Carried out of the composer so a provider that takes
   * explicit pixel dimensions can request the shape the prompt asks for.
   */
  aspectRatio?: AspectRatio;
  /** Proper names removed from the subject. Kept for provenance only. */
  removedNames: string[];
  truncated: boolean;
}

const DEFAULT_MAX_PROMPT_LENGTH = 4000;

/**
 * Joins layers into one prompt. Empty layers are omitted cleanly rather than
 * leaving double separators.
 */
function joinLayers(layers: string[]): string {
  return layers
    .map((layer) => layer.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .map((layer) => layer.replace(/[.\s]+$/, ""))
    .join(". ")
    .concat(".");
}

/**
 * Truncates at a sentence boundary where possible so a cut prompt never ends
 * mid-clause.
 */
function capPrompt(
  prompt: string,
  maxLength: number,
): {
  prompt: string;
  truncated: boolean;
} {
  if (prompt.length <= maxLength) return { prompt, truncated: false };

  const hardCut = prompt.slice(0, maxLength);
  const lastBoundary = hardCut.lastIndexOf(". ");
  const cut =
    lastBoundary > maxLength * 0.6
      ? hardCut.slice(0, lastBoundary + 1)
      : hardCut.trimEnd();
  return { prompt: cut, truncated: true };
}

function buildStyleReferenceLayer(
  theme: ArtTheme | undefined,
  mode: StyleReferenceMode,
): string {
  if (!theme || mode === "disabled") return "";

  if (mode === "name-free") {
    return theme.nameFreeFallback || "";
  }

  const references = (theme.styleReferences || []).slice(
    0,
    MAX_ACTIVE_STYLE_REFERENCES,
  );
  if (references.length === 0) return theme.nameFreeFallback || "";
  return `in the tradition of ${references.join(" and ")}`;
}

/**
 * Factions default to a defining moment rather than a lineup. The blueprint's
 * signals are appended to the category layer; the moments themselves are
 * guidance for subject generation and are not forced into the prompt.
 */
function buildCategoryLayer(
  category: ArtCategory | undefined,
  categoryId: string | undefined,
  themeId: string | undefined,
  stature: ArtStature | undefined,
): string {
  if (!category) return "";
  // An exalted subject shows no wear, so the prompt asking for stains and
  // repairs is replaced rather than contradicted by a negative term.
  const prompt =
    (stature?.materialFocus === "exalted" && category.exaltedPrompt) ||
    category.prompt;
  if (categoryId !== "faction") return prompt;

  // A blueprint describes a mortal order — livery, tabards, battle standards.
  // An exalted stature says how rank reads instead.
  const signals =
    stature?.factionSignals || getFactionBlueprint(themeId)?.signals;
  if (!signals) return prompt;
  // Category prompts carry no trailing punctuation, so the break is added here.
  return `${prompt}. Establish the group through ${signals}`;
}

function resolveCamera(
  category: ArtCategory | undefined,
  theme: ArtTheme | undefined,
  stature: ArtStature | undefined,
  variant: string | undefined,
  overrides: OpticsOverrides | undefined,
): OpticsPreset | undefined {
  if (!category) return undefined;

  const base =
    (variant && category.variants?.[variant]) || category.defaultCamera;
  // Theme camera bias sits between the category default and user overrides:
  // a theme may prefer a film stock, but an explicit override always wins.
  // Stature sits above the theme: a god shot in any theme is still shot from
  // below, in light of its own.
  const themed = mergeOptics(base, theme?.defaultCamera);
  const statured = mergeOptics(themed, stature?.defaultCamera);
  return mergeOptics(statured, overrides);
}

/**
 * Composes a complete image prompt from independently replaceable layers.
 */
export function composeImagePrompt(
  input: ComposeImagePromptInput,
): ComposedImagePrompt {
  const styleReferenceMode = input.styleReferenceMode || "named";
  const categoryId = resolveCategoryId(input.category);
  const themeId = resolveThemeId(input.theme);
  const category = getCategory(categoryId);
  const theme = getTheme(themeId);
  // Explicit beats labels beats inference: the user's own words win over a
  // model's reading of the lore, and both win over nothing.
  const statureId =
    resolveStatureId(input.stature) ??
    resolveStatureFromLabels(input.statureLabels) ??
    resolveStatureId(input.inferredStature);
  const statureSource: StatureSource | undefined = !statureId
    ? undefined
    : resolveStatureId(input.stature)
      ? "explicit"
      : resolveStatureFromLabels(input.statureLabels)
        ? "labels"
        : "inferred";
  const stature = getStature(statureId);

  const prepared = prepareSubject(input.subject, input.subjectOptions || {});
  if (!prepared.subject) {
    throw new Error("Draw request subject is required.");
  }

  const camera =
    input.includeCamera === false
      ? undefined
      : resolveCamera(
          category,
          theme,
          stature,
          input.cameraVariant,
          input.opticsOverrides,
        );

  // Vault-authored direction replaces the shipped theme wholesale; mixing the
  // two produces prompts that specify two different mediums at once.
  const styleOverride = (input.styleOverride || "").trim();
  // Stature overrides the category's material focus: what a thing is made of
  // follows from its standing before it follows from its kind.
  const themeLayer = theme
    ? composeThemeLayer(
        theme,
        stature?.materialFocus ?? category?.materialFocus,
      )
    : "";
  const layers: ComposedPromptLayers = {
    subject: prepared.subject,
    stature: stature?.prompt || "",
    category: buildCategoryLayer(category, categoryId, themeId, stature),
    theme: styleOverride || themeLayer,
    camera: formatOptics(camera),
    styleReference: styleOverride
      ? ""
      : buildStyleReferenceLayer(theme, styleReferenceMode),
  };

  const { prompt, truncated } = capPrompt(
    joinLayers([
      layers.subject,
      layers.stature,
      layers.category,
      layers.theme,
      layers.camera,
      layers.styleReference,
    ]),
    input.maxPromptLength || DEFAULT_MAX_PROMPT_LENGTH,
  );

  // Anatomy negatives are only worth spending on images that contain anatomy.
  // A preset or override can add a figure to a category that normally has none
  // (the item `in-hand` framing) or take one away, so an explicit value wins
  // over the category default in both directions.
  const figureInFrame =
    camera?.figureInFrame ?? category?.includesFigures ?? false;

  return {
    prompt,
    negativeTerms:
      input.includeNegatives === false
        ? []
        : composeNegativeTerms(categoryId, {
            figureInFrame,
            extraTerms: stature?.negativePrompt,
          }),
    layers,
    metadata: {
      artDirectionVersion: ART_DIRECTION_VERSION,
      categoryId,
      themeId,
      statureId,
      statureSource,
      cameraPresetId: camera?.id,
      cameraVariant: input.cameraVariant,
      styleReferenceMode,
      styleOverridden: Boolean(styleOverride),
      figureInFrame,
      aspectRatio: camera?.aspectRatio,
      removedNames: prepared.removedNames,
      truncated,
    },
    warnings: camera ? validateOptics(camera) : [],
  };
}
