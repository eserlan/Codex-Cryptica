/**
 * Star System Generator — a sci-fi macro-worldbuilding tool that produces a
 * coherent, campaign-ready star system rather than a bare astronomical
 * inventory: a star (or stars), 3-12 major bodies, the factions and stakes
 * that make the system worth visiting, and a system-wide conflict or
 * mystery. Framework-free, for the marketing/SEO generator surface (no
 * login, no vault context) — mirrors the public-world.ts / public-quest.ts
 * split already used for every other generator with an in-app,
 * vault-grounded sibling (#1935).
 *
 * A generated body can be handed to the World Generator via
 * "Develop this world" (see developWorldLink() below) to open a fresh World
 * Generator draft pre-populated with this system's context.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { parseFencedJson } from "./llm-response-utils";
import { defaultRng, pickFrom, type Rng } from "./random-utils";
import { BANNED_NAMES, NAME_BAN_PROMPT } from "./public-npc-constants";
import { formatCampaignContextBlock } from "./campaign-context";

export const starSystemConfig = {
  systemTypes: ["Single Star", "Binary System", "Trinary System", "Exotic"],
  genres: ["Hard Sci-Fi", "Space Opera", "Cyberpunk", "Post-Apocalyptic"],
  civilisationLevels: ["Unexplored", "Frontier", "Settled", "Core System"],
  systemCharacters: [
    "Prosperous",
    "Contested",
    "Dying",
    "Isolated",
    "Industrial",
    "Mysterious",
  ],
  scientificRealism: ["Cinematic", "Grounded", "Hard Sci-Fi"],
  names: [
    "Kesh-9",
    "Halyard's Reach",
    "Vantage Deep",
    "Corvane",
    "Thessa's Fold",
    "Marrow Verge",
    "Anhalt",
    "Sable Reach",
    "Idris Deep",
    "Corrigan's Drift",
  ],
  bodyTypes: [
    "Scorched Rockball",
    "Temperate World",
    "Ocean World",
    "Ice Giant",
    "Gas Giant",
    "Barren Moon",
    "Frozen Moon",
    "Ringed World",
    "Asteroid Belt",
    "Derelict Station",
    "Orbital Habitat",
    "Rogue Planetoid",
  ],
} as const;

export interface StarSystemGeneratorOptions {
  systemType?: string;
  genre?: string;
  civilisationLevel?: string;
  systemCharacter?: string;
  scientificRealism?: string;
  /** Free-text world/campaign background from the form's context field. */
  campaignContext?: string;
  /** Existing titles to avoid when making a local fallback. */
  avoidNames?: string[];
}

export interface StarSystemPrompt {
  systemInstruction: string;
  userMessage: string;
}

function choose(
  value: string | undefined,
  choices: readonly string[],
  rng: Rng,
): string {
  return value?.trim() || pickFrom(choices, rng);
}

function chooseName(avoidNames: readonly string[], rng: Rng): string {
  const forbidden = new Set(
    avoidNames.map((name) => name.trim().toLowerCase()),
  );
  const available = starSystemConfig.names.filter(
    (name) => !forbidden.has(name.toLowerCase()),
  );
  return pickFrom(available.length ? available : starSystemConfig.names, rng);
}

function genreLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export interface StarSystemBody {
  name: string;
  type: string;
  description?: string;
  /** Name of the body this one orbits, for moons/rings orbiting a planet rather than the star directly. */
  parentName?: string;
  /** Distance from the star in AU, for a body orbiting the star directly (drives travel-time estimates and the diagram's AU scale). Not meaningful for a moon/station orbiting another body. */
  distanceAU?: number;
}

/** Longest developContext query param value before truncation (#1935 review). */
const DEVELOP_CONTEXT_MAX_LENGTH = 220;

/**
 * Collapses whitespace and caps length so a verbose AI-authored body
 * description can't blow up the query string (repeated once per body).
 */
function normalizeDevelopContext(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= DEVELOP_CONTEXT_MAX_LENGTH) return collapsed;
  return `${collapsed.slice(0, DEVELOP_CONTEXT_MAX_LENGTH - 1).trimEnd()}…`;
}

/**
 * Builds the "Develop this world" URL for a major body (#1935): opens the
 * World Generator with this body's name, type, and system context
 * pre-populated via query params. Read back on the World Generator page by
 * applyPendingDevelopWorld() in apps/web's GeneratorPageContent.svelte.
 *
 * The context string carries the structured facts the World Generator's
 * single free-text field can hold: the body's strategic role (its
 * description — economy, survival, travel, or conflict), where it sits in
 * the system (orbiting a named parent, or its AU distance from the star),
 * and the system it belongs to — so a "developed" world starts grounded in
 * its place in the system, not just a name and a type.
 */
function developWorldLink(
  systemTitle: string,
  body: Pick<
    StarSystemBody,
    "name" | "type" | "description" | "parentName" | "distanceAU"
  >,
): string {
  const locationClause = body.parentName
    ? `orbiting ${body.parentName}`
    : body.distanceAU !== undefined
      ? `${body.distanceAU} AU from the star`
      : "part of the system";
  const params = new URLSearchParams({
    developSystem: systemTitle,
    developBody: body.name,
    developBodyType: body.type,
    developContext: normalizeDevelopContext(
      `${sentence(body.description)}. ${locationClause}, in the ${systemTitle} system.`,
    ),
  });
  return `/generators/world?${params.toString()}`;
}

interface SpectralClass {
  type: string;
  flavor: string;
  /** Real-world approximate star color by spectral class, for the diagram. */
  color: string;
  /** Cooler classes (K, M) are far more common than hot ones (O, B) in reality. */
  weight: number;
}

/** Standard main-sequence spectral classes, hottest to coolest. */
const SPECTRAL_CLASSES: readonly SpectralClass[] = [
  {
    type: "O",
    flavor: "a rare, blazing O-type blue giant",
    color: "#9bb0ff",
    weight: 1,
  },
  {
    type: "B",
    flavor: "a massive, blue-white B-type star",
    color: "#aabfff",
    weight: 1,
  },
  {
    type: "A",
    flavor: "a hot, brilliant A-type white star",
    color: "#cad7ff",
    weight: 2,
  },
  {
    type: "F",
    flavor: "a bright F-type yellow-white star",
    color: "#f8f7ff",
    weight: 2,
  },
  {
    type: "G",
    flavor: "a stable G-type yellow dwarf",
    color: "#fff4ea",
    weight: 3,
  },
  {
    type: "K",
    flavor: "a steady K-type orange dwarf",
    color: "#ffd2a1",
    weight: 4,
  },
  {
    type: "M",
    flavor: "a dim, long-lived M-type red dwarf",
    color: "#ffcc6f",
    weight: 6,
  },
];

const EXOTIC_STARS: readonly SpectralClass[] = [
  {
    type: "Brown Dwarf",
    flavor: "a dim brown dwarf providing more radiation than light",
    color: "#b06a4a",
    weight: 1,
  },
  {
    type: "Neutron Star",
    flavor:
      "a neutron star whose radiation belts make most of the system lethal without shielding",
    color: "#dbe8ff",
    weight: 1,
  },
  {
    type: "White Dwarf",
    flavor: "the collapsed white dwarf remnant of a much larger star",
    color: "#f2f6ff",
    weight: 1,
  },
  {
    type: "Rogue Star",
    flavor:
      "a rogue star, unbound from any galactic arm, dragging a captured retinue of bodies through open space",
    color: "#c9c9d4",
    weight: 1,
  },
];

function weightedSpectralPick(
  classes: readonly SpectralClass[],
  rng: Rng,
): SpectralClass {
  const total = classes.reduce((sum, c) => sum + c.weight, 0);
  let roll = rng() * total;
  for (const spectralClass of classes) {
    if (roll < spectralClass.weight) return spectralClass;
    roll -= spectralClass.weight;
  }
  return classes[classes.length - 1];
}

interface StarDescription {
  text: string;
  /** Primary star's spectral class/type, for labels and the diagram's star color. */
  starType: string;
}

/** Real-world approximate star color by spectral class/type, for the diagram's star circle. */
export const STAR_TYPE_COLORS: Readonly<Record<string, string>> =
  Object.fromEntries(
    [...SPECTRAL_CLASSES, ...EXOTIC_STARS].map((c) => [c.type, c.color]),
  );

function starDescription(systemType: string, rng: Rng): StarDescription {
  if (systemType === "Binary System") {
    const a = weightedSpectralPick(SPECTRAL_CLASSES, rng);
    const b = weightedSpectralPick(SPECTRAL_CLASSES, rng);
    return {
      starType: a.type,
      text: `A close binary pair — ${a.flavor} and ${b.flavor} — locks the system into overlapping shadows and complex seasons no single calendar can describe.`,
    };
  }
  if (systemType === "Trinary System") {
    const a = weightedSpectralPick(SPECTRAL_CLASSES, rng);
    const b = weightedSpectralPick(SPECTRAL_CLASSES, rng);
    const c = weightedSpectralPick(SPECTRAL_CLASSES, rng);
    return {
      starType: a.type,
      text: `Three stars in an unstable hierarchy — ${a.flavor}, ${b.flavor}, and ${c.flavor} — mean the sky itself is a hazard: navigation charts age quickly as the orbits drift.`,
    };
  }
  if (systemType === "Exotic") {
    const exotic = pickFrom(EXOTIC_STARS, rng);
    return {
      starType: exotic.type,
      text: `${exotic.flavor.charAt(0).toUpperCase()}${exotic.flavor.slice(1)}.`,
    };
  }
  const star = weightedSpectralPick(SPECTRAL_CLASSES, rng);
  return {
    starType: star.type,
    text: `A single stable star — ${star.flavor} — anchors the system, its habitable zone the one variable every faction here has learned to fight over.`,
  };
}

/** Generate 3-12 named major bodies with plausible variety. */
function generateBodies(
  systemName: string,
  count: number,
  rng: Rng,
): StarSystemBody[] {
  const usedTypes = new Set<string>();
  const usedNames = new Set<string>();
  let lastPrimaryName: string | undefined;
  let lastDistanceAU = 0;
  return Array.from({ length: count }, (_, index) => {
    // The very first body can't be a moon type — there's no primary yet for
    // it to orbit, which would otherwise leave it parentless with no AU
    // distance in "## Major Bodies".
    const availableTypes = lastPrimaryName
      ? starSystemConfig.bodyTypes
      : starSystemConfig.bodyTypes.filter(
          (t) => t !== "Barren Moon" && t !== "Frozen Moon",
        );
    let type = pickFrom(availableTypes, rng);
    // Prefer variety across a small system; repeats become acceptable once
    // the pool is exhausted.
    if (usedTypes.size < availableTypes.length) {
      let attempts = 0;
      while (usedTypes.has(type) && attempts < 6) {
        type = pickFrom(availableTypes, rng);
        attempts += 1;
      }
    }
    usedTypes.add(type);
    const designation = ROMAN_NUMERALS[index] ?? `${index + 1}`;
    const fallbackName = `${systemName} ${designation}`;
    let name = fallbackName;
    if (rng() < 0.35) {
      let attempts = 0;
      let candidate: string;
      do {
        candidate = `${pickFrom(["New", "Port", "Old", "Fort"], rng)} ${pickFrom(["Halden", "Kestrel", "Varga", "Solace", "Ember"], rng)}`;
        attempts += 1;
      } while (usedNames.has(candidate) && attempts < 6);
      // Every fallback designation is unique by construction (distinct
      // Roman numeral / index per body), so falling back to it always
      // resolves a collision instead of just reducing its odds.
      name = usedNames.has(candidate) ? fallbackName : candidate;
    }
    usedNames.add(name);
    const isMoon = type === "Barren Moon" || type === "Frozen Moon";
    const parentName = isMoon ? lastPrimaryName : undefined;
    let distanceAU: number | undefined;
    if (!isMoon) {
      lastPrimaryName = name;
      const [minAU, maxAU] = TYPE_DISTANCE_RANGE_AU[type] ?? [1, 10];
      let candidate = minAU + rng() * (maxAU - minAU);
      if (candidate <= lastDistanceAU + 0.3) {
        candidate = lastDistanceAU + 0.3 + rng() * 1.5;
      }
      distanceAU = Math.round(candidate * 10) / 10;
      lastDistanceAU = distanceAU;
    }
    return {
      name,
      type,
      description: bodyDescription(type, rng),
      ...(parentName ? { parentName } : {}),
      ...(distanceAU !== undefined ? { distanceAU } : {}),
    };
  });
}

/** Rough, gameplay-flavored orbital distance range per body type, in AU — not astrophysically rigorous, just enough spread that rockier/hotter types land closer in and giants/outer bodies land farther out. */
const TYPE_DISTANCE_RANGE_AU: Partial<
  Record<string, readonly [number, number]>
> = {
  "Scorched Rockball": [0.2, 0.7],
  "Temperate World": [0.6, 1.8],
  "Ocean World": [0.7, 2.2],
  "Asteroid Belt": [2, 4.5],
  "Ringed World": [3, 12],
  "Gas Giant": [4, 15],
  "Ice Giant": [8, 22],
  "Derelict Station": [1, 10],
  "Orbital Habitat": [1, 10],
  "Rogue Planetoid": [10, 40],
};

function bodyDescription(type: string, rng: Rng): string {
  const descriptions: Partial<Record<string, readonly string[]>> = {
    "Temperate World": [
      "a settled world whose breathable air is its most fought-over resource",
      "the system's agricultural anchor, feeding every outpost that cannot grow its own food",
    ],
    "Ocean World": [
      "a world of open water dotted with floating platforms and submerged claims",
    ],
    "Ice Giant": [
      "a vast atmosphere mined for volatiles by orbital skimmers that never land",
    ],
    "Gas Giant": [
      "its storms hide extraction rigs whose owners guard their coordinates jealously",
    ],
    "Barren Moon": [
      "an airless rock kept alive only by imported water and stubborn engineering",
    ],
    "Frozen Moon": [
      "a shell of ice over a hidden ocean, cracked open only where the heat vents reach the surface",
    ],
    "Ringed World": [
      "its rings are both a navigation hazard and a mining claim nobody can fully police",
    ],
    "Asteroid Belt": [
      "a scattered claim of rocks worked by independent crews who answer to no single authority",
    ],
    "Derelict Station": [
      "an abandoned installation whose original purpose is a matter of active dispute",
    ],
    "Orbital Habitat": [
      "a constructed ring or drum, self-sufficient enough to outlast whoever built it",
    ],
    "Rogue Planetoid": [
      "a body on a slow, uncatalogued path through the system, of interest to exactly the people who noticed it first",
    ],
    "Scorched Rockball": [
      "a sunward world too hot for permanent habitation, valuable only for what can be extracted quickly",
    ],
  };
  const pool = descriptions[type] ?? [
    "a body whose value is still being argued over by everyone with a claim to it",
  ];
  return pickFrom(pool, rng);
}

/**
 * Descriptions may already carry trailing punctuation depending on the
 * source (free-text AI output vs. local tables) — strip it so concatenating
 * a fixed suffix (an AU clause, a bullet dash) never produces a duplicated
 * or mismatched mark like "..", "—-", or "world.." from an AI draft.
 */
function sentence(text: string | undefined): string {
  return (text ?? "").trim().replace(/[.,;:\s\-–—]+$/, "");
}

/**
 * Light defensive cleanup for common AI wording slips: doubled whitespace,
 * duplicated terminal punctuation ("!!", "??"), and stray dash/em-dash
 * collisions ("—-", "-—") that turn up when free-text AI output gets
 * concatenated with generated suffixes elsewhere. Deliberately leaves an
 * intentional ellipsis ("...") untouched.
 */
function sanitizeText(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\.\.(?!\.)/g, ".")
    .replace(/([!?,;:])\1+/g, "$1")
    .replace(/—-|-—/g, "—")
    .trim();
}

/**
 * Renders "## Major Bodies" as a subheading per body orbiting the star
 * directly (with a description paragraph), and a bullet per moon/station
 * nested under its parent's subheading. The single source of truth for this
 * section's markdown — used both by the local generator and to render the
 * AI path's "bodies" JSON, so the displayed text and the diagram (which also
 * reads "bodies") can never drift apart the way two independently-authored
 * representations could. Builds "Develop this world" links directly (see
 * developWorldLink()), since this is the one place with full access to each
 * body's structured parentName/distanceAU context.
 */
function formatMajorBodies(
  bodies: readonly StarSystemBody[],
  systemTitle: string,
): string {
  const byName = new Map(bodies.map((body) => [body.name, body]));
  const isSatellite = (body: StarSystemBody) =>
    !!body.parentName && byName.has(body.parentName);
  const primaries = bodies.filter((body) => !isSatellite(body));
  const satellitesByParent = new Map<string, StarSystemBody[]>();
  for (const body of bodies) {
    if (!isSatellite(body)) continue;
    const list = satellitesByParent.get(body.parentName!) ?? [];
    list.push(body);
    satellitesByParent.set(body.parentName!, list);
  }

  const blocks = primaries.map((body) => {
    const distanceSuffix =
      body.distanceAU !== undefined
        ? ` — ${body.distanceAU} AU from the star.`
        : ".";
    const href = developWorldLink(systemTitle, body);
    const lines = [
      `#### [${body.name}](${href}) (${body.type})`,
      `${sentence(body.description)}${distanceSuffix}`,
    ];
    const moons = satellitesByParent.get(body.name) ?? [];
    for (const moon of moons) {
      const moonHref = developWorldLink(systemTitle, moon);
      lines.push(
        `- **[${moon.name}](${moonHref})** (${moon.type}) — ${sentence(moon.description)}.`,
      );
    }
    return lines.join("\n");
  });
  return blocks.join("\n\n");
}

/**
 * Replaces whatever the AI wrote under "## Major Bodies" (ideally nothing —
 * the prompt tells it not to bother) with markdown rendered straight from
 * the "bodies" JSON via formatMajorBodies(). This is what makes the diagram
 * and the displayed text impossible to desync: there is only one
 * representation of body data (the JSON), and the text is generated from it,
 * never authored independently. Inserts the section (right after
 * "## The Star(s)") if the AI omitted the heading entirely, which is fine.
 */
function replaceMajorBodiesSection(
  lore: string,
  bodiesMarkdown: string,
): string {
  const heading = "## Major Bodies\n";
  const section = `${heading}${bodiesMarkdown}\n`;
  const sectionPattern = /(^|\n)(## Major Bodies\n)[\s\S]*?(?=\n## |$)/;
  if (sectionPattern.test(lore)) {
    return lore.replace(
      sectionPattern,
      (_match, lead: string) => `${lead}${section}`,
    );
  }
  const starSectionPattern = /(^|\n)## The Star\(s\)\n[\s\S]*?(?=\n## |$)/;
  const starMatch = lore.match(starSectionPattern);
  if (starMatch) {
    const insertAt = (starMatch.index ?? 0) + starMatch[0].length;
    return `${lore.slice(0, insertAt)}\n\n${section}${lore.slice(insertAt)}`;
  }
  return `${lore}\n\n${section}`;
}

/** Generate a complete local draft without network access or vault writes. */
export function generateStarSystemLocal(
  options: StarSystemGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const systemType = choose(
    options.systemType,
    starSystemConfig.systemTypes,
    rng,
  );
  const genre = choose(options.genre, starSystemConfig.genres, rng);
  const civilisationLevel = choose(
    options.civilisationLevel,
    starSystemConfig.civilisationLevels,
    rng,
  );
  const systemCharacter = choose(
    options.systemCharacter,
    starSystemConfig.systemCharacters,
    rng,
  );
  const scientificRealism = choose(
    options.scientificRealism,
    starSystemConfig.scientificRealism,
    rng,
  );
  const title = chooseName(options.avoidNames ?? [], rng);
  const bodyCount = 4 + Math.floor(rng() * 4); // 4-7 for the local fallback
  const bodies = generateBodies(title, bodyCount, rng);
  const bodyLines = formatMajorBodies(bodies, title);

  const civilisationDetail =
    civilisationLevel === "Unexplored"
      ? "No permanent claim has been staked here yet; what presence exists is survey teams, prospectors, and whoever got here first."
      : civilisationLevel === "Frontier"
        ? "A handful of independent outposts hold the system together, each one closer to self-sufficient than any of them would admit."
        : civilisationLevel === "Core System"
          ? "Established authority runs deep here — shipping lanes, tariffs, and jurisdiction are all settled questions, at least on paper."
          : "Settlements here are past the survey stage but still building the institutions that will decide who actually runs the system.";

  const strategicValue = pickFrom(
    [
      "a rare mineral deposit found nowhere else on the known trade lanes",
      "a stable transit corridor that shortens travel time between two larger powers",
      "a research find that several factions would rather control than share",
      "the system's position as the last resupply point before a longer, harder route",
    ],
    rng,
  );

  const hazard = pickFrom(
    [
      "unpredictable radiation storms that ground unshielded traffic without warning",
      "a debris field left over from an old conflict, still live with unexploded ordnance",
      "gravitational tides between the system's major bodies that scramble navigation near closest approach",
      "a patrolled exclusion zone whose rules change depending on who is currently enforcing them",
    ],
    rng,
  );

  const conflictOrMystery = pickFrom(
    [
      `A signal of disputed origin repeats from ${pickFrom(bodies, rng).name}, and every faction in the system has a different theory about who is transmitting it and why.`,
      `Two rival claims over the system's resources have not yet turned violent, but both sides are quietly arming for the day the treaty fails.`,
      `A structure on one of the system's bodies predates every recorded settlement here, and nobody currently in the system built it.`,
      `Something is missing from the official survey record, and the people who could explain the gap keep changing the subject.`,
    ],
    rng,
  );

  const lifeformsDetail =
    civilisationLevel === "Unexplored"
      ? `No confirmed lifeforms beyond hardy extremophiles have turned up in the scans of ${title} so far — whoever settles it first will be the one to find out for certain.`
      : `Beyond its settlers, ${title} shows no complex native life, only scattered microbial mats in sheltered pockets on its harsher bodies.`;

  const star = starDescription(systemType, rng);

  const content = [
    "## Core Concept",
    `${title} is a ${genre.toLowerCase()} ${systemType.toLowerCase()} system, ${systemCharacter.toLowerCase()} in character and ${civilisationLevel.toLowerCase()} in reach. It matters because of ${strategicValue}, and every faction present here knows it.`,
    "",
    "## The Star(s)",
    star.text,
    "",
    "## Major Bodies",
    bodyLines,
    "",
    "## Lifeforms",
    lifeformsDetail,
    "",
    "## Settlements & Factions",
    civilisationDetail,
    `At least two competing interests operate here — one favouring stability and the existing order, the other willing to disrupt it for a better position.`,
    "",
    "## Resources & Strategic Importance",
    `The system's leverage comes from ${strategicValue}. Whoever controls access to it controls the system's politics.`,
    "",
    "## Travel Hazards",
    `Getting through the system safely means accounting for ${hazard}.`,
  ].join("\n");

  const lore = [
    "## History",
    `${title}'s current balance of power is recent; the system's earlier era ended when the situation behind its central conflict first came to light, and nobody has fully settled the aftermath.`,
    "",
    "## System-Wide Conflict or Mystery",
    conflictOrMystery,
    "",
    "## Adventure Hooks",
    `- A faction operating in ${title} needs outside help investigating ${conflictOrMystery.split(",")[0].toLowerCase()}.`,
    `- A supply run through the system's hazards (${hazard}) goes wrong at the worst possible time.`,
    `- Someone on ${pickFrom(bodies, rng).name} is quietly trying to change who controls ${strategicValue}, and needs deniable help to do it.`,
  ].join("\n");

  return {
    type: "location",
    title,
    summary: `${title} is a ${systemType.toLowerCase()} star system, ${systemCharacter.toLowerCase()} and ${civilisationLevel.toLowerCase()}, built around ${strategicValue}.`,
    content,
    lore,
    bodies,
    starType: star.starType,
    labels: [
      "star-system",
      genreLabel(systemType),
      genreLabel(genre),
      genreLabel(civilisationLevel),
      genreLabel(systemCharacter),
      genreLabel(scientificRealism),
    ],
    status: "active",
  };
}

/** Build the dedicated AI brief; campaign context is prepended by the registry. */
export function buildStarSystemPrompt(
  options: StarSystemGeneratorOptions = {},
): StarSystemPrompt {
  const systemType = options.systemType?.trim() || "an appropriate system type";
  const genre = options.genre?.trim() || "sci-fi";
  const civilisationLevel =
    options.civilisationLevel?.trim() || "an appropriate civilisation level";
  const systemCharacter =
    options.systemCharacter?.trim() || "an appropriate system character";
  const scientificRealism = options.scientificRealism?.trim() || "grounded";
  const extraAvoidedNames = options.avoidNames
    ?.map((name) => name.trim())
    .filter(Boolean);
  const nameRestrictions = extraAvoidedNames?.length
    ? ` Also do not use these campaign-specific names: ${extraAvoidedNames.join(", ")}.`
    : "";
  const normalizedRealism = scientificRealism.toLowerCase();
  const realismLevelGuidance =
    normalizedRealism === "hard sci-fi"
      ? "For Hard Sci-Fi realism, keep orbital mechanics, travel times, and technology broadly plausible: no unexplained faster-than-light travel, no reactionless drives, no gravity control invented purely for convenience."
      : normalizedRealism === "cinematic"
        ? "For Cinematic realism, speculative technology (artificial gravity, practical FTL corridors, exotic energy sources) is acceptable when it is established clearly and used consistently; keep it from making every problem effortless."
        : "For Grounded realism, allow some generous assumptions but keep technology costly and legible, with clear consequences following from whatever you establish.";
  const realismGuidance = `Scientific Realism is a flavor and constraint dial for a GM, not an invitation to write a physics lecture — this is RPG worldbuilding, not a science emulator. ${realismLevelGuidance} Whatever the level, every constraint you introduce must exist to create a concrete campaign consequence (a hazard, a cost, a limitation someone can play around), never as scientific exposition or unit-and-formula detail for its own sake.`;

  const normalizedGenre = genre.toLowerCase();
  const resourceGuidance =
    normalizedGenre === "hard sci-fi"
      ? 'Resources named in "bodies" and "## Resources & Strategic Importance" must be scientifically plausible or a direct extrapolation of a real one — rare-earth metals, water ice, fusionable isotopes, arable soil, industrial alloys, data/intel — not an invented exotic substance with no real-world basis.'
      : normalizedGenre === "post-apocalyptic"
        ? "Resources should center on scarcity and salvage — pre-collapse technology, fuel, clean water, arable land, intact manufacturing capacity. An exotic find is a rare, plot-worthy exception, not the system's everyday economy."
        : normalizedGenre === "cyberpunk"
          ? "Resources can extend to corporate-controlled tech (proprietary alloys, bio-augmentation compounds, black-market data) alongside ordinary industrial materials, but keep them grounded in who profits from them and why — not unexplained technobabble."
          : "Default to plausible resources — metals, fuel, water, food, manufactured goods, data — as the system's real economic backbone. One genuinely exotic material or technology is fine if the genre or system character calls for it, but it should be the exception a GM can build a plot around, not wallpaper.";

  return {
    systemInstruction:
      "You are a science-fiction worldbuilder creating a coherent, campaign-ready star system for a GM. Prioritise why the system matters — its stakes, factions, and conflicts — over an inventory of astronomical trivia. Return only one valid JSON object.",
    userMessage: `Create a ${genre} star system of type ${systemType}, civilisation level ${civilisationLevel}, with a system character of ${systemCharacter}.
${formatCampaignContextBlock(options.campaignContext)}

Return JSON with "title", "summary", "labels", "connections", "bodies", "starType", and a markdown "lore" field. "summary" must describe the system as a whole in one sentence — its character, stakes, and what makes it worth visiting — never zoom in on a single body, faction, or station as if it were the whole pitch. Do not write anything under "## Major Bodies" in "lore" — leave that heading with no content below it, or omit the heading entirely; the Major Bodies section is generated automatically from "bodies", so any prose you put there yourself would be discarded. All body detail belongs only in "bodies": an array covering every planet, moon, asteroid belt, station, megastructure, or notable anomaly in the system (never the star(s) themselves), each shaped as {"name": string, "type": string, "description": string, "parentName": string, "distanceAU": number}. "description" is one lowercase sentence fragment (no leading capital, no trailing period) giving this body a clear, concrete role in at least one of: the system's economy (a resource, trade good, or manufacturing capacity it produces or processes), survival (habitat, food, water, fuel, or life support something else depends on), travel (a waypoint, fuel/repair stop, chokepoint, or hazard on the way somewhere), or conflict (a contested asset, military position, or faction stronghold) — never just a physical description with no stake attached. A moon/station/outpost nested under a parent (via "parentName") must also say concretely what it does there — what it extracts, guards, monitors, or processes from or for that parent — not merely that it orbits it. "parentName" is omitted for anything orbiting the star directly, and set to another body's exact "name" in this same array for anything orbiting that body instead — never the star, even if the description mentions the star by name. "distanceAU" is each body's distance from the star in astronomical units (1 AU ≈ Earth-Sun distance), required for every body with no "parentName" and omitted for one that has a "parentName" (it shares its parent's distance); values must be strictly increasing across the array in the order those star-orbiting bodies appear, and roughly plausible for the body's type (rocky/hot worlds well under 5 AU, gas/ice giants and outer bodies further out, typically 3-40 AU) — a GM-usable travel-time reference, not an astrophysics exercise. Include between 3 and 12 bodies with no "parentName", plus as many moons/stations nested under them as make sense; give each body a distinct, memorable name — do not number them generically without also giving at least the most important ones a proper name; at least one must be habitable or settled unless the civilisation level is Unexplored. "starType" must be the primary/most prominent star's classification: one of the standard spectral classes "O", "B", "A", "F", "G", "K", "M" (hottest to coolest), or — only for a non-stellar or otherwise irregular anchor body — "Brown Dwarf", "Neutron Star", "White Dwarf", or "Rogue Star"; it must match whatever "## The Star(s)" states. Labels must match the actual generated content: include only factual tags supported by the system's type, genre, civilisation level, and character. The lore must use these exact sections:
## Core Concept
## The Star(s)
## Major Bodies
## Lifeforms
## Settlements & Factions
## Resources & Strategic Importance
## Travel Hazards
## History
## System-Wide Conflict or Mystery
## Adventure Hooks

"## The Star(s)" must explicitly name each star's spectral classification (e.g. "a G-type yellow dwarf", "an M-type red dwarf", "a rare O-type blue giant") rather than describing it only in vague terms — for a Binary or Trinary system, name the classification of every star in the pair/triple, not just one. For an Exotic anchor that isn't a standard main-sequence star (brown dwarf, neutron star, white dwarf, rogue star), name that instead and flavor it accordingly.

The system must read as a connected campaign sandbox, not a list of isolated locations — every major body should give a GM a concrete reason a party would travel there. Across "bodies" and the sections below, make clear: where people actually live; how the bodies depend on one another (supply lines, fuel, water, food, manufacturing, data relays); which routes and facilities matter enough to name; which faction (if any) controls each contested body; and why the system's central resource or conflict has consequences beyond the one body where it originates. Every body's description, and every faction, hazard, and mystery beat below, should connect back to the system's central stakes rather than existing as an isolated fact.

"## Lifeforms" must briefly cover any life native to the system's bodies, from microbial and complex-cellular ecosystems up to alien fauna, tying each entry to the specific named body (from "bodies") it's found on. If the system is genuinely lifeless beyond its settlers, say so in one line instead of inventing life that isn't warranted by the civilisation level or system character.

"## Settlements & Factions" must name at least two distinct groups with competing interests in the system, grounded in the system's civilisation level, and must state which specific named body or bodies each faction controls or operates from — settlement scale (outpost, colony, station, city) must match the stated civilisation level. Keep the factions politically ambiguous: each side must have an understandable, self-interested reason for what it's doing, and neither should be flagged as simply "the villains" — a GM should be able to run either faction as sympathetic depending on the table. "## Resources & Strategic Importance" must state the concrete reason outside powers care about this system and how control of that resource ripples out to affect the other bodies and factions already described, not just the one body where it's found. ${resourceGuidance} "## Travel Hazards" must describe a specific, named hazard affecting travel within the system, not a generic warning. "## System-Wide Conflict or Mystery" must be the one unresolved tension that would drive a campaign here, referenced or foreshadowed by at least one body or faction described earlier in the lore — frame it as a genuine dispute or unanswered question with more than one defensible side, not a mystery with a pre-decided villain or a clear-cut morally-correct faction. "## Adventure Hooks" must contain at least three distinct, playable hooks that follow from the conflict or mystery, the resources, or the travel hazards already established — not generic fetch-quest premises.

${realismGuidance}

${NAME_BAN_PROMPT}${nameRestrictions}

Before returning the JSON, perform one internal validation: confirm "summary" describes the whole system, not one body or station; confirm nothing was written under "## Major Bodies" in "lore"; confirm "starType" matches the spectral classification actually named in "## The Star(s)"; confirm "bodies" has between 3 and 12 entries with no "parentName", each with its own strictly-increasing "distanceAU", and that every entry with a "parentName" exactly matches another entry's "name" (never the star); confirm every body has a non-empty "description" that states a concrete economic, survival, travel, or conflict role, not just a physical description; confirm every faction, hazard, and hook you named is consistent with the civilisation level and system character, that each faction's stated territory matches a named body, and that no faction or side of the central conflict is written as simply right or simply villainous; confirm the conflict or mystery is foreshadowed elsewhere in the lore rather than appearing out of nowhere; confirm resource and material descriptions follow the Scientific Realism and genre guidance above rather than defaulting to unexplained exotic substances; and re-read every sentence in "bodies" and "lore" for wording slips — duplicated or mismatched punctuation (e.g. "..", "—-", stray double spaces), a body's type or name written inconsistently between its own entry and any place it's mentioned elsewhere, and no numeric designation or name reused. Quietly correct any mismatch, then return only the corrected final JSON.`,
  };
}

/** Parse an AI star system draft into the public generator output contract. */
export function parseStarSystemResponse(
  text: string,
  avoidNames: readonly string[] = [],
): PublicGeneratorOutput {
  const data = parseFencedJson<{
    title?: unknown;
    summary?: unknown;
    lore?: unknown;
    labels?: unknown;
    bodies?: unknown;
    starType?: unknown;
  }>(text);

  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("Star system response is missing a title.");
  }
  if (typeof data.lore !== "string" || !data.lore.trim()) {
    throw new Error("Star system response is missing lore.");
  }
  const forbidden = new Set(
    [...BANNED_NAMES, ...avoidNames].map((name) => name.trim().toLowerCase()),
  );
  if (forbidden.has(data.title.trim().toLowerCase())) {
    throw new Error("Star system response uses a banned title.");
  }

  const labels = [
    "star-system",
    ...(Array.isArray(data.labels)
      ? data.labels.filter(
          (label): label is string =>
            typeof label === "string" && !!label.trim(),
        )
      : []),
  ].filter((label, index, all) => all.indexOf(label) === index);

  const title = data.title.trim();
  const bodies = parseStarSystemBodies(data.bodies);
  // "bodies" is now the sole source of truth for Major Bodies — if the AI
  // didn't populate it properly there's nothing reliable to render or to
  // drive the diagram, so fail this draft rather than show an empty section.
  if (bodies.length < 3) {
    throw new Error(
      "Star system response is missing a usable major-bodies list.",
    );
  }
  const rawLore = sanitizeText(data.lore.trim());
  const lore = replaceMajorBodiesSection(
    rawLore,
    formatMajorBodies(bodies, title),
  );
  const starType =
    typeof data.starType === "string" ? data.starType.trim() : "";
  return {
    type: "location",
    title,
    summary: typeof data.summary === "string" ? sanitizeText(data.summary) : "",
    content: "",
    lore,
    labels,
    status: "active",
    bodies,
    ...(starType ? { starType } : {}),
  };
}

/**
 * Validates the AI's structured "bodies" array against itself: drops entries
 * missing a name/type, and drops any parentName that doesn't match another
 * body's name in the same array (a hallucinated or misspelled reference would
 * otherwise break the diagram layout rather than just being an orphan node).
 */
function parseStarSystemBodies(raw: unknown): StarSystemBody[] {
  if (!Array.isArray(raw)) return [];
  const candidates = raw
    .map((entry): StarSystemBody | undefined => {
      if (typeof entry !== "object" || entry === null) return undefined;
      const { name, type, description, parentName, distanceAU } =
        entry as Record<string, unknown>;
      if (typeof name !== "string" || !name.trim()) return undefined;
      if (typeof type !== "string" || !type.trim()) return undefined;
      if (typeof description !== "string" || !description.trim()) {
        return undefined;
      }
      return {
        name: sanitizeText(name),
        type: sanitizeText(type),
        description: sanitizeText(description),
        ...(typeof parentName === "string" && parentName.trim()
          ? { parentName: sanitizeText(parentName) }
          : {}),
        ...(typeof distanceAU === "number" &&
        Number.isFinite(distanceAU) &&
        distanceAU > 0
          ? { distanceAU }
          : {}),
      };
    })
    .filter((body): body is StarSystemBody => body !== undefined);

  const knownNames = new Set(candidates.map((body) => body.name));
  return candidates.map((body) =>
    body.parentName && knownNames.has(body.parentName)
      ? body
      : {
          name: body.name,
          type: body.type,
          description: body.description,
          ...(body.distanceAU !== undefined
            ? { distanceAU: body.distanceAU }
            : {}),
        },
  );
}
