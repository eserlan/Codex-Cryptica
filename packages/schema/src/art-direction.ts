import {
  GLOBAL_ART_DIRECTION_DEFAULT,
  CATEGORY_ART_DIRECTION_DEFAULTS,
  THEME_ART_DIRECTION_DEFAULTS,
  FACTION_THEME_TEMPLATES,
} from "./art-direction-templates";
export type ArtDirectionSource =
  | "entity-context"
  | "user-authored-context"
  | "category-default"
  | "theme-default"
  | "global-default";

export type DrawSurface =
  "command" | "entity" | "zen" | "graph" | "cover" | "chat";

export interface DrawRequestContext {
  subject: string;
  entityId?: string;
  entityTitle?: string;
  categoryId?: string;
  categoryLabel?: string;
  categoryIdIsHint?: boolean;
  themeId?: string;
  surface: DrawSurface;
  entityArtDirection?: string;
  userAuthoredArtDirection?: string;
}

export interface ArtDirectionTemplate {
  id: string;
  label: string;
  template: string;
  source: ArtDirectionSource;
}

export interface ResolvedArtDirection {
  prompt: string;
  source: ArtDirectionSource;
  templateId?: string;
  subject: string;
  categoryId?: string;
  themeId?: string;
}

const MAX_CONTEXT_TEMPLATE_LENGTH = 4000;

function capPrompt(prompt: string): string {
  return prompt.length > MAX_CONTEXT_TEMPLATE_LENGTH
    ? prompt.slice(0, MAX_CONTEXT_TEMPLATE_LENGTH)
    : prompt;
}

export {
  GLOBAL_ART_DIRECTION_DEFAULT,
  CATEGORY_ART_DIRECTION_DEFAULTS,
  THEME_ART_DIRECTION_DEFAULTS,
  FACTION_THEME_TEMPLATES,
} from "./art-direction-templates";

const CATEGORY_ALIASES: Record<string, string> = {
  npc: "character",
  person: "character",
  place: "location",
  region: "location",
  object: "item",
  artifact: "item",
  concept: "note",
  world: "cover",
};

const THEME_ALIASES: Record<string, string> = {
  "gothic-horror": "horror",
  gothic_horror: "horror",
  "post-apocalyptic": "apocalyptic",
  post_apocalyptic: "apocalyptic",
  "pulp-adventure": "pulp_adventure",
};

export function resolveArtDirection(
  context: DrawRequestContext,
): ResolvedArtDirection {
  const subject = normalizeRequiredSubject(context);
  const categoryId =
    normalizeCategoryId(
      context.surface === "cover" ? "cover" : context.categoryId,
      context.surface === "cover" || context.categoryIdIsHint,
    ) || undefined;

  const rawThemeId = normalizeThemeId(context.themeId) || undefined;
  const themeId = rawThemeId
    ? THEME_ALIASES[rawThemeId] || rawThemeId
    : undefined;

  const entityTemplate = contextTemplate(
    "entity-context",
    "entity.context",
    "Entity Art Direction",
    context.entityArtDirection,
  );
  if (entityTemplate) {
    return {
      prompt: capPrompt(applySubject(entityTemplate.template, subject)),
      source: "entity-context",
      templateId: entityTemplate.id,
      subject,
      categoryId,
      themeId,
    };
  }

  const userTemplate = contextTemplate(
    "user-authored-context",
    "user.context",
    "User Authored Art Direction",
    context.userAuthoredArtDirection,
  );
  if (userTemplate) {
    return {
      prompt: capPrompt(applySubject(userTemplate.template, subject)),
      source: "user-authored-context",
      templateId: userTemplate.id,
      subject,
      categoryId,
      themeId,
    };
  }

  let source: ArtDirectionSource = "global-default";
  let templateId: string | undefined = GLOBAL_ART_DIRECTION_DEFAULT.id;

  const factionThemeTemplate =
    categoryId === "faction" && themeId && FACTION_THEME_TEMPLATES[themeId]
      ? {
          id: `category.faction.${themeId}`,
          label: `Faction ${themeId} Default`,
          source: "category-default" as ArtDirectionSource,
          template: `${CATEGORY_ART_DIRECTION_DEFAULTS.faction.template} ${FACTION_THEME_TEMPLATES[themeId]}`,
        }
      : undefined;
  const categoryTemplate = factionThemeTemplate
    ? factionThemeTemplate
    : categoryId
      ? CATEGORY_ART_DIRECTION_DEFAULTS[categoryId]
      : undefined;
  const themeTemplate = themeId
    ? THEME_ART_DIRECTION_DEFAULTS[themeId]
    : undefined;
  const globalTemplate = GLOBAL_ART_DIRECTION_DEFAULT;

  const parts: string[] = [];
  if (categoryTemplate) {
    parts.push(applySubject(categoryTemplate.template, subject));
    source = "category-default";
    templateId = categoryTemplate.id;
  }
  if (themeTemplate) {
    parts.push(applySubject(themeTemplate.template, subject));
    if (source === "global-default") {
      source = "theme-default";
      templateId = themeTemplate.id;
    }
  }

  parts.push(applySubject(globalTemplate.template, subject));

  return {
    prompt: capPrompt(parts.join(" ")),
    source,
    templateId,
    subject,
    categoryId,
    themeId,
  };
}

export function getCategoryArtDirectionDefault(
  categoryId?: string,
  options: { categoryIdIsHint?: boolean } = {},
): ArtDirectionTemplate | undefined {
  const normalized = normalizeCategoryId(categoryId, options.categoryIdIsHint);
  return normalized ? CATEGORY_ART_DIRECTION_DEFAULTS[normalized] : undefined;
}

export function getThemeArtDirectionDefault(
  themeId?: string,
): ArtDirectionTemplate | undefined {
  const normalized = normalizeThemeId(themeId);
  const mapped = normalized
    ? THEME_ALIASES[normalized] || normalized
    : undefined;
  return mapped ? THEME_ART_DIRECTION_DEFAULTS[mapped] : undefined;
}

function normalizeRequiredSubject(context: DrawRequestContext) {
  const subject = (context.subject || context.entityTitle || "").trim();
  if (!subject) {
    throw new Error("Draw request subject is required.");
  }
  return subject;
}

function contextTemplate(
  source: ArtDirectionSource,
  id: string,
  label: string,
  template?: string,
): ArtDirectionTemplate | undefined {
  const normalized = normalizeTemplate(template);
  if (!normalized) return undefined;
  return { id, label, source, template: normalized };
}

function normalizeTemplate(template?: string) {
  const normalized = (template || "").trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.slice(0, MAX_CONTEXT_TEMPLATE_LENGTH);
}

function applySubject(template: string, subject: string) {
  const normalized = normalizeTemplate(template);
  if (normalized.includes("{subject}")) {
    return normalized.replaceAll("{subject}", subject);
  }
  return `${subject}. ${normalized}`;
}

function normalizeId(id?: string) {
  return (id || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeCategoryId(id?: string, applyAliases = false) {
  const normalized = normalizeId(id);
  return applyAliases ? CATEGORY_ALIASES[normalized] || normalized : normalized;
}

function normalizeThemeId(id?: string) {
  const normalized = (id || "")
    .trim()
    .toLowerCase()
    .replace(/[_-](light|dark)$/, "");
  return normalized.replace(/\s+/g, "-");
}
