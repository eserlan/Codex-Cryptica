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
 * "Develop this world" (see star-system-develop-world.ts) to open a fresh
 * World Generator draft pre-populated with this system's context.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { parseFencedJson } from "./llm-response-utils";
import { defaultRng, pickFrom, type Rng } from "./random-utils";
import { BANNED_NAMES, NAME_BAN_PROMPT } from "./public-npc-constants";

export const starSystemConfig = {
  systemTypes: ["Single Star", "Binary System", "Trinary System", "Exotic"],
  genres: [
    "Hard Sci-Fi",
    "Space Opera",
    "Cyberpunk",
    "Post-Collapse",
    "Weird Sci-Fi",
  ],
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
  description: string;
}

/**
 * Builds the "Develop this world" URL for a major body (#1935): opens the
 * World Generator with this body's name, type, and system context
 * pre-populated via query params. Read back on the World Generator page by
 * consumeDevelopWorldParams() in the web app.
 */
function developWorldLink(
  systemTitle: string,
  body: Pick<StarSystemBody, "name" | "type" | "description">,
): string {
  const params = new URLSearchParams({
    developSystem: systemTitle,
    developBody: body.name,
    developBodyType: body.type,
    developContext: `${body.description}. Part of the ${systemTitle} system.`,
  });
  return `/generators/world?${params.toString()}`;
}

/**
 * Turns plain "- **Name** (Type) — description" bullets under a "## Major
 * Bodies" section into "Develop this world" links, without requiring the AI
 * to produce correct URL-encoded markdown itself. Safe to run on any lore
 * text: a missing or differently-formatted section is left untouched.
 */
function linkifyMajorBodies(lore: string, systemTitle: string): string {
  const sectionMatch = lore.match(
    /(^|\n)(## Major Bodies\n)([\s\S]*?)(?=\n## |$)/,
  );
  if (!sectionMatch) return lore;
  const [fullMatch, lead, heading, body] = sectionMatch;
  const relinked = body.replace(
    /^- \*\*([^*]+)\*\* \(([^)]+)\) — (.+)$/gm,
    (_line, name: string, type: string, description: string) => {
      const href = developWorldLink(systemTitle, { name, type, description });
      return `- **[${name}](${href})** (${type}) — ${description}`;
    },
  );
  return lore.replace(fullMatch, `${lead}${heading}${relinked}`);
}

function starDescription(systemType: string, rng: Rng): string {
  if (systemType === "Binary System") {
    return "A close binary pair locks the system into overlapping shadows and complex seasons no single calendar can describe.";
  }
  if (systemType === "Trinary System") {
    return "Three stars in an unstable hierarchy mean the sky itself is a hazard: navigation charts age quickly as the orbits drift.";
  }
  if (systemType === "Exotic") {
    return pickFrom(
      [
        "A dim brown dwarf provides more radiation than light, forcing every settlement to generate its own heat and glow.",
        "A neutron star's radiation belts make most of the system lethal without shielding, but its gravity well is prized for exotic industry.",
        "A rogue star, unbound from any galactic arm, drags a captured retinue of bodies through open space with no wider stellar neighbourhood.",
      ],
      rng,
    );
  }
  return "A single stable star anchors the system, its habitable zone the one variable every faction here has learned to fight over.";
}

/** Generate 3-12 named major bodies with plausible variety. */
function generateBodies(
  systemName: string,
  count: number,
  rng: Rng,
): StarSystemBody[] {
  const usedTypes = new Set<string>();
  return Array.from({ length: count }, (_, index) => {
    let type = pickFrom(starSystemConfig.bodyTypes, rng);
    // Prefer variety across a small system; repeats become acceptable once
    // the pool is exhausted.
    if (usedTypes.size < starSystemConfig.bodyTypes.length) {
      let attempts = 0;
      while (usedTypes.has(type) && attempts < 6) {
        type = pickFrom(starSystemConfig.bodyTypes, rng);
        attempts += 1;
      }
    }
    usedTypes.add(type);
    const designation = ROMAN_NUMERALS[index] ?? `${index + 1}`;
    const useLocalName = rng() < 0.35;
    const name = useLocalName
      ? `${pickFrom(["New", "Port", "Old", "Fort"], rng)} ${pickFrom(["Halden", "Kestrel", "Varga", "Solace", "Ember"], rng)}`
      : `${systemName} ${designation}`;
    return { name, type, description: bodyDescription(type, rng) };
  });
}

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
  const bodyLines = bodies
    .map((b) => `- **${b.name}** (${b.type}) — ${b.description}.`)
    .join("\n");

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

  const content = [
    "## Core Concept",
    `${title} is a ${genre.toLowerCase()} ${systemType.toLowerCase()} system, ${systemCharacter.toLowerCase()} in character and ${civilisationLevel.toLowerCase()} in reach. It matters because of ${strategicValue}, and every faction present here knows it.`,
    "",
    "## The Star(s)",
    starDescription(systemType, rng),
    "",
    "## Major Bodies",
    bodyLines,
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
    content: linkifyMajorBodies(content, title),
    lore,
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
  const realismGuidance =
    normalizedRealism === "hard sci-fi"
      ? "For Hard Sci-Fi realism, keep orbital mechanics, travel times, and technology broadly plausible: no unexplained faster-than-light travel, no reactionless drives, no gravity control invented purely for convenience. Approximate plausibility is enough — do not turn the result into an astrophysics lecture."
      : normalizedRealism === "cinematic"
        ? "For Cinematic realism, speculative technology (artificial gravity, practical FTL corridors, exotic energy sources) is acceptable when it is established clearly and used consistently; keep it from making every problem effortless."
        : "For Grounded realism, allow some generous assumptions but keep technology costly and legible, with clear consequences following from whatever you establish.";

  return {
    systemInstruction:
      "You are a science-fiction worldbuilder creating a coherent, campaign-ready star system for a GM. Prioritise why the system matters — its stakes, factions, and conflicts — over an inventory of astronomical trivia. Return only one valid JSON object.",
    userMessage: `Create a ${genre} star system of type ${systemType}, civilisation level ${civilisationLevel}, with a system character of ${systemCharacter}.

Return JSON with "title", "summary", "labels", "connections", and a markdown "lore" field. Labels must match the actual generated content: include only factual tags supported by the system's type, genre, civilisation level, and character. The lore must use these exact sections:
## Core Concept
## The Star(s)
## Major Bodies
## Settlements & Factions
## Resources & Strategic Importance
## Travel Hazards
## History
## System-Wide Conflict or Mystery
## Adventure Hooks

The system must answer why anyone cares about it, not just what objects orbit the star. Every major body, faction, and hazard should connect back to the system's central stakes — its strategic resource, contested territory, or unresolved conflict — rather than existing as an isolated fact.

Include between 3 and 12 named major bodies in "## Major Bodies" (planets, moons, asteroid belts, stations, megastructures, or notable anomalies), each with a one-line description of why it matters. At least one body must be habitable or settled unless the civilisation level is Unexplored. Give each body a distinct, memorable name — do not number them generically without also giving at least the most important ones a proper name.

"## Settlements & Factions" must name at least two distinct groups with competing interests in the system, grounded in the system's civilisation level. "## Resources & Strategic Importance" must state the concrete reason outside powers care about this system. "## Travel Hazards" must describe a specific, named hazard affecting travel within the system, not a generic warning. "## System-Wide Conflict or Mystery" must be the one unresolved tension that would drive a campaign here, and it must be referenced or foreshadowed by at least one body or faction described earlier in the lore. "## Adventure Hooks" must contain at least three distinct, playable hooks that follow from the conflict or mystery, the resources, or the travel hazards already established — not generic fetch-quest premises.

${realismGuidance}

${NAME_BAN_PROMPT}${nameRestrictions}

Before returning the JSON, perform one internal validation: confirm the major body count is between 3 and 12 and matches what "## Major Bodies" actually lists; confirm every faction, hazard, and hook you named is consistent with the civilisation level and system character; confirm the conflict or mystery is foreshadowed elsewhere in the lore rather than appearing out of nowhere; and confirm no numeric designation or name is reused. Quietly correct any mismatch, then return only the corrected final JSON.`,
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
  return {
    type: "location",
    title,
    summary: typeof data.summary === "string" ? data.summary.trim() : "",
    content: "",
    lore: linkifyMajorBodies(data.lore.trim(), title),
    labels,
    status: "active",
  };
}
