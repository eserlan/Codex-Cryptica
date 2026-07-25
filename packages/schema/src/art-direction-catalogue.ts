/**
 * Art Direction v2 — category and theme catalogue.
 *
 * Categories own framing and composition. Themes own medium, palette,
 * lighting, and material vocabulary. The two are kept independent so any
 * category can be rendered in any theme.
 *
 * Category prompts describe what a model can actually render. Brief language
 * written for a human concept artist — "implies its builders", "communicates
 * intent" — consumes attention without steering pixels and is kept out.
 */

import { CATEGORY_NEGATIVE_PROMPTS } from "./art-direction-negatives";
import type { OpticsPreset } from "./art-direction-optics";

/**
 * Which material vocabulary a category needs. A theme's handcrafted-goods
 * language ("worn leather, hammered iron") is correct for a figure or a prop
 * and actively wrong for a mountain range, so themes carry both and the
 * category selects.
 */
export type MaterialFocus = "craft" | "terrain" | "both" | "exalted";

export interface ArtCategory {
  id: string;
  label: string;
  /** Framing and composition direction. Never contains medium or palette. */
  prompt: string;
  /**
   * Used instead of `prompt` for an exalted stature, where the base prompt
   * asks for wear, repair, or decay. Only set where that conflict exists: a
   * positive "stains and repairs" cannot stand next to a negative "patched
   * cloth", and the positive layer is what the model actually renders.
   */
  exaltedPrompt?: string;
  defaultCamera: OpticsPreset;
  /** Named alternative framings, e.g. `portrait` for characters. */
  variants?: Record<string, OpticsPreset>;
  /** Category-specific failure modes, merged with the shared blocks. */
  negativePrompt: readonly string[];
  /** Selects the theme's craft and/or terrain material clause. */
  materialFocus: MaterialFocus;
  /** Whether a person or creature is normally in frame. Drives negatives. */
  includesFigures: boolean;
}

export interface ArtTheme {
  id: string;
  label: string;
  aliases?: string[];
  /** Rendering technique and medium. */
  medium: string;
  /** Colour palette. */
  palette: string;
  /** Lighting logic. */
  lighting: string;
  /** Materials of made things: clothing, equipment, props, vehicles. */
  craftMaterials: string;
  /** Materials of places: landform, architecture, surfaces at scale. */
  terrainMaterials: string;
  /**
   * Materials of things beyond mortal making, selected by an exalted stature.
   * Replaces the craft and terrain vocabularies rather than joining them.
   */
  exaltedMaterials: string;
  /**
   * Palette for an exalted stature. The ordinary palette names the same metals
   * the exalted materials do — "ochre, umber, and tarnished gold" over spun
   * gold and moonlit silver — which renders as one flat colour, and
   * "tarnished" argues with the register besides.
   */
  exaltedPalette: string;
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
      "full-body character concept art with a clean readable silhouette, clear face, visible hands, and an expressive stance with purposeful gesture. Layered clothing with costume asymmetry, signature equipment, and practical wear — repairs, seams, fasteners, stains, crafted ornament. Presentation lighting frames the figure without competing with it",
    exaltedPrompt:
      "full-body character concept art with a clean readable silhouette, clear face, visible hands, and a still, deliberate stance. Layered garments with costume asymmetry, signature equipment, and crafted ornament, everything unmarked and undamaged. Presentation lighting frames the figure without competing with it",
    defaultCamera: {
      id: "optics.character.default",
      shotSize: "full",
      focalLength: "85mm",
      aperture: "f/4",
      angle: "eye-level",
      aspectRatio: "2:3",
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
        aspectRatio: "4:5",
        composition: "shallow background falloff",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.character,
    materialFocus: "craft",
    includesFigures: true,
  },

  creature: {
    id: "category.creature",
    label: "Creature",
    prompt:
      "creature concept art with functional anatomy, a scale cue against a known object, distinctive hide, pelt, shell, or feather texture, and habitat detail at ground level. Visible weight, ground contact, and cast shadow. Pose reads as movement, threat, wariness, or display rather than presentation",
    defaultCamera: {
      id: "optics.creature.default",
      shotSize: "full",
      focalLength: "50mm",
      aperture: "f/5.6",
      angle: "low",
      aspectRatio: "3:2",
      composition: "negative space around the silhouette",
    },
    variants: {
      anatomy: {
        id: "optics.creature.anatomy",
        shotSize: "insert",
        focalLength: "100mm-macro",
        aperture: "f/8",
        angle: "eye-level",
        aspectRatio: "1:1",
        composition:
          "inset study of one defining head, limb, hide, or anatomical feature",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.creature,
    materialFocus: "craft",
    includesFigures: true,
  },

  location: {
    id: "category.location",
    label: "Location",
    prompt:
      "establishing environment art with distinct foreground, midground, and background. Architecture or landforms show their construction method, wear, and repair. Weather and atmosphere carry the depth, lighting states the hour, and the composition offers a clear path into the scene",
    exaltedPrompt:
      "establishing environment art with distinct foreground, midground, and background. Architecture or landforms stand unweathered and exact, built at a scale that dwarfs anything mortal. Weather and atmosphere carry the depth, and the composition offers a clear path into the scene",
    defaultCamera: {
      id: "optics.location.default",
      shotSize: "extreme-wide",
      focalLength: "24mm",
      aperture: "f/11",
      angle: "eye-level",
      aspectRatio: "3:2",
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
        aspectRatio: "3:2",
        composition: "corner-of-room vantage",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.location,
    materialFocus: "terrain",
    includesFigures: false,
  },

  item: {
    id: "category.item",
    label: "Item",
    prompt:
      "close-up prop concept art on an unobtrusive presentation surface, with a readable silhouette, clear scale, and visible construction — seams, fasteners, contact points, maker marks, inscriptions. Surfaces carry wear, repairs, handling polish, chipped edges, and tarnish",
    exaltedPrompt:
      "close-up prop concept art on an unobtrusive presentation surface, with a readable silhouette, clear scale, and visible construction — seams, fasteners, contact points, maker marks, inscriptions. Surfaces are flawless, edges crisp, the finish holding light like the day it was made",
    defaultCamera: {
      id: "optics.item.default",
      shotSize: "close",
      focalLength: "100mm-macro",
      aperture: "f/8",
      angle: "high",
      lighting: "overcast-softbox",
      aspectRatio: "1:1",
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
        aspectRatio: "4:5",
        figureInFrame: true,
        composition: "partially visible hand for scale",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.item,
    materialFocus: "craft",
    includesFigures: false,
  },

  faction: {
    id: "category.faction",
    label: "Faction",
    prompt:
      "wide faction concept art of the group mid-action rather than posed in a line. One figure anchors the foreground and the rest recede behind. Restrained heraldry repeated across role-specific equipment, deliberate spacing, a restricted faction palette, and visible differences of rank and role",
    // An exalted group is still by definition. Asking for a decisive moment and
    // absolute stillness in the same prompt satisfied neither and produced a
    // ceremonial lineup — the shape both clauses were written to avoid. This
    // also states the hierarchy in pixels: larger, not merely nearer.
    exaltedPrompt:
      "wide faction concept art composed as a hierarchical tableau rather than a moment of action. The central figure is rendered larger than those behind it, not merely nearer, and the rest are arranged in ranked depth around that axis, each distinguished by the emblem or attribute of a different domain, no two silhouettes alike. Restrained repeated motifs across role-specific equipment, deliberate spacing, and a restricted palette",
    defaultCamera: {
      id: "optics.faction.default",
      shotSize: "wide",
      focalLength: "35mm",
      aperture: "f/5.6",
      angle: "eye-level",
      aspectRatio: "3:2",
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
        aspectRatio: "4:5",
        composition: "looking up at the group to establish dominance",
      },
      ranks: {
        id: "optics.faction.ranks",
        shotSize: "medium-full",
        focalLength: "135mm",
        aperture: "f/5.6",
        angle: "eye-level",
        aspectRatio: "2.39:1",
        composition:
          "compressed telephoto perspective stacking dense, oppressive ranks",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.faction,
    // Craft, not both: a faction is people and their equipment. The terrain
    // clause supplied the thatched village behind one group portrait and the
    // mossy watchtower behind another, neither of which any layer asked for.
    // A setting that matters comes through the subject.
    materialFocus: "craft",
    includesFigures: true,
  },

  event: {
    id: "category.event",
    label: "Event",
    prompt:
      "a scene at the decisive instant, with legible participants and directional motion. Visible physical consequences — debris, smoke, spills, changed light, displaced bodies, structural damage. Photojournalistic framing rather than staged",
    defaultCamera: {
      id: "optics.event.default",
      shotSize: "wide",
      focalLength: "35mm",
      aperture: "f/2.8",
      angle: "low",
      aspectRatio: "2.39:1",
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
        aspectRatio: "3:2",
        composition:
          "static framing, no motion blur, silence in the composition",
      },
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.event,
    materialFocus: "both",
    includesFigures: true,
  },

  note: {
    id: "category.note",
    label: "Note / Lore",
    prompt:
      "worldbuilding illustration organised around one central symbol or object, with supporting detail arranged around it. One dominant element, one secondary, and clear separation between them",
    defaultCamera: {
      id: "optics.note.default",
      shotSize: "medium",
      focalLength: "50mm",
      aperture: "f/8",
      angle: "high",
      lighting: "overcast-softbox",
      aspectRatio: "4:5",
      composition: "flat-on or overhead view, shallow stage depth",
    },
    negativePrompt: CATEGORY_NEGATIVE_PROMPTS.note,
    materialFocus: "both",
    includesFigures: false,
  },

  cover: {
    id: "category.cover",
    label: "World Cover",
    prompt:
      "atmospheric cover art with one dominant focal point, layered depth, and genre-defining setting detail. The upper third is held clear as negative space for a title, with the focal point below it",
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
    // Both cover framings ask for a backlit hero silhouette, so a figure is in
    // frame and the scene carries made things as well as landform.
    materialFocus: "both",
    includesFigures: true,
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
    // No "magic as subtle material detail" clause: it is the one theme rule
    // that can be flatly wrong for an in-theme subject — an arch-lich mid-cast
    // or a rift opening — and the theme layer sits after the subject, so it
    // would get the last word.
    medium: "painterly oil rendering with visible brushwork",
    palette:
      "warm earth palette of ochre, umber, and tarnished gold with occasional cool shadow",
    lighting: "natural or firelit key",
    craftMaterials: "worn leather, hammered iron, stained wood, oiled cloth",
    terrainMaterials:
      "hand-cut stone, weathered timber, thatch and slate, moss and lichen over old masonry",
    exaltedMaterials:
      "spun gold thread, moonlit silver, living amber, crystal that holds its own light, cloth that never frays",
    exaltedPalette:
      "cool ivory and deep shadow with one saturated accent, the metals reading as light rather than colour",
    styleReferences: ["nineteenth-century romantic oil painting"],
    nameFreeFallback:
      "traditional oil painting on canvas, layered glazes, warm varnished tone",
  },

  scifi: {
    id: "theme.scifi",
    label: "Sci-Fi",
    aliases: ["sci-fi", "sci_fi", "science-fiction"],
    medium: "matte-painted industrial-design realism",
    palette: "slate grey and cool white with cyan accents",
    lighting: "practical ambient light from panels and fixtures in the scene",
    craftMaterials:
      "brushed chrome, carbon fibre, matte polymer, machined panel gaps",
    terrainMaterials:
      "poured composite, modular panelling, sealed joints, machined structural spans",
    exaltedMaterials:
      "seamless white composite, alloys with no visible join, light held inside glass, surfaces that do not scuff",
    exaltedPalette: "white and pale blue with a single clean spectral accent",
    styleReferences: ["1970s hard science fiction production design"],
    nameFreeFallback:
      "clean industrial-design matte painting, engineered surfaces, even practical lighting",
  },

  cyberpunk: {
    id: "theme.cyberpunk",
    label: "Cyberpunk",
    medium:
      "dense signage and retrofitted technology layered over older fabric",
    palette:
      "night palette of hot pink, electric blue, and sodium orange with visible halation",
    lighting:
      "hard shadows between bright zones, wet surfaces returning the light",
    craftMaterials:
      "spliced cabling, scuffed polymer, taped repairs, chrome over older hardware",
    terrainMaterials:
      "concrete, corrugated steel, accreted signage and ducting over older facades",
    exaltedMaterials:
      "liquid chrome, translucent shells lit from within, filament-fine circuitry, signage that answers the figure rather than the street",
    exaltedPalette:
      "near-black with one saturated colour holding the figure and everything else desaturated",
    defaultCamera: { lensCharacter: ["halation"] },
    styleReferences: ["1980s neo-noir cyberpunk cinema"],
    nameFreeFallback:
      "rain-slick neon night city rendering, dense signage, sodium and cyan halation",
  },

  modern: {
    id: "theme.modern",
    label: "Modern",
    medium: "documentary 35mm photography, no ornamentation and no retouching",
    palette:
      "muted contemporary palette of asphalt grey, denim, and warm skin tones, restrained grading",
    lighting: "available light",
    craftMaterials:
      "off-the-peg fabric, worn denim, moulded plastic, brushed steel",
    terrainMaterials:
      "poured concrete, painted steel, glass, asphalt, utilitarian cladding",
    exaltedMaterials:
      "flawless tailoring, unmarked cloth, pale unblemished stone, glass without a single fingerprint",
    exaltedPalette: "pale neutrals and clean white with one restrained accent",
    defaultCamera: { focalLength: "35mm", filmStock: "portra-400" },
    styleReferences: ["street documentary photography"],
    nameFreeFallback:
      "available-light documentary photograph, 35mm film grain, restrained grading",
  },

  apocalyptic: {
    id: "theme.apocalyptic",
    label: "Post-Apocalyptic",
    aliases: ["post-apocalyptic", "post_apocalyptic"],
    medium: "desaturated illustration of scavenged, improvised construction",
    palette: "rust, bone, and dust",
    lighting:
      "harsh directional daylight, suspended dust in the air, long shadows",
    craftMaterials:
      "mismatched panels, wire binding, patched fabric, salvaged fastenings",
    terrainMaterials:
      "cracked concrete, rusted rebar, sun-bleached timber, drifted dust over collapsed structure",
    exaltedMaterials:
      "relic metal untouched by rust, glass unclouded by dust, cloth the wind has never frayed",
    exaltedPalette: "bleached bone and clear sky against the dust",
    styleReferences: ["desert wasteland survival cinema"],
    nameFreeFallback:
      "desaturated wasteland illustration, scavenged repairs, harsh dusty daylight",
  },

  horror: {
    id: "theme.horror",
    label: "Horror",
    aliases: ["gothic-horror", "gothic_horror"],
    medium:
      "tenebrism — a single source carving the subject out of unresolved darkness, controlled dread rather than gore",
    palette: "bone, ash, dried blood, and bruise purple",
    lighting: "one practical source, everything else falling to black",
    craftMaterials:
      "tarnished silver, stiffened leather, mildewed cloth, cold iron",
    terrainMaterials:
      "damp stone, blistered plaster, rotting timber, iron gone to rust",
    exaltedMaterials:
      "reliquary gold, bone polished to ivory, gilt and wax over something older, unclouded black glass",
    exaltedPalette: "black and bone with a single deep red note",
    defaultCamera: { lighting: "chiaroscuro" },
    styleReferences: ["baroque tenebrist painting"],
    nameFreeFallback:
      "tenebrist painting, single practical light source, deep unresolved shadow",
  },

  steampunk: {
    id: "theme.steampunk",
    label: "Steampunk",
    medium: "gouache rendering with flat opaque colour",
    palette: "warm amber and sepia",
    lighting: "industrial forge light from below or behind, steam catching it",
    craftMaterials:
      "riveted brass plate, leather strapping, polished gauges, oiled linkages",
    terrainMaterials:
      "soot-blackened brick, riveted iron spans, glazed tile, copper piping",
    exaltedMaterials:
      "mirror-polished brass, jewelled movements, clockwork without a mark of wear, glass blown thin as breath",
    exaltedPalette: "warm ivory and clear glass against dark iron",
    styleReferences: ["Victorian industrial engraving"],
    nameFreeFallback:
      "gouache illustration, exposed brass mechanisms, warm amber forge light",
  },

  mythic: {
    id: "theme.mythic",
    label: "Mythic",
    medium:
      "tempera illustration, frontal symbolic composition, hierarchical scale where importance sets size rather than perspective",
    palette: "gold, cerulean, and ivory",
    lighting: "source-less ambient glow",
    craftMaterials: "beaten gold, carved ivory, dyed wool, polished bronze",
    terrainMaterials:
      "dressed ashlar, carved relief, gold inlay, worn ceremonial pavement",
    exaltedMaterials:
      "gold ground and haloed leaf, lapis and cinnabar, materials that emit light rather than reflect it",
    exaltedPalette: "lapis and cinnabar against a gold ground",
    styleReferences: ["Byzantine panel icon"],
    nameFreeFallback:
      "egg tempera panel, gold ground, frontal symbolic composition, source-less glow",
  },

  pulp_adventure: {
    id: "theme.pulp_adventure",
    label: "Pulp Adventure",
    aliases: ["pulp-adventure", "pulp"],
    medium:
      "screen-print linework with bold ink contours, limited flat colour, diagonal action composition",
    palette: "saturated reds and yellows, hard black shadows with no midtone",
    lighting: "high-contrast key, shadows blocking to solid black",
    craftMaterials:
      "canvas webbing, scuffed leather, blued steel, brass fittings",
    terrainMaterials:
      "cut stone ruins, jungle overgrowth, timber scaffolding, weathered rope",
    exaltedMaterials:
      "burnished idol gold, jewelled inlay, obsidian mirror, relic metal catching the key light",
    exaltedPalette: "hard black and white with one saturated red",
    styleReferences: ["mid-century pulp magazine cover"],
    nameFreeFallback:
      "screen-print poster, bold ink linework, saturated flat colour, hard black shadows",
  },

  fallout: {
    id: "theme.fallout",
    label: "Fallout",
    medium:
      "1950s Americana illustration crossed with ruin, atomic-age optimism decayed by time",
    palette: "vault blue, rust, bone, and dust",
    lighting: "flat hazy daylight, long shadows off wreckage",
    craftMaterials:
      "patched jumpsuit fabric, painted steel, cracked bakelite, duct tape",
    terrainMaterials:
      "cracked asphalt, corrugated tin, faded enamel signage, pre-war concrete",
    exaltedMaterials:
      "unblemished enamel, chrome without a scratch, vault-white polymer still factory-new",
    exaltedPalette: "clean vault blue and white against the dust",
    styleReferences: ["1950s advertising illustration"],
    nameFreeFallback:
      "mid-century American advertising illustration weathered by decades of ruin",
  },

  starwars: {
    id: "theme.starwars",
    label: "Star Wars",
    aliases: ["star-wars", "star_wars"],
    medium:
      "lived-in practical-effects rendering where everything looks used and maintained rather than new",
    palette: "desert ochre, or cold imperial monochrome depending on the scene",
    lighting: "dramatic rim lighting",
    craftMaterials:
      "carbon-scored plating, patched fabric, mismatched field repairs",
    terrainMaterials:
      "prefabricated modular structure, sand-scoured plating, exposed conduit",
    exaltedMaterials:
      "unmarked ceremonial plating, deep lacquer, robes with no field repair, polished ritual metal",
    exaltedPalette: "white and deep black with a single colour accent",
    styleReferences: ["1970s space opera production painting"],
    nameFreeFallback:
      "lived-in practical-effects concept painting, carbon-scored hardware, dramatic rim light",
  },

  startrek: {
    id: "theme.startrek",
    label: "Star Trek",
    aliases: ["star-trek", "star_trek"],
    medium:
      "clean 1990s production illustration, manufactured and grime-free rather than salvaged",
    palette: "optimistic palette with red, blue, and gold role coding",
    lighting: "even practical light",
    craftMaterials: "moulded composite, smooth fabric weave, machined trim",
    terrainMaterials:
      "smooth composite bulkheads, inlaid lighting strips, seamless engineered surfaces",
    exaltedMaterials:
      "polished ceremonial alloy, inlaid light, seamless white ceramic",
    exaltedPalette: "clean white and cool blue with restrained role colour",
    styleReferences: ["1990s television production illustration"],
    nameFreeFallback:
      "clean production illustration, smooth engineered surfaces, even practical lighting",
  },

  lancer: {
    id: "theme.lancer",
    label: "Lancer",
    medium:
      "military schematic concept art, functional over decorative, every surface with a job",
    palette: "Union blue, gunmetal grey, and safety orange",
    lighting: "flat overcast field light",
    craftMaterials:
      "worn armour panels, stencil markings, hazard striping, exposed actuators",
    terrainMaterials:
      "prefab military structure, blast berms, stencilled containers, churned ground",
    exaltedMaterials:
      "parade-finish armour, mirror-anodised plate, crisp unweathered stencils, machined ceremonial trim",
    exaltedPalette: "white and gunmetal with one hazard accent",
    styleReferences: ["military technical manual illustration"],
    nameFreeFallback:
      "military technical illustration, stencilled worn panels, functional hardware design",
  },
};

/**
 * Renders a theme as a prompt layer, selecting the material vocabulary the
 * category actually needs.
 */
export function composeThemeLayer(
  theme: ArtTheme,
  materialFocus: MaterialFocus = "both",
): string {
  // Exalted replaces rather than joins: a god listed alongside thatch and worn
  // leather renders as a villager, however many divine adjectives precede it.
  if (materialFocus === "exalted") {
    // The theme's lighting logic is dropped with it: "natural or firelit key"
    // argues with the self-originating light an exalted stature asks for, and
    // the stature's camera bias supplies the replacement.
    return composeThemeParts(theme, [theme.exaltedMaterials], {
      includeLighting: false,
      palette: theme.exaltedPalette,
    });
  }

  const materials: string[] = [];
  if (materialFocus === "craft" || materialFocus === "both") {
    materials.push(theme.craftMaterials);
  }
  if (materialFocus === "terrain" || materialFocus === "both") {
    materials.push(theme.terrainMaterials);
  }

  return composeThemeParts(theme, materials);
}

function composeThemeParts(
  theme: ArtTheme,
  materials: string[],
  options: { includeLighting?: boolean; palette?: string } = {},
): string {
  return [
    theme.medium,
    `Materials — ${materials.join("; ")}`,
    options.palette || theme.palette,
    options.includeLighting === false ? "" : theme.lighting,
  ]
    .map((part) => part.trim().replace(/[.\s]+$/, ""))
    .filter(Boolean)
    .join(". ");
}

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
