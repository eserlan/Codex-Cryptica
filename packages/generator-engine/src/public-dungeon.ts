/**
 * Public Dungeon / Delve generator — framework-free, theme-aware.
 *
 * Generates structured, multi-sector subterranean complexes, ruins, alien vaults,
 * and monster lairs using Codex Cryptica's world theme system.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { themeIdToLabel } from "./public-faction-constants";
import {
  dungeonConfig,
  GENRE_HINTS,
  SAMPLE_TITLES_BY_GENRE,
  HISTORIES_BY_GENRE,
  SIGNATURE_FEATURES_BY_GENRE,
  CONFLICTS_BY_GENRE,
  SECTORS_BY_GENRE,
  INHABITANTS_BY_GENRE,
  SECRETS_BY_GENRE,
  HAZARDS_BY_GENRE,
  TREASURES_BY_GENRE,
  HOOKS_BY_GENRE,
} from "./public-dungeon-constants";

export { dungeonConfig };

export interface DungeonGeneratorOptions {
  themeId?: string;
  genre?: string;
  purpose?: string;
  currentState?: string;
  scale?: string;
  instruction?: string;
}

export interface DungeonSector {
  name: string;
  description: string;
}

export interface ResolvedDungeon {
  themeId: string;
  genre: string;
  purpose: string;
  currentState: string;
  scale: string;
  title: string;
  premise: string;
  history: string;
  signatureFeature: string;
  currentConflict: string;
  sectors: DungeonSector[];
  inhabitants: string;
  secret: string;
  hazards: string;
  treasures: string;
  hooks: string;
}

export interface DungeonPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedDungeon;
}

function forGenre<T>(record: Record<string, T[]>, genre: string): T[] {
  return (
    record[genre] ??
    record[genre.replace(/ \/ .*/, "")] ??
    record["Fantasy"] ??
    record["Classic Fantasy"]
  );
}

function resolveDungeon(
  options: DungeonGeneratorOptions,
  rng: Rng = defaultRng,
): ResolvedDungeon {
  const themeId = options.themeId || "fantasy";
  const genre = options.genre || themeIdToLabel[themeId] || "Classic Fantasy";

  const purpose = options.purpose || pickFrom(dungeonConfig.purposes, rng);
  const currentState =
    options.currentState || pickFrom(dungeonConfig.currentStates, rng);
  const scale = options.scale || pickFrom(dungeonConfig.scales, rng);

  const titles = forGenre(SAMPLE_TITLES_BY_GENRE, genre);
  const title = pickFrom(titles, rng);

  const premise = `${title} — A ${scale.toLowerCase()} ${purpose.toLowerCase()} currently serving as an ${currentState.toLowerCase()}.`;

  const histories = forGenre(HISTORIES_BY_GENRE, genre);
  const history = pickFrom(histories, rng);

  const signatureFeatures = forGenre(SIGNATURE_FEATURES_BY_GENRE, genre);
  const signatureFeature = pickFrom(signatureFeatures, rng);

  const conflicts = forGenre(CONFLICTS_BY_GENRE, genre);
  const currentConflict = pickFrom(conflicts, rng);

  const availableSectors = forGenre(SECTORS_BY_GENRE, genre);
  const sectorCount = scale.includes("Small")
    ? 2
    : scale.includes("Sprawling")
      ? 4
      : 3;
  const sectors = pickRandomItems(availableSectors, sectorCount, rng);

  const inhabitantsList = forGenre(INHABITANTS_BY_GENRE, genre);
  const inhabitants = pickFrom(inhabitantsList, rng);

  const secretsList = forGenre(SECRETS_BY_GENRE, genre);
  const secret = pickFrom(secretsList, rng);

  const hazardsList = forGenre(HAZARDS_BY_GENRE, genre);
  const hazards = pickFrom(hazardsList, rng);

  const treasuresList = forGenre(TREASURES_BY_GENRE, genre);
  const treasures = pickFrom(treasuresList, rng);

  const hooksList = forGenre(HOOKS_BY_GENRE, genre);
  const hooks = pickFrom(hooksList, rng);

  return {
    themeId,
    genre,
    purpose,
    currentState,
    scale,
    title,
    premise,
    history,
    signatureFeature,
    currentConflict,
    sectors,
    inhabitants,
    secret,
    hazards,
    treasures,
    hooks,
  };
}

/**
 * Generate a local, offline dungeon concept without network or LLM calls.
 */
export function generateDungeonLocal(
  options: DungeonGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const dungeon = resolveDungeon(options, rng);

  const sectorsFormatted = dungeon.sectors
    .map((s, idx) => `### Sector ${idx + 1}: ${s.name}\n${s.description}`)
    .join("\n\n");

  const lore = [
    `## History & Original Purpose`,
    dungeon.history,
    ``,
    `## Current State & Function`,
    dungeon.currentState,
    ``,
    `## Signature Feature`,
    dungeon.signatureFeature,
    ``,
    `## Current Conflict`,
    dungeon.currentConflict,
    ``,
    `## Key Sectors & Layout`,
    sectorsFormatted,
    ``,
    `## Inhabitants & Factions`,
    dungeon.inhabitants,
    ``,
    `## Central Secret / Boss Mystery`,
    dungeon.secret,
    ``,
    `## Hazards & Traps`,
    dungeon.hazards,
    ``,
    `## Treasures & Artifacts`,
    dungeon.treasures,
    ``,
    `## Adventure Hooks & Rumours`,
    dungeon.hooks,
  ].join("\n");

  return {
    type: "location",
    title: dungeon.title,
    summary: dungeon.premise,
    content: lore,
    lore,
    labels: [
      "dungeon",
      "location",
      dungeon.genre.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      dungeon.purpose.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    ],
    status: "active",
  };
}

/**
 * Build the AI prompt for generating a Dungeon concept via LLM.
 */
export function buildDungeonPrompt(
  options: DungeonGeneratorOptions,
): DungeonPrompt {
  const dungeon = resolveDungeon(options);
  const genreHint =
    GENRE_HINTS[dungeon.genre] ||
    GENRE_HINTS["Classic Fantasy"] ||
    GENRE_HINTS["Fantasy"];

  const systemInstruction = `You are a master worldbuilder and TTRPG dungeon designer creating evocative, campaign-ready subterranean complexes, ancient ruins, alien vaults, or tech facilities.
  
Return ONLY a single valid JSON object matching the requested schema. ${NAME_BAN_PROMPT}`;

  const userMessage = `Create a detailed, original ${dungeon.genre} dungeon / delve concept.

Setting Context:
- Active Theme / Genre: ${dungeon.genre} (${genreHint})
- Original Purpose: ${dungeon.purpose}
- Current State: ${dungeon.currentState}
- Scale: ${dungeon.scale}
${options.instruction ? `- Special Instructions: ${options.instruction}` : ""}

Required JSON schema:
{
  "title": "Evocative Name of the Delve",
  "summary": "1-2 sentence premise of why this location is interesting.",
  "history": "Original purpose and the event(s) that transformed it into its current state.",
  "currentState": "How the delve functions today and its current operational condition.",
  "signatureFeature": "One distinctive, memorable landmark or phenomenon that defines this location.",
  "currentConflict": "An active tension already unfolding before the PCs arrive.",
  "sectors": [
    { "name": "Sector Name 1", "description": "Description of this area/level." },
    { "name": "Sector Name 2", "description": "Description of this area/level." },
    { "name": "Sector Name 3", "description": "Description of this area/level." }
  ],
  "inhabitants": "Dominant inhabitants, rivals, guardians, and their internal relationship dynamic.",
  "secret": "The central mystery, hidden truth, or boss-level complication at the heart of the location.",
  "hazards": "Environmental, structural, trap, or security dangers.",
  "treasures": "Notable loot, relics, technology, or valuable knowledge.",
  "hooks": "2-3 adventure hooks and rumours circulating about this delve."
}`;

  return {
    systemInstruction,
    userMessage,
    resolved: dungeon,
  };
}

/**
 * Parse an AI JSON response for a Dungeon concept, falling back to local generator on error.
 */
export function parseDungeonResponse(
  rawText: string,
  options: DungeonGeneratorOptions = {},
): PublicGeneratorOutput {
  try {
    const parsed = parseFencedJson<Record<string, unknown>>(rawText);

    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : "The Hidden Delve";

    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "An unexplored subterranean complex filled with danger.";

    const history =
      typeof parsed.history === "string" ? parsed.history.trim() : "";
    const currentState =
      typeof parsed.currentState === "string" ? parsed.currentState.trim() : "";
    const signatureFeature =
      typeof parsed.signatureFeature === "string"
        ? parsed.signatureFeature.trim()
        : "";
    const currentConflict =
      typeof parsed.currentConflict === "string"
        ? parsed.currentConflict.trim()
        : "";

    const rawSectors = Array.isArray(parsed.sectors) ? parsed.sectors : [];
    const sectors: DungeonSector[] = rawSectors.map(
      (s: Record<string, unknown>, idx: number) => ({
        name: typeof s?.name === "string" ? s.name : `Sector ${idx + 1}`,
        description:
          typeof s?.description === "string"
            ? s.description
            : "An unexplored section.",
      }),
    );

    const inhabitants =
      typeof parsed.inhabitants === "string" ? parsed.inhabitants.trim() : "";
    const secret =
      typeof parsed.secret === "string" ? parsed.secret.trim() : "";
    const hazards =
      typeof parsed.hazards === "string" ? parsed.hazards.trim() : "";
    const treasures =
      typeof parsed.treasures === "string" ? parsed.treasures.trim() : "";
    const hooks = typeof parsed.hooks === "string" ? parsed.hooks.trim() : "";

    const sectorsFormatted =
      sectors.length > 0
        ? sectors
            .map(
              (s, idx) => `### Sector ${idx + 1}: ${s.name}\n${s.description}`,
            )
            .join("\n\n")
        : "### Sector 1: The Main Complex\nAn ancient subterranean structure.";

    const lore = [
      history ? `## History & Original Purpose\n${history}\n` : "",
      currentState ? `## Current State & Function\n${currentState}\n` : "",
      signatureFeature ? `## Signature Feature\n${signatureFeature}\n` : "",
      currentConflict ? `## Current Conflict\n${currentConflict}\n` : "",
      `## Key Sectors & Layout\n${sectorsFormatted}\n`,
      inhabitants ? `## Inhabitants & Factions\n${inhabitants}\n` : "",
      secret ? `## Central Secret / Boss Mystery\n${secret}\n` : "",
      hazards ? `## Hazards & Traps\n${hazards}\n` : "",
      treasures ? `## Treasures & Artifacts\n${treasures}\n` : "",
      hooks ? `## Adventure Hooks & Rumours\n${hooks}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const themeId = options.themeId || "fantasy";
    const genre = options.genre || themeIdToLabel[themeId] || "Classic Fantasy";

    return {
      type: "location",
      title,
      summary,
      content: lore,
      lore,
      labels: [
        "dungeon",
        "location",
        genre.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      ],
      status: "active",
    };
  } catch {
    return generateDungeonLocal(options);
  }
}
