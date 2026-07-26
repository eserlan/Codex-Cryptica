/**
 * Public Dungeon / Delve generator — framework-free, theme-aware.
 *
 * Generates structured, multi-sector subterranean complexes, ruins, alien vaults,
 * and monster lairs using Codex Cryptica's world theme system.
 *
 * Generation method — Purpose/Construction/Ruination as paired dice-style axes,
 * factions built from virtue/vice + goal/obstacle, and a pointcrawl-style sector
 * map — is patterned after the "Dungeon Seeds" procedure in the Cairn RPG
 * Warden's Guide (2nd Edition) by Yochai Gal, https://cairnrpg.com (text CC
 * BY-SA 4.0). All table entries below are original; only the compositional
 * method is borrowed. See public-dungeon-constants.ts for the full notice.
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
  BUILDER_BY_GENRE,
  ORIGINAL_USE_BY_GENRE,
  ENTRANCE_BY_GENRE,
  COMPOSITION_BY_GENRE,
  CONDITION_BY_GENRE,
  CAUSE_BY_GENRE,
  SIGNATURE_FEATURES_BY_GENRE,
  SECTORS_BY_GENRE,
  INHABITANTS_BY_GENRE,
  FACTION_NAMES_BY_GENRE,
  FACTION_VIRTUES,
  FACTION_VICES,
  FACTION_GOALS,
  FACTION_OBSTACLES,
  SECTOR_CONNECTORS,
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

const STOCK_TYPES = ["Monster", "Lore", "Special", "Trap"] as const;
type DungeonStockType = (typeof STOCK_TYPES)[number];

function isStockType(v: unknown): v is DungeonStockType {
  return (
    typeof v === "string" && (STOCK_TYPES as readonly string[]).includes(v)
  );
}

export interface DungeonSector {
  name: string;
  description: string;
  /** Cairn-style room-stocking bucket: Monster / Lore / Special / Trap. */
  stockType?: DungeonStockType;
  stockDetail?: string;
}

export interface DungeonSectorEdge {
  from: number;
  to: number;
  via: string;
}

export interface DungeonFaction {
  name: string;
  virtue: string;
  vice: string;
  goal: string;
  obstacle: string;
}

export interface ResolvedDungeon {
  themeId: string;
  genre: string;
  purpose: string;
  currentState: string;
  scale: string;
  title: string;
  premise: string;
  builder: string;
  originalUse: string;
  entrance: string;
  composition: string;
  condition: string;
  cause: string;
  history: string;
  currentStateDetail: string;
  signatureFeature: string;
  factions: DungeonFaction[];
  currentConflict: string;
  sectors: DungeonSector[];
  sectorEdges: DungeonSectorEdge[];
  map: string;
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

/** Roll a Cairn-style d6 room-stocking bucket: 1 Monster / 2-3 Lore / 4 Special / 5-6 Trap. */
function rollStockType(rng: Rng): DungeonStockType {
  const roll = Math.floor(rng() * 6) + 1;
  if (roll === 1) return "Monster";
  if (roll <= 3) return "Lore";
  if (roll === 4) return "Special";
  return "Trap";
}

/** Pick an item from a genre pool, avoiding anything already in `used` when possible. */
function pickUnused<T extends string>(
  pool: readonly T[],
  used: Set<string>,
  rng: Rng,
): T {
  const remaining = pool.filter((f) => !used.has(f));
  const picked = pickFrom(remaining.length > 0 ? remaining : pool, rng);
  used.add(picked);
  return picked;
}

function pickStockDetail(
  stockType: DungeonStockType,
  genre: string,
  usedByType: Record<DungeonStockType, Set<string>>,
  rng: Rng,
): string {
  const pool =
    stockType === "Monster"
      ? forGenre(INHABITANTS_BY_GENRE, genre)
      : stockType === "Lore"
        ? forGenre(HOOKS_BY_GENRE, genre)
        : stockType === "Special"
          ? forGenre(SIGNATURE_FEATURES_BY_GENRE, genre)
          : forGenre(HAZARDS_BY_GENRE, genre);
  return pickUnused(pool, usedByType[stockType], rng);
}

/** Capitalize the first letter, for sentences that open with a lowercase faction name like "the X". */
function sentenceCase(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Strip a leading "held back by"/"struggling against" lead-in and trailing period an
 * AI response may have added to an obstacle string, since callers add their own lead-in.
 */
function sanitizeObstacle(s: string): string {
  return s
    .replace(/^\s*(held back by|struggling against)\s*/i, "")
    .trim()
    .replace(/\.+$/, "");
}

/** Strip a leading "Seeks"/"Seeking" an AI response may have added to a goal, since callers add their own lead-in. */
function sanitizeGoal(s: string): string {
  return s
    .replace(/^\s*(seeks|seeking)\s*/i, "")
    .trim()
    .replace(/\.+$/, "");
}

interface UsedFactionTraits {
  names: Set<string>;
  goals: Set<string>;
  obstacles: Set<string>;
}

/** Generate a named faction with Cairn-style virtue/vice traits and a goal/obstacle agenda. */
function generateFaction(
  genre: string,
  rng: Rng,
  used: UsedFactionTraits,
): DungeonFaction {
  const name = pickUnused(
    forGenre(FACTION_NAMES_BY_GENRE, genre),
    used.names,
    rng,
  );
  const goal = pickUnused(FACTION_GOALS, used.goals, rng);
  const obstacle = pickUnused(FACTION_OBSTACLES, used.obstacles, rng);
  return {
    name,
    virtue: pickFrom(FACTION_VIRTUES, rng),
    vice: pickFrom(FACTION_VICES, rng),
    goal,
    obstacle,
  };
}

/**
 * Render a lightweight pointcrawl as a wrap-friendly numbered list (not a fenced
 * ASCII diagram — fixed-width unicode chains don't reflow on narrow screens).
 */
function renderDungeonMap(
  sectorNames: string[],
  edges: DungeonSectorEdge[],
): string {
  if (sectorNames.length === 0) return "";
  const steps = sectorNames.map((n, i) => `${i + 1}. ${n}`).join("\n");
  const branches = edges.filter((e) => e.to !== e.from + 1);
  if (branches.length === 0) return steps;
  const branchLines = branches.map(
    (e) =>
      `*Shortcut: ${sectorNames[e.from]} ↔ ${sectorNames[e.to]}, via ${e.via}.*`,
  );
  return [steps, "", ...branchLines].join("\n");
}

/**
 * Sector count for a scale label, matching dungeonConfig.scales' documented ranges:
 * Small Lair 1-2, Medium Complex 3-4, Sprawling Megadungeon 5+ (capped by available templates).
 */
function sectorCountForScale(scale: string, rng: Rng): number {
  if (scale.includes("Small")) return 1 + Math.floor(rng() * 2); // 1-2
  if (scale.includes("Sprawling")) return 5 + Math.floor(rng() * 2); // 5-6
  return 3 + Math.floor(rng() * 2); // 3-4 (Medium, and any custom scale)
}

/** Build the linear pointcrawl chain, plus an optional non-adjacent shortcut for larger dungeons. */
function buildSectorEdges(sectorCount: number, rng: Rng): DungeonSectorEdge[] {
  const edges: DungeonSectorEdge[] = [];
  for (let i = 0; i < sectorCount - 1; i++) {
    edges.push({ from: i, to: i + 1, via: "the main passage" });
  }
  if (sectorCount >= 3 && rng() < 0.5) {
    edges.push({
      from: 0,
      to: sectorCount - 1,
      via: pickFrom(SECTOR_CONNECTORS, rng),
    });
  }
  return edges;
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

  // Purpose & Construction axes (Cairn-style paired rolls), composed into history.
  const builder = pickFrom(forGenre(BUILDER_BY_GENRE, genre), rng);
  const originalUse = pickFrom(forGenre(ORIGINAL_USE_BY_GENRE, genre), rng);
  const entrance = pickFrom(forGenre(ENTRANCE_BY_GENRE, genre), rng);
  const composition = pickFrom(forGenre(COMPOSITION_BY_GENRE, genre), rng);
  const history = `Raised by ${builder} as ${originalUse}, the delve is entered through ${entrance}, its halls built from ${composition}.`;

  // Ruination axis, composed onto the picked current-state category.
  const condition = pickFrom(forGenre(CONDITION_BY_GENRE, genre), rng);
  const cause = pickFrom(forGenre(CAUSE_BY_GENRE, genre), rng);
  const currentStateDetail = `${currentState} — now ${condition}, the result of ${cause}.`;

  const signatureFeatures = forGenre(SIGNATURE_FEATURES_BY_GENRE, genre);
  const signatureFeature = pickFrom(signatureFeatures, rng);

  // Two rival factions (virtue/vice + goal/obstacle) drive inhabitants and conflict together,
  // so the two sections stay internally consistent rather than being picked independently.
  // Names, goals, and obstacles are each drawn distinct across the pair so the two factions
  // don't read as reskins of each other.
  const usedFactionTraits: UsedFactionTraits = {
    names: new Set(),
    goals: new Set(),
    obstacles: new Set(),
  };
  const factionA = generateFaction(genre, rng, usedFactionTraits);
  const factionB = generateFaction(genre, rng, usedFactionTraits);
  const factions = [factionA, factionB];

  const inhabitants = sentenceCase(
    `${factionA.name} (${factionA.virtue.toLowerCase()}, but ${factionA.vice.toLowerCase()}) hold the upper hand here, opposed by ${factionB.name} (${factionB.virtue.toLowerCase()}, but ${factionB.vice.toLowerCase()}).`,
  );
  const currentConflict = sentenceCase(
    `${factionA.name} pursue ${factionA.goal.toLowerCase()}, held back by ${factionA.obstacle}. ${sentenceCase(factionB.name)} want these halls for themselves — driven by ${factionB.goal.toLowerCase()}, and struggling against ${factionB.obstacle} — putting the two factions on a collision course.`,
  );

  const secretsList = forGenre(SECRETS_BY_GENRE, genre);
  const secret = pickFrom(secretsList, rng);

  const hazardsList = forGenre(HAZARDS_BY_GENRE, genre);
  const hazards = pickFrom(hazardsList, rng);

  const treasuresList = forGenre(TREASURES_BY_GENRE, genre);
  const treasures = pickFrom(treasuresList, rng);

  const hooksList = forGenre(HOOKS_BY_GENRE, genre);
  const hooks = pickFrom(hooksList, rng);

  const availableSectors = forGenre(SECTORS_BY_GENRE, genre);
  const sectorCount = Math.min(
    sectorCountForScale(scale, rng),
    availableSectors.length,
  );
  const pickedSectors = pickRandomItems(availableSectors, sectorCount, rng);
  // Seed each bucket's "used" set with the matching global pick (e.g. the Lore bucket
  // with the global Hooks text) so a sector never just echoes what's already stated
  // elsewhere in the document.
  const usedByType: Record<DungeonStockType, Set<string>> = {
    Monster: new Set(),
    Lore: new Set([hooks]),
    Special: new Set([signatureFeature]),
    Trap: new Set([hazards]),
  };
  const sectors: DungeonSector[] = pickedSectors.map((s) => {
    const stockType = rollStockType(rng);
    const stockDetail = pickStockDetail(stockType, genre, usedByType, rng);
    return { name: s.name, description: s.description, stockType, stockDetail };
  });

  const sectorEdges = buildSectorEdges(sectors.length, rng);
  const map = renderDungeonMap(
    sectors.map((s) => s.name),
    sectorEdges,
  );

  return {
    themeId,
    genre,
    purpose,
    currentState,
    scale,
    title,
    premise,
    builder,
    originalUse,
    entrance,
    composition,
    condition,
    cause,
    history,
    currentStateDetail,
    signatureFeature,
    factions,
    currentConflict,
    sectors,
    sectorEdges,
    map,
    inhabitants,
    secret,
    hazards,
    treasures,
    hooks,
  };
}

/**
 * Compact plain-text rendering of everything resolveDungeon() already generated,
 * so the AI prompt embellishes a locally-generated foundation instead of
 * silently discarding it and inventing an unrelated dungeon from scratch.
 */
function formatDungeonFoundation(dungeon: ResolvedDungeon): string {
  const factionLines = dungeon.factions
    .map(
      (f) =>
        `  - ${f.name} — ${f.virtue}, but ${f.vice}. Seeks ${f.goal}; held back by ${f.obstacle}.`,
    )
    .join("\n");
  const sectorLines = dungeon.sectors
    .map(
      (s, idx) =>
        `  ${idx + 1}. "${s.name}" — ${s.description}${
          s.stockType && s.stockDetail
            ? ` [${s.stockType}: ${s.stockDetail}]`
            : ""
        }`,
    )
    .join("\n");

  return [
    `- Title seed: ${dungeon.title}`,
    `- History: ${dungeon.history}`,
    `- Current Condition: ${dungeon.currentStateDetail}`,
    `- Signature Feature: ${dungeon.signatureFeature}`,
    `- Factions:`,
    factionLines,
    `- Current Conflict: ${dungeon.currentConflict}`,
    `- Sectors:`,
    sectorLines,
    `- Central Secret: ${dungeon.secret}`,
    `- Hazards: ${dungeon.hazards}`,
    `- Treasures: ${dungeon.treasures}`,
    `- Hooks: ${dungeon.hooks}`,
  ].join("\n");
}

function formatFactionsList(factions: DungeonFaction[]): string {
  return factions
    .map(
      (f) =>
        `- **${f.name}** — ${f.virtue}, but ${f.vice}. Seeks ${sanitizeGoal(f.goal)}; held back by ${sanitizeObstacle(f.obstacle)}.`,
    )
    .join("\n");
}

function formatSector(s: DungeonSector, idx: number): string {
  const stockLine =
    s.stockType && s.stockDetail
      ? `\n\n*${s.stockType} — ${s.stockDetail}*`
      : "";
  return `### Sector ${idx + 1}: ${s.name}\n${s.description}${stockLine}`;
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
    .map((s, idx) => formatSector(s, idx))
    .join("\n\n");

  // Main column: the narrative — what the dungeon is and why it matters.
  const content = [
    `## History & Original Purpose`,
    dungeon.history,
    ``,
    `## Current State & Function`,
    dungeon.currentStateDetail,
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
    formatFactionsList(dungeon.factions),
  ].join("\n");

  // Right rail / GM quick reference: what you need at the table.
  const lore = [
    `### Dungeon Layout`,
    dungeon.map,
    ``,
    `### Central Secret / Boss Mystery`,
    dungeon.secret,
    ``,
    `### Hazards & Traps`,
    dungeon.hazards,
    ``,
    `### Treasures & Artifacts`,
    dungeon.treasures,
    ``,
    `### Adventure Hooks & Rumours`,
    dungeon.hooks,
  ].join("\n");

  return {
    type: "location",
    title: dungeon.title,
    summary: dungeon.premise,
    content,
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

  const systemInstruction = `You are a master worldbuilder and TTRPG dungeon designer turning a locally-generated dungeon skeleton into evocative, campaign-ready prose.

You will be given a "Locally-generated foundation" of already-decided facts: title seed, history, condition, signature feature, two named factions with goals/obstacles, the conflict between them, named sectors with stocked content, a secret, hazards, treasures, and hooks. Elaborate and dramatize every one of these into vivid prose — do NOT rename factions or sectors, do NOT invent a different conflict, and do NOT contradict any given fact. Your job is embellishment, not reinvention.

Return ONLY a single valid JSON object matching the requested schema. ${NAME_BAN_PROMPT}`;

  const userMessage = `Expand the locally-generated dungeon foundation below into a detailed, original ${dungeon.genre} dungeon / delve write-up.

Setting Context:
- Active Theme / Genre: ${dungeon.genre} (${genreHint})
- Original Purpose: ${dungeon.purpose}
- Current State: ${dungeon.currentState}
- Scale: ${dungeon.scale}
${options.instruction ? `- Special Instructions: ${options.instruction}` : ""}

Locally-generated foundation (embellish; keep every named fact intact):
${formatDungeonFoundation(dungeon)}

Required JSON schema:
{
  "title": "Evocative name for the delve, may refine the title seed above.",
  "summary": "1-2 sentence premise of why this location is interesting.",
  "history": "Vivid prose expansion of the given History fact — same facts, richer telling.",
  "currentState": "Vivid prose expansion of the given Current Condition fact.",
  "signatureFeature": "Vivid prose expansion of the given Signature Feature.",
  "factions": [
    { "name": "(reuse Faction A's given name exactly)", "virtue": "One-word virtue", "vice": "One-word vice", "goal": "(reuse Faction A's given goal exactly — no lead-in word like 'Seeks', do not substitute a different one)", "obstacle": "(the given obstacle only — no lead-in words like 'held back by' or 'struggling against', no trailing period)" },
    { "name": "(reuse Faction B's given name exactly)", "virtue": "One-word virtue", "vice": "One-word vice", "goal": "(reuse Faction B's given goal exactly — no lead-in word like 'Seeks', do not substitute a different one)", "obstacle": "(the given obstacle only — no lead-in words, no trailing period)" }
  ],
  "currentConflict": "Vivid prose expansion of the given Current Conflict, naming both factions.",
  "sectors": [
    { "name": "(reuse a given sector's quoted name exactly, with no leading number and no added prefix)", "description": "Expanded description of this area/level.", "stockType": "Monster | Lore | Special | Trap", "stockDetail": "Expansion of the given stocked content for this sector." }
  ],
  "inhabitants": "How the two named factions relate to each other, referencing both by name.",
  "secret": "Vivid prose expansion of the given Central Secret.",
  "hazards": "Vivid prose expansion of the given Hazards.",
  "treasures": "Vivid prose expansion of the given Treasures.",
  "hooks": "2-3 adventure hooks and rumours, expanding the given Hooks."
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
  rng: Rng = defaultRng,
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
        stockType: isStockType(s?.stockType) ? s.stockType : undefined,
        stockDetail:
          typeof s?.stockDetail === "string" ? s.stockDetail.trim() : undefined,
      }),
    );

    const rawFactions = Array.isArray(parsed.factions) ? parsed.factions : [];
    const factions: DungeonFaction[] = rawFactions
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
      .map((f) => ({
        name: typeof f.name === "string" ? f.name : "An unnamed faction",
        virtue: typeof f.virtue === "string" ? f.virtue : "",
        vice: typeof f.vice === "string" ? f.vice : "",
        goal: typeof f.goal === "string" ? f.goal : "",
        obstacle: typeof f.obstacle === "string" ? f.obstacle : "",
      }));

    const inhabitants =
      typeof parsed.inhabitants === "string" ? parsed.inhabitants.trim() : "";
    const secret =
      typeof parsed.secret === "string" ? parsed.secret.trim() : "";
    const hazards =
      typeof parsed.hazards === "string" ? parsed.hazards.trim() : "";
    const treasures =
      typeof parsed.treasures === "string" ? parsed.treasures.trim() : "";
    const hooks = typeof parsed.hooks === "string" ? parsed.hooks.trim() : "";

    const sectorEdges = buildSectorEdges(sectors.length, rng);
    const map = renderDungeonMap(
      sectors.map((s) => s.name),
      sectorEdges,
    );

    const sectorsFormatted =
      sectors.length > 0
        ? sectors.map((s, idx) => formatSector(s, idx)).join("\n\n")
        : "### Sector 1: The Main Complex\nAn ancient subterranean structure.";

    const factionsFormatted =
      factions.length > 0 ? formatFactionsList(factions) : "";

    // Main column: the narrative — what the dungeon is and why it matters.
    const content = [
      history ? `## History & Original Purpose\n${history}\n` : "",
      currentState ? `## Current State & Function\n${currentState}\n` : "",
      signatureFeature ? `## Signature Feature\n${signatureFeature}\n` : "",
      currentConflict ? `## Current Conflict\n${currentConflict}\n` : "",
      `## Key Sectors & Layout\n${sectorsFormatted}\n`,
      inhabitants || factionsFormatted
        ? `## Inhabitants & Factions\n${[inhabitants, factionsFormatted].filter(Boolean).join("\n\n")}\n`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Right rail / GM quick reference: what you need at the table.
    const lore = [
      map ? `### Dungeon Layout\n${map}\n` : "",
      secret ? `### Central Secret / Boss Mystery\n${secret}\n` : "",
      hazards ? `### Hazards & Traps\n${hazards}\n` : "",
      treasures ? `### Treasures & Artifacts\n${treasures}\n` : "",
      hooks ? `### Adventure Hooks & Rumours\n${hooks}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const themeId = options.themeId || "fantasy";
    const genre = options.genre || themeIdToLabel[themeId] || "Classic Fantasy";

    return {
      type: "location",
      title,
      summary,
      content,
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
