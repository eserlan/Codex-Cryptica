/**
 * Art Direction v2 — category and theme catalogue.
 *
 * Categories own framing, composition, and silhouette readability. Themes own
 * medium, palette, lighting logic, and material language. The two are kept
 * independent so any category can be rendered in any theme.
 */

import { CATEGORY_NEGATIVE_PROMPTS } from "./art-direction-negatives";
import type { OpticsPreset } from "./art-direction-optics";

export interface ArtCategory {
  id: string;
  label: string;
  /** Framing and composition direction. Never contains medium or palette. */
  prompt: string;
  defaultCamera: OpticsPreset;
  /** Named alternative framings, e.g. `portrait` for characters. */
  variants?: Record<string, OpticsPreset>;
  /** Category-specific failure modes, merged with the general block. */
  negativePrompt: readonly string[];
}

export interface ArtTheme {
  id: string;
  label: string;
  aliases?: string[];
  /** Medium, palette, lighting logic, and material language. */
  prompt: string;
  /** Optional theme-level camera bias applied when the category allows it. */
  defaultCamera?: Partial<OpticsPreset>;
  /** Named style lineage. At most two are ever emitted at compose time. */
  styleReferences?: string[];
  /** Reviewed replacement used when named references are disabled. */
  nameFreeFallback: string;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const ART_CATEGORIES: Record<string, ArtCategory> = {
  character: {
    id: "category.character",
    label: "Character",
    prompt:
      "full-body character concept art with a clean readable silhouette, clear face and visible hands, balanced anatomy, and an expressive stance whose gesture communicates role, status, and current intent. Layered clothing with costume asymmetry, signature equipment, and practical wear — repairs, seams, fasteners, stains, crafted ornament, and honest material detail. The environment and presentation lighting frame the figure without competing with it.",
    defaultCamera: {
      id: "optics.character.default",
      shotSize: "full",
      focalLength: "85mm",
      aperture: "f/4",
      angle: "eye-level",
      composition:
        "three-quarter turn, background legible but subordinate to the figure",
    },
    variants: {
      portrait: {
        id: "optics.character.portrait",
        shotSize: "medium-close",
        focalLength: "105mm",
        aperture: "f/1.8",
        angle: "eye-level",
        lighting: "rembrandt",
        composition: "shallow background falloff",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.character,
  },

  creature: {
    id: "category.creature",
    label: "Creature",
    prompt:
      "creature concept art built on functional anatomy, with scale cues read against a known object, distinctive hide, pelt, shell, or feather texture, and habitat evidence at ground level. Show visible weight and ground contact, and hold a pose that reads as movement, threat, wariness, or display rather than a presentation stance.",
    defaultCamera: {
      id: "optics.creature.default",
      shotSize: "full",
      focalLength: "50mm",
      aperture: "f/5.6",
      angle: "low",
      composition: "negative space around the silhouette",
    },
    variants: {
      anatomy: {
        id: "optics.creature.anatomy",
        shotSize: "insert",
        focalLength: "100mm-macro",
        aperture: "f/8",
        angle: "eye-level",
        composition:
          "inset study of one defining head, limb, hide, or anatomical feature",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.creature,
  },

  location: {
    id: "category.location",
    label: "Location",
    prompt:
      "establishing environment art layered into distinct foreground, midground, and background. Architecture or landforms imply their builders, inhabitants, use, history, and materials. Weather and atmosphere carry the depth, lighting states the mood and hour, and the composition offers a clear visual path into the scene.",
    defaultCamera: {
      id: "optics.location.default",
      shotSize: "extreme-wide",
      focalLength: "24mm",
      aperture: "f/11",
      angle: "eye-level",
      composition: "horizon on a third, one human-scale element for reference",
    },
    variants: {
      interior: {
        id: "optics.location.interior",
        shotSize: "wide",
        focalLength: "20mm",
        aperture: "f/8",
        angle: "eye-level",
        lighting: "motivated-practical",
        composition: "corner-of-room vantage",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.location,
  },

  item: {
    id: "category.item",
    label: "Item",
    prompt:
      "close-up prop concept art on an unobtrusive presentation surface, with a readable silhouette, clear scale, and visible construction logic — seams, fasteners, contact points, maker marks, and inscriptions. Surfaces carry the consequences of use: wear, repairs, handling polish, chipped edges, and tarnish.",
    defaultCamera: {
      id: "optics.item.default",
      shotSize: "close",
      focalLength: "100mm-macro",
      aperture: "f/8",
      angle: "high",
      lighting: "overcast-softbox",
      composition:
        "three-quarter overhead view, raking secondary light, seamless neutral backdrop",
    },
    variants: {
      "in-hand": {
        id: "optics.item.in-hand",
        shotSize: "medium-close",
        focalLength: "50mm",
        aperture: "f/2.8",
        angle: "eye-level",
        composition: "partially visible hand for scale",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.item,
  },

  faction: {
    id: "category.faction",
    label: "Faction",
    prompt:
      "wide faction concept art showing the group in a defining moment rather than a lineup. One figure anchors the composition, hierarchy is legible, heraldry is restrained, and motifs repeat across role-specific equipment and specialist cues. Spacing is intentional, the faction palette is restricted, and the group's ideology, resources, and social role are visible in what they are doing and what they control.",
    defaultCamera: {
      id: "optics.faction.default",
      shotSize: "wide",
      focalLength: "35mm",
      aperture: "f/5.6",
      angle: "eye-level",
      composition:
        "group filling the lower two-thirds, one figure closer to camera to anchor depth",
    },
    variants: {
      authority: {
        id: "optics.faction.authority",
        shotSize: "wide",
        focalLength: "24mm",
        aperture: "f/5.6",
        angle: "low",
        composition: "looking up at the group to establish dominance",
      },
      ranks: {
        id: "optics.faction.ranks",
        shotSize: "medium-full",
        focalLength: "135mm",
        aperture: "f/5.6",
        angle: "eye-level",
        composition:
          "compressed telephoto perspective stacking dense, oppressive ranks",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.faction,
  },

  event: {
    id: "category.event",
    label: "Event",
    prompt:
      "a dramatic scene at the decisive instant, with legible participants and stakes established by the environment. Motion is directional, cause and effect are visible, and the moment leaves physical consequences — debris, smoke, spills, changed light, displaced bodies, structural damage. Photojournalistic rather than staged.",
    defaultCamera: {
      id: "optics.event.default",
      shotSize: "wide",
      focalLength: "35mm",
      aperture: "f/2.8",
      angle: "low",
      composition:
        "focal action sharp, subtle motion blur on secondary elements",
    },
    variants: {
      aftermath: {
        id: "optics.event.aftermath",
        shotSize: "wide",
        focalLength: "50mm",
        aperture: "f/5.6",
        angle: "eye-level",
        composition:
          "static framing, no motion blur, silence in the composition",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.event,
  },

  note: {
    id: "category.note",
    label: "Note / Lore",
    prompt:
      "an evocative worldbuilding illustration organised around one central idea, with readable symbols and supporting setting detail. A primary element carries the meaning, a secondary element supports it, and the hierarchy reads like a page margin — ordered, deliberate, uncluttered.",
    defaultCamera: {
      id: "optics.note.default",
      shotSize: "medium",
      focalLength: "50mm",
      aperture: "f/8",
      angle: "high",
      lighting: "overcast-softbox",
      composition: "flat-on or overhead view, shallow stage depth",
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.note,
  },

  cover: {
    id: "category.cover",
    label: "World Cover",
    prompt:
      "atmospheric cover art with one dominant focal point, genre-defining setting detail, and strong depth layering. The upper third is held as deliberate negative space for a title treatment, and the focal point sits clear of it.",
    defaultCamera: {
      id: "optics.cover.default",
      shotSize: "wide",
      focalLength: "28mm",
      aperture: "f/8",
      angle: "eye-level",
      lighting: "rim",
      aspectRatio: "2:3",
      composition: "low horizon, backlit hero silhouette, quiet upper third",
    },
    variants: {
      "portrait-4-5": {
        id: "optics.cover.portrait-4-5",
        shotSize: "wide",
        focalLength: "28mm",
        aperture: "f/8",
        angle: "eye-level",
        lighting: "rim",
        aspectRatio: "4:5",
        composition: "low horizon, backlit hero silhouette, quiet upper third",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.cover,
  },
};

/** Entity types and command hints that map onto a catalogue category. */
export const CATEGORY_ALIASES: Record<string, string> = {
  npc: "character",
  person: "character",
  place: "location",
  region: "location",
  object: "item",
  artifact: "item",
  concept: "note",
  lore: "note",
  world: "cover",
};

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export const ART_THEMES: Record<string, ArtTheme> = {
  fantasy: {
    id: "theme.fantasy",
    label: "Fantasy",
    prompt:
      "painterly oil rendering with visible brushwork. Handcrafted materials — worn leather, hammered iron, stained wood, candle-soot stone. Warm earth palette of ochre, umber, and tarnished gold with occasional cool shadow. Natural or firelit key. Magic reads as subtle material detail, not overt effects.",
    styleReferences: ["nineteenth-century romantic oil painting"],
    nameFreeFallback:
      "traditional oil painting on canvas, layered glazes, warm varnished tone",
  },

  scifi: {
    id: "theme.scifi",
    label: "Sci-Fi",
    aliases: ["sci-fi", "sci_fi", "science-fiction"],
    prompt:
      "matte-painted industrial-design realism. Engineered surfaces — brushed chrome, carbon fibre, matte polymer, machined panel gaps. Slate grey and cool white palette with cyan accents. Practical ambient light from panels and fixtures inside the scene. Frontier scale.",
    styleReferences: ["1970s hard science fiction production design"],
    nameFreeFallback:
      "clean industrial-design matte painting, engineered surfaces, even practical lighting",
  },

  cyberpunk: {
    id: "theme.cyberpunk",
    label: "Cyberpunk",
    prompt:
      "dense signage and retrofitted technology layered over older infrastructure. Wet surfaces returning the light. Night palette of hot pink, electric blue, and sodium orange with visible halation around sources. Hard shadows between bright zones.",
    defaultCamera: { lensCharacter: ["halation"] },
    styleReferences: ["1980s neo-noir cyberpunk cinema"],
    nameFreeFallback:
      "rain-slick neon night city rendering, dense signage, sodium and cyan halation",
  },

  modern: {
    id: "theme.modern",
    label: "Modern",
    prompt:
      "documentary 35mm photography under available light. Restrained colour grading, muted contemporary palette of asphalt grey, denim, and warm skin tones. No ornamentation, no retouching, no fantasy embellishment.",
    defaultCamera: { focalLength: "35mm", filmStock: "portra-400" },
    styleReferences: ["street documentary photography"],
    nameFreeFallback:
      "available-light documentary photograph, 35mm film grain, restrained grading",
  },

  apocalyptic: {
    id: "theme.apocalyptic",
    label: "Post-Apocalyptic",
    aliases: ["post-apocalyptic", "post_apocalyptic"],
    prompt:
      "scavenged repairs over pre-collapse material — mismatched panels, wire binding, patched fabric. Palette of rust, bone, and dust. Harsh directional daylight with suspended dust in the air and long shadows.",
    styleReferences: ["desert wasteland survival cinema"],
    nameFreeFallback:
      "desaturated wasteland illustration, scavenged repairs, harsh dusty daylight",
  },

  horror: {
    id: "theme.horror",
    label: "Horror",
    aliases: ["gothic-horror", "gothic_horror"],
    prompt:
      "tenebrism — a single practical source carving the subject out of unresolved darkness. Palette of bone, ash, dried blood, and bruise purple. Ornate decay and texture detail. Controlled dread rather than gore; what is withheld does the work.",
    defaultCamera: { lighting: "chiaroscuro" },
    styleReferences: ["baroque tenebrist painting"],
    nameFreeFallback:
      "tenebrist painting, single practical light source, deep unresolved shadow",
  },

  steampunk: {
    id: "theme.steampunk",
    label: "Steampunk",
    prompt:
      "gouache rendering with flat opaque colour. Exposed brass-and-iron mechanisms, steam, riveted plate, leather strapping, and polished gauges. Warm amber and sepia palette. Industrial forge light from below or behind.",
    styleReferences: ["Victorian industrial engraving"],
    nameFreeFallback:
      "gouache illustration, exposed brass mechanisms, warm amber forge light",
  },

  mythic: {
    id: "theme.mythic",
    label: "Mythic",
    prompt:
      "tempera illustration with symbolic frontal composition and hierarchical scale — importance sets size, not perspective. Palette of gold, cerulean, and ivory. Source-less ambient glow. Ancient ceremonial detail.",
    styleReferences: ["Byzantine panel icon"],
    nameFreeFallback:
      "egg tempera panel, gold ground, frontal symbolic composition, source-less glow",
  },

  pulp_adventure: {
    id: "theme.pulp_adventure",
    label: "Pulp Adventure",
    aliases: ["pulp-adventure", "pulp"],
    prompt:
      "screen-print linework with bold ink contours and limited flat colour. Diagonal action composition, practical danger, saturated reds and yellows, hard black shadows with no midtone.",
    styleReferences: ["mid-century pulp magazine cover"],
    nameFreeFallback:
      "screen-print poster, bold ink linework, saturated flat colour, hard black shadows",
  },

  fallout: {
    id: "theme.fallout",
    label: "Fallout",
    prompt:
      "1950s Americana illustration crossed with ruin — atomic-age optimism decayed by time. Palette of vault blue, rust, bone, and dust. Retro-futurist industrial design, cheerful signage weathered past legibility.",
    styleReferences: ["1950s advertising illustration"],
    nameFreeFallback:
      "mid-century American advertising illustration weathered by decades of ruin",
  },

  starwars: {
    id: "theme.starwars",
    label: "Star Wars",
    aliases: ["star-wars", "star_wars"],
    prompt:
      "lived-in practical-effects technology with carbon scoring, patches, and mismatched repairs. Desert ochre or cold imperial monochrome depending on the scene. Dramatic rim lighting. Everything looks used and maintained rather than new.",
    styleReferences: ["1970s space opera production painting"],
    nameFreeFallback:
      "lived-in practical-effects concept painting, carbon-scored hardware, dramatic rim light",
  },

  startrek: {
    id: "theme.startrek",
    label: "Star Trek",
    aliases: ["star-trek", "star_trek"],
    prompt:
      "clean 1990s production illustration. Smooth engineered surfaces, red, blue, and gold role coding, even practical lighting, optimistic palette. Grime-free and manufactured rather than salvaged.",
    styleReferences: ["1990s television production illustration"],
    nameFreeFallback:
      "clean production illustration, smooth engineered surfaces, even practical lighting",
  },

  lancer: {
    id: "theme.lancer",
    label: "Lancer",
    prompt:
      "military schematic concept art. Worn armour panels, stencil markings, hazard striping, and visible actuators. Palette of Union blue, gunmetal grey, and safety orange. Mech and hardware design is functional over decorative; every surface has a job.",
    styleReferences: ["military technical manual illustration"],
    nameFreeFallback:
      "military technical illustration, stencilled worn panels, functional hardware design",
  },
};

/** Alias → canonical theme id, derived from the catalogue so it cannot drift. */
export const THEME_ALIASES: Record<string, string> = Object.entries(
  ART_THEMES,
).reduce<Record<string, string>>((aliases, [canonicalId, theme]) => {
  for (const alias of theme.aliases || []) {
    aliases[alias] = canonicalId;
  }
  return aliases;
}, {});

// ---------------------------------------------------------------------------
// Faction defining-moment blueprints
// ---------------------------------------------------------------------------

/**
 * Per-theme examples of what a faction might be *doing*, and which visual
 * signals establish ideology, territory, hierarchy, function, and authority.
 * Used as scaffolding for subject generation, never as a fixed scene.
 */
export interface FactionBlueprint {
  /** Candidate defining moments. One is chosen or adapted, not all applied. */
  moments: string[];
  /** Visual signals that make the faction legible as an organisation. */
  signals: string;
}

export const FACTION_BLUEPRINTS: Record<string, FactionBlueprint> = {
  fantasy: {
    moments: [
      "taking tribute at a village gate",
      "blessing soldiers before a battle",
      "marching beneath heraldic banners",
      "holding a cordon around a sacred site",
    ],
    signals:
      "distinctive armour, livery, tabards, or vestments; heraldic symbols and battle standards; rank shown through material quality rather than ornament",
  },
  scifi: {
    moments: [
      "inspecting contested cargo on a dock",
      "patrolling a station perimeter",
      "broadcasting a manifesto from a commandeered relay",
      "claiming a newly landed installation",
    ],
    signals:
      "uniform insignia and hull markings repeated across equipment; environment establishing territory and reach; role coding by suit configuration",
  },
  cyberpunk: {
    moments: [
      "holding a block against a rival crew",
      "shaking down a storefront",
      "cutting into a secured system from the street",
      "overwriting a rival's propaganda feed",
    ],
    signals:
      "matched implants and shared chrome vocabulary, gang tags repeated on jackets and walls, faction colour surviving under neon, hierarchy shown by who is watching versus who is working",
  },
  apocalyptic: {
    moments: [
      "guarding a working water source",
      "raiding a stalled supply convoy",
      "distributing salvage to dependants",
      "holding a fortified ruin at dusk",
    ],
    signals:
      "scavenged armour painted with a shared marking, standardised repairs across mismatched gear, control of a resource visible in frame",
  },
  horror: {
    moments: [
      "conducting a rite by a single lamp",
      "hunting through a shuttered street",
      "inducting a new member",
      "convening where they should not be",
    ],
    signals:
      "cult regalia, ceremonial dress, or aristocratic decay; sacred objects handled with practised familiarity; hierarchy shown by who stands closest to the centre",
  },
  fallout: {
    moments: [
      "issuing rations from a converted checkpoint",
      "enforcing doctrine in a settlement square",
      "stripping pre-war technology for parts",
      "holding a vault door",
    ],
    signals:
      "faction jumpsuits, power armour, or scavenged gear carrying painted insignia; retro-futurist infrastructure repurposed; claim to order shown through signage and procedure",
  },
  starwars: {
    moments: [
      "assembling forces on a landing field",
      "accepting a surrender",
      "guarding a site of significance",
      "conducting a tense diplomatic exchange",
    ],
    signals:
      "uniforms, armour, or robes with unambiguous allegiance markings; capital ships or iconic architecture establishing scale; rank shown by position in formation",
  },
  startrek: {
    moments: [
      "negotiating a treaty across a table",
      "conducting a joint survey",
      "commanding a vessel during a crisis",
      "making first contact",
    ],
    signals:
      "clear rank and division colour coding; starship or station interior; values shown through posture and procedure rather than weapons",
  },
  lancer: {
    moments: [
      "deploying mechs for a theatre operation",
      "issuing mission orders over a field table",
      "holding contested ground between actions",
      "processing field intelligence under canvas",
    ],
    signals:
      "tactical uniforms or pilot suits with unit insignia, stencilled hardware and operational banners, command structure shown by who briefs and who listens",
  },
  modern: {
    moments: [
      "holding a press conference",
      "coordinating a field operation from a vehicle",
      "making an arrest",
      "rallying supporters",
    ],
    signals:
      "contemporary uniform, suit, or civilian dress with faction identifiers; real-world institutional setting; authority shown through access and equipment",
  },
  steampunk: {
    moments: [
      "commissioning a new engine on the factory floor",
      "presenting findings to a chartered society",
      "seizing a rival's workshop",
      "inspecting a pressurised line before a run",
    ],
    signals:
      "guild badges and chartered livery, role shown by tool belts and protective gear, ownership shown by whose name is cast into the machinery",
  },
  mythic: {
    moments: [
      "processing toward a threshold",
      "passing judgement from a raised seat",
      "receiving an offering",
      "sealing a covenant",
    ],
    signals:
      "ceremonial vestments in hierarchical scale, repeated symbolic attributes, authority shown by height and centrality in the composition",
  },
  pulp_adventure: {
    moments: [
      "breaking into a guarded vault",
      "facing down a rival expedition",
      "loading a seaplane in haste",
      "holding a rope bridge against pursuit",
    ],
    signals:
      "matched field kit with personal variation, an emblem stencilled on crates and vehicles, hierarchy shown by who gives the order mid-action",
  },
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

function normalizeId(id?: string): string {
  return (id || "").trim().toLowerCase().replace(/\s+/g, "-");
}

/** Resolves an entity type or command hint to a catalogue category id. */
export function resolveCategoryId(
  id?: string,
  options: { applyAliases?: boolean } = {},
): string | undefined {
  const normalized = normalizeId(id);
  if (!normalized) return undefined;
  if (ART_CATEGORIES[normalized]) return normalized;
  if (options.applyAliases !== false) {
    const aliased = CATEGORY_ALIASES[normalized];
    if (aliased && ART_CATEGORIES[aliased]) return aliased;
  }
  return undefined;
}

/**
 * Resolves a theme id, tolerating aliases and the `_light` / `-dark` suffixes
 * the UI theme ids carry.
 */
export function resolveThemeId(id?: string): string | undefined {
  const stripped = (id || "")
    .trim()
    .toLowerCase()
    .replace(/[_-](light|dark)$/, "")
    .replace(/\s+/g, "-");
  if (!stripped) return undefined;
  if (ART_THEMES[stripped]) return stripped;
  const aliased = THEME_ALIASES[stripped];
  if (aliased && ART_THEMES[aliased]) return aliased;
  // Alias tables are keyed by hyphenated ids; underscore variants also occur.
  const underscored = stripped.replace(/-/g, "_");
  if (ART_THEMES[underscored]) return underscored;
  return THEME_ALIASES[underscored];
}

export function getCategory(id?: string): ArtCategory | undefined {
  const resolved = resolveCategoryId(id);
  return resolved ? ART_CATEGORIES[resolved] : undefined;
}

export function getTheme(id?: string): ArtTheme | undefined {
  const resolved = resolveThemeId(id);
  return resolved ? ART_THEMES[resolved] : undefined;
}

export function getFactionBlueprint(
  themeId?: string,
): FactionBlueprint | undefined {
  const resolved = resolveThemeId(themeId);
  return resolved ? FACTION_BLUEPRINTS[resolved] : undefined;
}
