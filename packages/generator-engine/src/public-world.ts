/**
 * World Generator — an offline-first foundation for detailed sci-fi planets,
 * moons, and artificial worlds. The campaign registry adds vault context when
 * an AI-enhanced draft is requested; this module remains pure and reusable.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { parseFencedJson } from "./llm-response-utils";
import { defaultRng, pickFrom, type Rng } from "./random-utils";

export const worldConfig = {
  worldTypes: [
    "Terrestrial World",
    "Ocean World",
    "Desert World",
    "Ice World",
    "Volcanic World",
    "Gas Giant Moon",
    "Artificial World",
  ],
  habitability: [
    "Earthlike",
    "Marginal",
    "Hostile",
    "Habitable with technology",
    "Impossible without technology",
  ],
  civilisations: [
    "Uninhabited",
    "Colony",
    "Frontier",
    "Developed World",
    "Ecumenopolis",
    "Fallen Civilisation",
  ],
  genres: ["Hard Sci-Fi", "Space Opera", "Cyberpunk", "Hopeful Sci-Fi"],
  names: [
    "Aster Vale",
    "Khepri IV",
    "Nacre",
    "Orison",
    "Vanta Reach",
    "Thalassa",
    "Cinderwake",
  ],
} as const;

export interface WorldGeneratorOptions {
  worldType?: string;
  habitability?: string;
  civilisation?: string;
  genre?: string;
  dominantFeature?: string;
  /** Existing titles to avoid when making a local fallback. */
  avoidNames?: string[];
}

export interface WorldPrompt {
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
  const available = worldConfig.names.filter(
    (name) => !forbidden.has(name.toLowerCase()),
  );
  return pickFrom(available.length ? available : worldConfig.names, rng);
}

function genreLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Generate a complete local draft without network access or vault writes. */
export function generateWorldLocal(
  options: WorldGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const worldType = choose(options.worldType, worldConfig.worldTypes, rng);
  const habitability = choose(
    options.habitability,
    worldConfig.habitability,
    rng,
  );
  const civilisation = choose(
    options.civilisation,
    worldConfig.civilisations,
    rng,
  );
  const genre = choose(options.genre, worldConfig.genres, rng);
  const dominantFeature =
    options.dominantFeature?.trim() ||
    pickFrom(
      [
        "a perpetual twilight belt between a sunward furnace and a frozen nightside",
        "a shattered ring of orbital habitats that throws moving shadows across the equator",
        "an ocean-wide storm system whose calm eye contains the oldest settlements",
        "a planet-spanning transit lattice built by a civilisation that no longer controls it",
      ],
      rng,
    );
  const title = chooseName(options.avoidNames ?? [], rng);
  const atmosphere =
    habitability === "Earthlike"
      ? "Breathable air and a stable biosphere, though local regions remain dangerous."
      : habitability.includes("technology")
        ? "Technically survivable only inside maintained habitats, pressure suits, or adapted enclaves."
        : "Unsafe without specialised protection; the surface itself shapes every political and economic choice.";
  const civilisationDetail =
    civilisation === "Uninhabited"
      ? "There are no permanent settlements, only survey camps, scavengers, and the remains of earlier visitors."
      : civilisation === "Fallen Civilisation"
        ? "Successor communities occupy fragments of an older planetary order, each claiming a different inheritance."
        : `${civilisation} communities have adapted their institutions, trade, and daily life to the planet's hard limits.`;

  const content = [
    "## World Profile",
    `${title} is a ${worldType.toLowerCase()} in a ${genre.toLowerCase()} setting, marked by ${dominantFeature}.`,
    "",
    "## Climate & Geography",
    `Its climate, travel routes, and habitable zones are governed by ${dominantFeature}. Gravity is familiar enough for routine movement but makes unplanned travel beyond protected routes costly.`,
    "",
    "## Atmosphere & Biosphere",
    atmosphere,
    "Life clusters where water, heat, and shelter can be controlled; native ecologies are valuable, dangerous, or both.",
    "",
    "## Settlements, Cultures & Factions",
    civilisationDetail,
    "The largest settlement controls access to the safest routes and life-support infrastructure, while a rival network profits from those left outside it.",
    "",
    "## Economy, Resources & Technology",
    `The world exports a resource made accessible by ${dominantFeature}, while importing the technology and expertise needed to keep its population secure.`,
    "",
    "## Notable Locations",
    "- **The Terminator Exchange** — a neutral market where rival settlements trade power, water, and information.",
    "- **The Quiet Latitude** — a place where the planet's dominant feature becomes briefly predictable, attracting researchers and smugglers alike.",
  ].join("\n");

  const lore = [
    "## Hazards & History",
    `The same conditions that made ${title} valuable have repeatedly stranded expeditions and reshaped local borders. Its history is still argued over because every surviving record serves someone's claim.`,
    "",
    "## Mysteries & Conflicts",
    `A buried system connected to ${dominantFeature} is beginning to behave differently. The people who can explain it disagree on whether it is a warning, a weapon, or an opportunity.`,
    "",
    "## Adventure Hooks",
    "- A missing survey crew has found a route through a forbidden zone, and several factions want their coordinates first.",
    "- The infrastructure that protects a major settlement is failing in a pattern that looks deliberate.",
    "- A local guide offers proof that the world's oldest mystery is not ancient at all — but wants safe passage off-world in return.",
  ].join("\n");

  return {
    type: "location",
    title,
    summary: `${title} is a ${worldType.toLowerCase()} defined by ${dominantFeature}.`,
    content,
    lore,
    labels: [
      "world",
      genreLabel(worldType),
      genreLabel(habitability),
      genreLabel(civilisation),
      genreLabel(genre),
    ],
    status: "active",
  };
}

/** Build the dedicated AI brief; campaign context is prepended by the registry. */
export function buildWorldPrompt(
  options: WorldGeneratorOptions = {},
): WorldPrompt {
  const worldType = options.worldType?.trim() || "world";
  const habitability =
    options.habitability?.trim() || "appropriate habitability";
  const civilisation =
    options.civilisation?.trim() || "an appropriate civilisation";
  const genre = options.genre?.trim() || "sci-fi";
  const dominantFeature =
    options.dominantFeature?.trim() || "an evocative dominant feature";

  return {
    systemInstruction:
      "You are a precise science-fiction worldbuilder. Create an internally consistent, campaign-ready world where environment, society, technology, and conflicts affect each other. Return only one valid JSON object.",
    userMessage: `Create a ${genre} ${worldType} with ${habitability} conditions and ${civilisation}. Its dominant feature is: ${dominantFeature}.

Star-system context may be provided before this brief. When it is, develop this world as part of that system: respect its parent star, orbit, neighbouring bodies, existing factions, and active conflicts. Do not regenerate or contradict the supplied system.

Return JSON with "title", "summary", "labels", "connections", and a markdown "lore" field. The lore must use these exact sections:
## World Profile
## Climate & Geography
## Gravity, Atmosphere & Biosphere
## Settlements, Cultures & Factions
## Economy, Resources & Technology
## Hazards & History
## Notable Locations
## Mysteries & Conflicts
## Adventure Hooks

Make the output a coherent place, not a disconnected list of planetary traits. Include at least two named settlements or factions, three notable locations, one secret or unresolved mystery, and three playable adventure hooks.`,
  };
}

/** Parse an AI world draft into the public generator output contract. */
export function parseWorldResponse(text: string): PublicGeneratorOutput {
  const data = parseFencedJson<{
    title?: unknown;
    summary?: unknown;
    lore?: unknown;
    labels?: unknown;
  }>(text);

  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("World response is missing a title.");
  }
  if (typeof data.lore !== "string" || !data.lore.trim()) {
    throw new Error("World response is missing lore.");
  }

  return {
    type: "location",
    title: data.title.trim(),
    summary: typeof data.summary === "string" ? data.summary.trim() : "",
    content: data.lore.trim(),
    lore: data.lore.trim(),
    labels: Array.isArray(data.labels)
      ? data.labels.filter(
          (label): label is string => typeof label === "string",
        )
      : ["world", "sci-fi", "imported-draft"],
    status: "active",
  };
}
