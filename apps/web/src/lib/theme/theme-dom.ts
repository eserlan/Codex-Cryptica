import {
  THEMES,
  DEFAULT_THEME,
  DEFAULT_JARGON,
  WORKSPACE_DARK,
  FANTASY_DARK,
  PIRATE_DARK,
  MODERN_DARK,
  SCIFI_LIGHT,
  CYBERPUNK_LIGHT,
  APOCALYPTIC_LIGHT,
  HORROR_LIGHT,
  COSMIC_HORROR_LIGHT,
  FALLOUT_LIGHT,
  STARWARS_LIGHT,
  STARTREK_LIGHT,
  LANCER_LIGHT,
  WESTERN_DARK,
  STEAMPUNK_DARK,
  SUPERHERO_DARK,
} from "schema";
import type {
  StylingTemplate,
  JargonMap,
  AppAppearanceId,
  ResolvedAppAppearanceId,
  WorldThemeId,
} from "schema";
import { hexToRgb } from "../utils/color.js";

export const THEME_STORAGE_KEY = "codex-cryptica-active-theme";
export const APPEARANCE_STORAGE_KEY = "codex-cryptica-app-appearance";

type StorageReader = Pick<Storage, "getItem">;

function defaultStorageReader(): StorageReader | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function normalizeWorldThemeId(
  rawThemeId: string | null | undefined,
): WorldThemeId {
  if (!rawThemeId) return DEFAULT_THEME.id;
  const normalized = rawThemeId.replace(/_(light|dark)$/, "");
  return Object.prototype.hasOwnProperty.call(THEMES, normalized)
    ? (normalized as WorldThemeId)
    : DEFAULT_THEME.id;
}

export function readStoredWorldThemeId(
  storage: StorageReader | null = defaultStorageReader(),
): WorldThemeId {
  try {
    const raw = storage?.getItem(THEME_STORAGE_KEY) ?? null;
    return normalizeWorldThemeId(raw);
  } catch {
    return DEFAULT_THEME.id;
  }
}

export function readStoredAppearanceChoice(
  storage: StorageReader | null = defaultStorageReader(),
): AppAppearanceId {
  try {
    const raw = storage?.getItem(APPEARANCE_STORAGE_KEY) ?? null;
    if (raw === "neutral-light" || raw === "neutral-dark" || raw === "system") {
      return raw;
    }
    return "system";
  } catch {
    return "system";
  }
}

export function resolveAppAppearance(
  choice: AppAppearanceId,
  isSystemDark: boolean,
): ResolvedAppAppearanceId {
  if (choice === "system") {
    return isSystemDark ? "neutral-dark" : "neutral-light";
  }
  return choice === "neutral-dark" ? "neutral-dark" : "neutral-light";
}

const DARK_VARIANTS: Partial<Record<WorldThemeId, StylingTemplate>> = {
  workspace: WORKSPACE_DARK,
  fantasy: FANTASY_DARK,
  pirate: PIRATE_DARK,
  modern: MODERN_DARK,
  western: WESTERN_DARK,
  steampunk: STEAMPUNK_DARK,
  superhero: SUPERHERO_DARK,
};

const LIGHT_VARIANTS: Partial<Record<WorldThemeId, StylingTemplate>> = {
  scifi: SCIFI_LIGHT,
  cyberpunk: CYBERPUNK_LIGHT,
  apocalyptic: APOCALYPTIC_LIGHT,
  horror: HORROR_LIGHT,
  cosmic_horror: COSMIC_HORROR_LIGHT,
  fallout: FALLOUT_LIGHT,
  starwars: STARWARS_LIGHT,
  startrek: STARTREK_LIGHT,
  lancer: LANCER_LIGHT,
};

export function resolveStylingTemplate(
  rawThemeId: string | null | undefined,
  appearance: ResolvedAppAppearanceId,
): StylingTemplate {
  const id = normalizeWorldThemeId(rawThemeId);
  const override =
    appearance === "neutral-dark" ? DARK_VARIANTS[id] : LIGHT_VARIANTS[id];
  return (
    override ?? (THEMES as Record<string, StylingTemplate>)[id] ?? DEFAULT_THEME
  );
}

export function getThemeJargon(theme: StylingTemplate): JargonMap {
  return {
    ...DEFAULT_JARGON,
    ...(theme.jargon || {}),
  } as JargonMap;
}

export function resolveThemeJargon(
  themeOrId: StylingTemplate | string | null | undefined,
  key: keyof JargonMap,
  count?: number,
): string {
  const theme =
    typeof themeOrId === "object" && themeOrId !== null
      ? themeOrId
      : resolveStylingTemplate(themeOrId, "neutral-light");
  const jargon = getThemeJargon(theme);
  if (count !== undefined && count !== 1) {
    const pluralKey = `${String(key)}_plural` as keyof JargonMap;
    if (jargon[pluralKey]) return jargon[pluralKey] as string;
  }
  return (
    (jargon[key] as string) || (DEFAULT_JARGON[key] as string) || String(key)
  );
}

export interface ApplyThemeTokensOptions {
  theme: StylingTemplate;
  worldThemeId: string;
  appearance: ResolvedAppAppearanceId;
  appearanceChoice: AppAppearanceId;
  root?: HTMLElement | null;
}

function applyCoreColorTokens(
  root: HTMLElement,
  tokens: StylingTemplate["tokens"],
): void {
  root.style.setProperty("--color-bg-primary", tokens.background);
  root.style.setProperty("--color-bg-surface", tokens.surface);
  root.style.setProperty("--color-accent-primary", tokens.primary);
  root.style.setProperty("--color-accent-dim", tokens.secondary);
  root.style.setProperty("--color-accent-dark", tokens.secondary);
  root.style.setProperty("--color-accent-deep", tokens.background);
  root.style.setProperty("--color-border-primary", tokens.border);
  root.style.setProperty("--color-accent", tokens.accent);
  root.style.setProperty(
    "--color-accent-primary-rgb",
    hexToRgb(tokens.primary),
  );
  root.style.setProperty("--color-theme-accent-rgb", hexToRgb(tokens.accent));
  root.style.setProperty("--theme-primary-rgb", hexToRgb(tokens.primary));
  root.style.setProperty("--theme-accent-rgb", hexToRgb(tokens.accent));
  root.style.setProperty("--color-text-primary", tokens.text);
  const metaText = tokens.metaText ?? tokens.secondary;
  root.style.setProperty("--color-text-muted", metaText);
  root.style.setProperty("--color-text-dim", metaText);
}

function setCssProps(
  root: HTMLElement,
  entries: ReadonlyArray<readonly [string, string]>,
): void {
  for (const [name, value] of entries) {
    root.style.setProperty(name, value);
  }
}

type RequiredColorTokenKey =
  "text" | "primary" | "secondary" | "surface" | "background" | "accent";

type ColorTokenKey =
  | RequiredColorTokenKey
  | "titleInk"
  | "sectionTitle"
  | "metaText"
  | "link"
  | "iconDefault"
  | "iconActive"
  | "focus"
  | "panelFill"
  | "panelMuted"
  | "selectedBg"
  | "selectedBorder"
  | "focusBg"
  | "focusBorder"
  | "actionBg"
  | "actionHover"
  | "actionText";

const SEMANTIC_TOKEN_MAP: ReadonlyArray<
  readonly [string, ColorTokenKey, RequiredColorTokenKey]
> = [
  ["--text-primary", "text", "text"],
  ["--text-secondary", "sectionTitle", "secondary"],
  ["--text-muted", "metaText", "secondary"],
  ["--link", "link", "primary"],
  ["--icon-interactive", "iconActive", "primary"],
  ["--border-interactive", "selectedBorder", "primary"],
  ["--color-theme-accent", "accent", "accent"],
  ["--theme-title-ink", "titleInk", "text"],
  ["--theme-section-title", "sectionTitle", "secondary"],
  ["--theme-meta-text", "metaText", "secondary"],
  ["--theme-icon-default", "iconDefault", "secondary"],
  ["--theme-icon-active", "iconActive", "primary"],
  ["--theme-focus", "focus", "accent"],
  ["--theme-panel-fill", "panelFill", "surface"],
  ["--theme-action-bg", "actionBg", "primary"],
  ["--theme-action-hover", "actionHover", "secondary"],
  ["--theme-action-text", "actionText", "background"],
  ["--color-oracle-primary", "accent", "accent"],
];

const MIXED_TOKEN_MAP: ReadonlyArray<
  readonly [string, ColorTokenKey, ColorTokenKey, number]
> = [
  ["--theme-panel-muted", "panelMuted", "surface", 28],
  ["--theme-selected-bg", "selectedBg", "primary", 86],
  ["--theme-selected-border", "selectedBorder", "primary", 42],
  ["--theme-focus-bg", "focusBg", "accent", 84],
  ["--theme-focus-border", "focusBorder", "accent", 42],
];

function applySemanticTokens(
  root: HTMLElement,
  tokens: StylingTemplate["tokens"],
): void {
  for (const [cssVar, key, fallbackKey] of SEMANTIC_TOKEN_MAP) {
    root.style.setProperty(cssVar, tokens[key] ?? tokens[fallbackKey]);
  }
  for (const [cssVar, key, baseKey, pct] of MIXED_TOKEN_MAP) {
    const val =
      tokens[key] ??
      `color-mix(in srgb, ${tokens[baseKey]}, ${tokens.background} ${pct}%)`;
    root.style.setProperty(cssVar, val);
  }
  setCssProps(root, [
    [
      "--color-oracle-dim",
      `color-mix(in srgb, ${tokens.accent}, ${tokens.background} 30%)`,
    ],
    [
      "--color-oracle-dark",
      `color-mix(in srgb, ${tokens.accent}, ${tokens.background} 60%)`,
    ],
  ]);
}

const THEME_GLOW_BUILDERS: Record<
  string,
  (tokens: StylingTemplate["tokens"]) => string
> = {
  cyberpunk: (t) => `0 0 15px ${t.primary}44`,
  horror: (t) => `0 0 20px ${t.primary}33`,
  fantasy: (t) => `0 0 14px ${t.accent}44`,
  fallout: (t) => `0 0 18px ${t.primary}55, 0 0 6px ${t.primary}33`,
};

const THEME_RADIUS_DEFAULTS: Record<string, string> = {
  modern: "12px",
  fantasy: "3px",
  horror: "0px",
};

function applyVisualBehaviorTokens(
  root: HTMLElement,
  theme: StylingTemplate,
): void {
  const tokens = theme.tokens;
  root.style.setProperty("--font-header-val", tokens.fontHeader);
  root.style.setProperty("--font-body-val", tokens.fontBody);
  root.style.setProperty(
    "--font-display-val",
    tokens.fontDisplay ?? tokens.fontHeader,
  );
  root.style.setProperty(
    "--theme-border-width",
    `${theme.graph.nodeBorderWidth}px`,
  );
  root.style.setProperty(
    "--theme-edge-stroke-width",
    `${theme.graph.edgeWidth}px`,
  );

  const glow = THEME_GLOW_BUILDERS[theme.id]?.(tokens) ?? "none";
  root.style.setProperty("--theme-glow", glow);

  const textGlow =
    theme.id === "fallout"
      ? `0 0 4px ${tokens.primary}80, 0 0 1px ${tokens.primary}`
      : "none";
  root.style.setProperty("--theme-text-glow", textGlow);

  const radius =
    tokens.borderRadius ?? THEME_RADIUS_DEFAULTS[theme.id] ?? "2px";
  root.style.setProperty("--theme-border-radius", radius);
}

function applyTextureTokens(root: HTMLElement, theme: StylingTemplate): void {
  const tokens = theme.tokens;
  const backdrop = tokens.textureCardBlur
    ? `blur(${tokens.textureCardBlur})`
    : "none";

  if (tokens.texture === "workspace_grain.svg") {
    const workspaceWash = `radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, ${tokens.accent} 5%, transparent), transparent 70%)`;
    root.style.setProperty("--bg-texture", "none");
    root.style.setProperty("--bg-texture-overlay", workspaceWash);
    root.style.setProperty("--theme-card-backdrop", backdrop);
    return;
  }

  if (tokens.texture) {
    const alpha = tokens.textureOverlayAlpha ?? "80";
    root.style.setProperty("--bg-texture", `url('/themes/${tokens.texture}')`);
    const vignette =
      theme.id === "fallout"
        ? `radial-gradient(ellipse at center, transparent 55%, ${tokens.background}CC 100%), `
        : "";
    root.style.setProperty(
      "--bg-texture-overlay",
      `${vignette}linear-gradient(${tokens.background}${alpha}, ${tokens.background}${alpha}), url('/themes/${tokens.texture}')`,
    );
    root.style.setProperty("--theme-card-backdrop", backdrop);
    return;
  }

  root.style.setProperty("--bg-texture", "none");
  root.style.setProperty("--bg-texture-overlay", "none");
  root.style.setProperty("--theme-card-backdrop", "none");
}

export function applyThemeTokensToDocument(
  options: ApplyThemeTokensOptions,
): void {
  const root =
    options.root ??
    (typeof document !== "undefined" ? document.documentElement : null);
  if (!root) return;

  const { theme, worldThemeId, appearance, appearanceChoice } = options;
  root.dataset.theme = theme.id;
  root.dataset.appAppearance = appearance;
  root.dataset.appAppearanceChoice = appearanceChoice;
  root.dataset.worldTheme = normalizeWorldThemeId(worldThemeId);

  applyCoreColorTokens(root, theme.tokens);
  applySemanticTokens(root, theme.tokens);
  applyVisualBehaviorTokens(root, theme);
  applyTextureTokens(root, theme);
}

let publicThemePreviewActive = false;

export function setPublicThemePreviewActive(active: boolean): void {
  publicThemePreviewActive = active;
}

export function isPublicThemePreviewActive(): boolean {
  return publicThemePreviewActive;
}

/**
 * Applies a public-route theme preview directly to the DOM without writing
 * localStorage, IndexedDB, or vault OPFS config.
 */
export function applyPublicThemePreview(
  previewThemeId: string | null | undefined,
  appearanceChoice: AppAppearanceId,
  resolvedAppearance: ResolvedAppAppearanceId,
  root?: HTMLElement | null,
): void {
  const rawThemeId = previewThemeId ?? readStoredWorldThemeId();
  const worldThemeId = normalizeWorldThemeId(rawThemeId);
  const theme = resolveStylingTemplate(worldThemeId, resolvedAppearance);
  applyThemeTokensToDocument({
    theme,
    worldThemeId,
    appearance: resolvedAppearance,
    appearanceChoice,
    root,
  });
}
