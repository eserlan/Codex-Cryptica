export type ArtDirectionSource =
  | "entity-context"
  | "user-authored-context"
  | "category-default"
  | "theme-default"
  | "global-default";

export type DrawSurface =
  | "command"
  | "entity"
  | "zen"
  | "graph"
  | "cover"
  | "chat";

export interface DrawRequestContext {
  subject: string;
  entityId?: string;
  entityTitle?: string;
  categoryId?: string;
  categoryLabel?: string;
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

const MAX_CONTEXT_TEMPLATE_LENGTH = 1200;

export const GLOBAL_ART_DIRECTION_DEFAULT: ArtDirectionTemplate = {
  id: "global.codex-cryptica",
  label: "Codex Cryptica Default",
  source: "global-default",
  template:
    "{subject}, a clear fantasy tabletop reference illustration with readable forms, grounded materials, cinematic lighting, and enough concrete detail to support worldbuilding.",
};

export const CATEGORY_ART_DIRECTION_DEFAULTS: Record<
  string,
  ArtDirectionTemplate
> = {
  character: {
    id: "category.character",
    label: "Character Default",
    source: "category-default",
    template:
      "{subject}, full character concept art with readable silhouette, expressive pose, distinctive clothing, equipment, and clear face and body language.",
  },
  creature: {
    id: "category.creature",
    label: "Creature Default",
    source: "category-default",
    template:
      "{subject}, creature design sheet with strong anatomy, scale cues, distinctive texture, habitat hints, and a pose that shows movement and threat.",
  },
  location: {
    id: "category.location",
    label: "Location Default",
    source: "category-default",
    template:
      "{subject}, establishing environment art with atmosphere, architecture or landscape detail, lighting that reveals the mood, and a strong sense of place.",
  },
  item: {
    id: "category.item",
    label: "Item Default",
    source: "category-default",
    template:
      "{subject}, detailed prop design on a simple presentation background, emphasizing materials, craftsmanship, wear, symbols, and readable silhouette.",
  },
  faction: {
    id: "category.faction",
    label: "Faction Default",
    source: "category-default",
    template:
      "{subject}, faction visual identity with banners, colors, uniforms or regalia, symbolic motifs, and an organized group composition.",
  },
  event: {
    id: "category.event",
    label: "Event Default",
    source: "category-default",
    template:
      "{subject}, dramatic scene illustration capturing the key moment, participants, environment, stakes, motion, and memorable visual consequences.",
  },
  note: {
    id: "category.note",
    label: "Note Default",
    source: "category-default",
    template:
      "{subject}, evocative worldbuilding illustration focused on the central idea, with readable symbols, setting details, and clear visual hierarchy.",
  },
  cover: {
    id: "category.cover",
    label: "World Cover Default",
    source: "category-default",
    template:
      "{subject}, atmospheric world cover art with a strong focal point, genre-defining setting details, cinematic depth, and room for title treatment.",
  },
};

export const THEME_ART_DIRECTION_DEFAULTS: Record<string, ArtDirectionTemplate> =
  {
    fantasy: {
      id: "theme.fantasy",
      label: "Fantasy Default",
      source: "theme-default",
      template:
        "{subject}, painterly high-fantasy art with ancient textures, candlelit warmth, mythic atmosphere, handcrafted materials, and subtle magic.",
    },
    scifi: {
      id: "theme.scifi",
      label: "Sci-Fi Default",
      source: "theme-default",
      template:
        "{subject}, clean science-fiction concept art with advanced interfaces, engineered materials, controlled lighting, and frontier scale.",
    },
    cyberpunk: {
      id: "theme.cyberpunk",
      label: "Cyberpunk Default",
      source: "theme-default",
      template:
        "{subject}, neon urban concept art with wet streets, dense signage, layered technology, hard shadows, and high-contrast color accents.",
    },
    modern: {
      id: "theme.modern",
      label: "Modern Default",
      source: "theme-default",
      template:
        "{subject}, grounded modern cinematic illustration with natural materials, believable lighting, documentary detail, and restrained color.",
    },
    post_apocalyptic: {
      id: "theme.post_apocalyptic",
      label: "Post-Apocalyptic Default",
      source: "theme-default",
      template:
        "{subject}, weathered post-apocalyptic concept art with scavenged materials, harsh daylight, survival details, and environmental decay.",
    },
    "post-apocalyptic": {
      id: "theme.post-apocalyptic",
      label: "Post-Apocalyptic Default",
      source: "theme-default",
      template:
        "{subject}, weathered post-apocalyptic concept art with scavenged materials, harsh daylight, survival details, and environmental decay.",
    },
    gothic_horror: {
      id: "theme.gothic_horror",
      label: "Gothic Horror Default",
      source: "theme-default",
      template:
        "{subject}, gothic horror illustration with oppressive architecture, dim candlelight, heavy atmosphere, ornate decay, and controlled dread.",
    },
    "gothic-horror": {
      id: "theme.gothic-horror",
      label: "Gothic Horror Default",
      source: "theme-default",
      template:
        "{subject}, gothic horror illustration with oppressive architecture, dim candlelight, heavy atmosphere, ornate decay, and controlled dread.",
    },
    steampunk: {
      id: "theme.steampunk",
      label: "Steampunk Default",
      source: "theme-default",
      template:
        "{subject}, brass-and-iron adventure illustration with visible mechanisms, steam, leather, polished gauges, and warm industrial lighting.",
    },
    mythic: {
      id: "theme.mythic",
      label: "Mythic Default",
      source: "theme-default",
      template:
        "{subject}, mythic storybook illustration with monumental scale, symbolic composition, luminous atmosphere, and ancient ceremonial detail.",
    },
    pulp_adventure: {
      id: "theme.pulp_adventure",
      label: "Pulp Adventure Default",
      source: "theme-default",
      template:
        "{subject}, bold pulp-adventure illustration with dynamic composition, practical danger, saturated accents, and crisp readable action.",
    },
    "pulp-adventure": {
      id: "theme.pulp-adventure",
      label: "Pulp Adventure Default",
      source: "theme-default",
      template:
        "{subject}, bold pulp-adventure illustration with dynamic composition, practical danger, saturated accents, and crisp readable action.",
    },
  };

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

export function resolveArtDirection(
  context: DrawRequestContext,
): ResolvedArtDirection {
  const subject = normalizeRequiredSubject(context);
  const categoryId =
    normalizeCategoryId(
      context.surface === "cover" ? "cover" : context.categoryId,
    ) ||
    undefined;
  const themeId = normalizeId(context.themeId) || undefined;

  const candidates: ArtDirectionTemplate[] = [
    contextTemplate(
      "entity-context",
      "entity.context",
      "Entity Art Direction",
      context.entityArtDirection,
    ),
    contextTemplate(
      "user-authored-context",
      "user.context",
      "User Authored Art Direction",
      context.userAuthoredArtDirection,
    ),
    categoryId ? CATEGORY_ART_DIRECTION_DEFAULTS[categoryId] : undefined,
    themeId ? THEME_ART_DIRECTION_DEFAULTS[themeId] : undefined,
    GLOBAL_ART_DIRECTION_DEFAULT,
  ].filter((template): template is ArtDirectionTemplate =>
    Boolean(template && normalizeTemplate(template.template)),
  );

  const selected = candidates[0] || GLOBAL_ART_DIRECTION_DEFAULT;
  return {
    prompt: applySubject(selected.template, subject),
    source: selected.source,
    templateId: selected.id,
    subject,
    categoryId,
    themeId,
  };
}

export function getCategoryArtDirectionDefault(
  categoryId?: string,
): ArtDirectionTemplate | undefined {
  const normalized = normalizeCategoryId(categoryId);
  return normalized ? CATEGORY_ART_DIRECTION_DEFAULTS[normalized] : undefined;
}

export function getThemeArtDirectionDefault(
  themeId?: string,
): ArtDirectionTemplate | undefined {
  const normalized = normalizeId(themeId);
  return normalized ? THEME_ART_DIRECTION_DEFAULTS[normalized] : undefined;
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
  return (id || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function normalizeCategoryId(id?: string) {
  const normalized = normalizeId(id);
  return CATEGORY_ALIASES[normalized] || normalized;
}
