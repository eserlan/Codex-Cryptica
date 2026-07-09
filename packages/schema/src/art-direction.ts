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

export const GLOBAL_ART_DIRECTION_DEFAULT: ArtDirectionTemplate = {
  id: "global.codex-cryptica",
  label: "Codex Cryptica Default",
  source: "global-default",
  template:
    "{subject}, illustrated worldbuilding reference, grounded materials, readable forms, natural light, and enough concrete detail to support worldbuilding.",
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
      "{subject}, full-body character concept art with a clean readable silhouette, sharp focus on the full figure, clear face, visible hands, balanced anatomy, expressive stance, and body language that communicates role, status, temperament, and current intent. Give the figure distinctive clothing layers or signature attire, personal equipment, hand-held props or environmental contact points where useful, wearable technology or accessories where appropriate, and concrete material details such as seams, fasteners, surface finish, weathering, repairs, stains, and crafted ornament. Emphasize asymmetry, practical wear, facial expression, hand gesture, and how the surrounding environment or presentation lighting frames the character without overpowering them. Avoid name repetition, generic armor, vague heroic phrasing, stiff poses, and unreadable effects.",
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
      "{subject}, close-up detailed prop concept art on a plain unobtrusive presentation background, with a readable silhouette, clear scale cues, visible construction logic, functional seams, fasteners, contact points, and worn surfaces. Emphasize tactile material craftsmanship, age, repairs, inscriptions or symbols, use-specific details, and the physical consequences of repeated handling. Use sharp focus and concrete visual details; avoid floating UI effects, vague magic glow, and generic treasure styling.",
  },
  faction: {
    id: "category.faction",
    label: "Faction Default",
    source: "category-default",
    template:
      "{subject}, wide-angle eye-level faction concept art of the faction caught in a defining moment, with a cohesive group composition, clear visual anchor, clear hierarchy, readable insignia or subtle heraldry, synchronized movement, disciplined formation, mirrored functional arrangement, or controlled patrol halt, and distinct uniform language, regalia, restricted faction palette, banners, tools, weapons, or symbols. Show how the faction expresses authority, ideology, resources, social role, emotional character, and internal roles through posture, role-specific equipment, specialist visual cues, equipment readiness, faces or masks where appropriate, material quality, repeated motifs, environmental control, and background landscape or ambient color that stays secondary to the faction identity. Emphasize recognizable faction identity, grounded proportions, sharp focus on the group, tactile material contrast, cohesive silhouette, controlled palette hierarchy, readable faction marks on practical gear or regalia, natural or crafted material weight, rhythmic group spacing, organized visual rhythm, and environmental storytelling; avoid random crowds, generic soldiers, oversized logos, superhero posing, excessive holograms, neon clutter, ornate generic armor, modern gear unless setting-appropriate, and unreadable background clutter.",
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
      "{subject}, atmospheric world cover art with a strong focal point, genre-defining setting details, layered depth, and room for title treatment.",
  },
};

const fantasy: ArtDirectionTemplate = {
  id: "theme.fantasy",
  label: "Fantasy Default",
  source: "theme-default",
  template:
    "{subject}. Oil painting style, painterly brushwork, handcrafted materials (worn leather, hammered iron, stained wood, candle-soot stone), warm earth palette of ochre, umber, and tarnished gold, occasional cool shadow, subtle magical detail rather than overt VFX, lighting that suits the scene.",
};

const scifi: ArtDirectionTemplate = {
  id: "theme.scifi",
  label: "Sci-Fi Default",
  source: "theme-default",
  template:
    "{subject}. Digital concept art style, matte painting, engineered materials (brushed chrome, carbon fiber, matte polymer), clean slate-grey and cool white palette with cyan accents, even practical or soft ambient lighting, frontier scale.",
};

const cyberpunk: ArtDirectionTemplate = {
  id: "theme.cyberpunk",
  label: "Cyberpunk Default",
  source: "theme-default",
  template:
    "{subject}. Cyberpunk digital concept art style, dense signage, layered technology, hard shadows, high-contrast neon palette with hot pink and electric blue accents, urban surfaces and environmental texture that suit the scene.",
};

const modern: ArtDirectionTemplate = {
  id: "theme.modern",
  label: "Modern Default",
  source: "theme-default",
  template:
    "{subject}. Photographic, 35mm film grain, available light, muted contemporary palette of asphalt grey, denim, and warm skin tones, restrained color grading, documentary framing, no fantasy ornamentation.",
};

const apocalyptic: ArtDirectionTemplate = {
  id: "theme.apocalyptic",
  label: "Post-Apocalyptic Default",
  source: "theme-default",
  template:
    "{subject}. Desaturated digital illustration, weathered and scavenged materials, harsh daylight with long shadows, gritty palette of rust, bone, dried blood, and dust.",
};

const horror: ArtDirectionTemplate = {
  id: "theme.horror",
  label: "Horror Default",
  source: "theme-default",
  template:
    "{subject}. Tenebrist oil painting or desaturated photograph, chiaroscuro lighting from a single practical source where the scene allows, palette of bone, ash, dried blood, and bruise purple, ornate decay and texture detail, controlled dread rather than gore.",
};

const steampunk: ArtDirectionTemplate = {
  id: "theme.steampunk",
  label: "Steampunk Default",
  source: "theme-default",
  template:
    "{subject}. Gouache painting style, brass-and-iron visible mechanisms, steam, leather, polished gauges, warm amber and sepia palette, dramatic industrial lighting.",
};

const mythic: ArtDirectionTemplate = {
  id: "theme.mythic",
  label: "Mythic Default",
  source: "theme-default",
  template:
    "{subject}. Tempera illustration style, monumental scale, symbolic composition, luminous ambient glow, palette of cerulean, gold leaf, and ivory, ancient ceremonial detail.",
};

const pulp_adventure: ArtDirectionTemplate = {
  id: "theme.pulp_adventure",
  label: "Pulp Adventure Default",
  source: "theme-default",
  template:
    "{subject}. Screen print style, bold ink lines, dynamic composition, practical danger, saturated palette of primary reds and yellows with high-contrast shadows, crisp readable action.",
};

const fallout: ArtDirectionTemplate = {
  id: "theme.fallout",
  label: "Fallout Default",
  source: "theme-default",
  template:
    "{subject}. 1950s Americana illustration style crossed with post-war ruin, palette of vault blue, rust, bone, and dust, atomic-age industrial design with retro-futurist optimism decayed by time.",
};

const starwars: ArtDirectionTemplate = {
  id: "theme.starwars",
  label: "Star Wars Default",
  source: "theme-default",
  template:
    "{subject}. Ralph McQuarrie-era concept painting style, lived-in tactile technology with visible wear, dusty desert ochre or cold imperial monochrome depending on the scene, dramatic rim lighting, practical-effects sensibility.",
};

const startrek: ArtDirectionTemplate = {
  id: "theme.startrek",
  label: "Star Trek Default",
  source: "theme-default",
  template:
    "{subject}. Clean 1990s sci-fi production illustration style, smooth surfaces and primary-coded technology (red, blue, gold), even practical lighting, optimistic palette, no grime, engineered rather than salvaged.",
};

const lancer: ArtDirectionTemplate = {
  id: "theme.lancer",
  label: "Lancer Default",
  source: "theme-default",
  template:
    "{subject}. Military concept art style, industrial mech and hardware design with worn panel texture and hazard markings, palette of Union blue, gunmetal grey, and safety orange, compact tactical schematic aesthetic, frontier mud-and-lasers world-building, functional over decorative.",
};

export const THEME_ART_DIRECTION_DEFAULTS: Record<
  string,
  ArtDirectionTemplate
> = {
  fantasy: {
    id: "theme.fantasy",
    label: "Fantasy Default",
    source: "theme-default",
    template: fantasy.template,
  },
  scifi: {
    id: "theme.scifi",
    label: "Sci-Fi Default",
    source: "theme-default",
    template: scifi.template,
  },
  cyberpunk: {
    id: "theme.cyberpunk",
    label: "Cyberpunk Default",
    source: "theme-default",
    template: cyberpunk.template,
  },
  modern: {
    id: "theme.modern",
    label: "Modern Default",
    source: "theme-default",
    template: modern.template,
  },
  apocalyptic: {
    id: "theme.apocalyptic",
    label: "Post-Apocalyptic Default",
    source: "theme-default",
    template: apocalyptic.template,
  },
  "post-apocalyptic": {
    id: "theme.post-apocalyptic",
    label: "Post-Apocalyptic Default",
    source: "theme-default",
    template: apocalyptic.template,
  },
  post_apocalyptic: {
    id: "theme.post_apocalyptic",
    label: "Post-Apocalyptic Default",
    source: "theme-default",
    template: apocalyptic.template,
  },
  horror: {
    id: "theme.horror",
    label: "Horror Default",
    source: "theme-default",
    template: horror.template,
  },
  "gothic-horror": {
    id: "theme.gothic-horror",
    label: "Gothic Horror Default",
    source: "theme-default",
    template: horror.template,
  },
  gothic_horror: {
    id: "theme.gothic_horror",
    label: "Gothic Horror Default",
    source: "theme-default",
    template: horror.template,
  },
  steampunk: {
    id: "theme.steampunk",
    label: "Steampunk Default",
    source: "theme-default",
    template: steampunk.template,
  },
  mythic: {
    id: "theme.mythic",
    label: "Mythic Default",
    source: "theme-default",
    template: mythic.template,
  },
  pulp_adventure: {
    id: "theme.pulp_adventure",
    label: "Pulp Adventure Default",
    source: "theme-default",
    template: pulp_adventure.template,
  },
  "pulp-adventure": {
    id: "theme.pulp-adventure",
    label: "Pulp Adventure Default",
    source: "theme-default",
    template: pulp_adventure.template,
  },
  fallout: {
    id: "theme.fallout",
    label: "Fallout Default",
    source: "theme-default",
    template: fallout.template,
  },
  starwars: {
    id: "theme.starwars",
    label: "Star Wars Default",
    source: "theme-default",
    template: starwars.template,
  },
  startrek: {
    id: "theme.startrek",
    label: "Star Trek Default",
    source: "theme-default",
    template: startrek.template,
  },
  lancer: {
    id: "theme.lancer",
    label: "Lancer Default",
    source: "theme-default",
    template: lancer.template,
  },
};

export const FACTION_THEME_TEMPLATES: Record<string, string> = {
  fantasy:
    "{subject}, a faction shown in a defining moment — taking tribute, blessing soldiers before battle, marching under heraldic banners, or guarding a sacred site — members in distinctive armour, livery, tabards, or vestments, heraldic symbols and battle standards prominent, composition that reveals their power, ideology, and social role",
  scifi:
    "{subject}, a faction shown in a defining moment — inspecting contested cargo, patrolling a station perimeter, broadcasting a manifesto, or claiming a new installation — members in uniform with faction insignia and ship markings, environment communicating their territory and ideology, composition that reveals their reach and methods",
  cyberpunk:
    "{subject}, a faction shown in a defining moment — controlling a block, shaking down rivals, broadcasting propaganda, or jacking into secured systems — members with faction implants, gang tags, and neon colours, urban environment showing their grip on the city, composition that reveals their ruthlessness and style",
  apocalyptic:
    "{subject}, a faction shown in a defining moment — guarding a water source, raiding a supply convoy, distributing salvage to followers, or holding a fortified ruin — members in scavenged armour painted with faction markings, wasteland environment, composition that reveals their survival strategy and authority",
  horror:
    "{subject}, a faction shown in a defining moment — conducting a ritual, hunting prey in shadow, inducting a new member, or convening in secret — members in cult regalia, ceremonial dress, or aristocratic decay, faction symbols and sacred objects prominent, composition that reveals their agenda and what they are willing to do",
  fallout:
    "{subject}, a faction shown in a defining moment — issuing rations, enforcing doctrine in a settlement, scavenging pre-war technology, or holding a vault checkpoint — members in faction jumpsuits, power armour, or scavenged gear with painted insignia, retro-futurist wasteland environment, composition that reveals their ideology and claim to order",
  starwars:
    "{subject}, a faction shown in a defining moment — assembling forces, accepting a surrender, guarding a sacred site, or conducting a diplomatic exchange — members in faction uniforms, armour, or robes with clear allegiance markings, capital ships or iconic architecture establishing scale, composition that conveys their place in the galactic order",
  startrek:
    "{subject}, a faction shown in a defining moment — negotiating a treaty, conducting a joint survey, commanding a vessel during crisis, or establishing first contact — members with clear rank and division markings, starship or station environment, composition that reveals their values, methods, and place in the interstellar community",
  lancer:
    "{subject}, a faction shown in a defining moment — deploying mechs for a theatre operation, issuing mission orders, holding contested ground, or processing field intelligence — members in tactical uniform or mech pilot suits with faction insignia, military hardware and operational banners visible, composition that reveals their command structure and combat doctrine",
  modern:
    "{subject}, a faction shown in a defining moment — holding a press conference, coordinating a field operation, making an arrest, or rallying supporters — members in contemporary uniform, suit, or civilian dress with faction identifiers, real-world institutional setting, composition that reveals their social function and source of power",
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
