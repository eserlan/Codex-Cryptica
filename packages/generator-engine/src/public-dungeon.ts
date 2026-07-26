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
import { BANNED_NAMES, NAME_BAN_PROMPT } from "./public-npc";
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
  forGenre,
  forGenreTables,
  GENRE_HINTS,
  SAMPLE_TITLES_BY_GENRE,
  BUILDER_BY_GENRE,
  ORIGINAL_USE_BY_PURPOSE,
  ORIGINAL_USE_BY_GENRE,
  ENTRANCE_BY_GENRE,
  COMPOSITION_BY_GENRE,
  CONDITION_BY_STATE,
  CONDITION_BY_GENRE,
  CAUSE_BY_GENRE,
  SIGNATURE_FEATURES_BY_GENRE,
  SECTORS_BY_GENRE,
  FACTION_NAMES_BY_GENRE,
  FACTION_VIRTUES,
  FACTION_VICES,
  FACTION_GOALS,
  SECTOR_CONNECTORS,
  SECRETS_BY_GENRE,
  HAZARDS_BY_GENRE,
  TREASURES_BY_GENRE,
  HOOKS_BY_GENRE,
} from "./public-dungeon-constants";

export { dungeonConfig, forGenre };

export interface DungeonGeneratorOptions {
  themeId?: string;
  genre?: string;
  purpose?: string;
  currentState?: string;
  scale?: string;
  instruction?: string;
  /**
   * Names already used elsewhere in this session.
   *
   * The static ban list only catches well-known clichés. A model has its own
   * narrower repertoire and returns to it — "The Obsidian Directorate" turned
   * up as a faction in both a cyberpunk data vault and a classic-fantasy
   * dwarven observatory, with the same goal and vice both times. Nothing in a
   * stateless prompt can see that, so the caller passes what it has already
   * generated and the model is asked to avoid it.
   */
  avoidNames?: string[];
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
  // Monster and Lore draw from room-scale tables, not the dungeon-wide
  // inhabitants/hooks lists — those describe whole factions and GM-facing
  // prompts, and read wrong when printed as the contents of one room.
  const tables = forGenreTables(genre);
  const pool =
    stockType === "Monster"
      ? tables.roomEncounters
      : stockType === "Lore"
        ? tables.loreFinds
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

/**
 * Strip wrapping quotes and any leading "Sector N:" from an AI-returned sector
 * name. The prompt quotes each name to mark where it starts and ends, and a
 * literal-minded model copies the quotes into the value; formatSector() then
 * renders `### Sector 1: "The Cold Bay"`.
 */
function sanitizeSectorName(s: string): string {
  return s
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/^\s*Sector\s+\d+\s*:\s*/i, "")
    .trim();
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
  virtues: Set<string>;
  vices: Set<string>;
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
  const obstacle = pickUnused(
    forGenreTables(genre).factionObstacles,
    used.obstacles,
    rng,
  );
  return {
    name,
    // Virtue and vice are deduped alongside goal and obstacle: two factions
    // that are both "greedy" read as one faction written twice.
    virtue: pickUnused(FACTION_VIRTUES, used.virtues, rng),
    vice: pickUnused(FACTION_VICES, used.vices, rng),
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
 * Sector count for a scale label, matching dungeonConfig.scales:
 * Small Lair 2, Medium Complex 3-4, Sprawling Megadungeon 5-6.
 *
 * Two is the floor for every scale. The generator unconditionally produces two
 * rival factions contesting the place and renders a navigable layout, and
 * neither means anything in a single room — a one-sector delve came out with
 * both factions fighting over a "descending stairway" and a "threshold" that
 * were not sectors, because there was only one.
 */
function sectorCountForScale(scale: string, rng: Rng): number {
  if (scale.includes("Small")) return 2;
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

  // Offer only purposes/states that suit the active genre. forGenre() handles
  // the "Classic Fantasy" -> "Fantasy" alias and falls back for unlisted genres.
  const purpose =
    options.purpose ||
    pickFrom(forGenre(dungeonConfig.purposesByGenre, genre), rng);
  const currentState =
    options.currentState ||
    pickFrom(forGenre(dungeonConfig.currentStatesByGenre, genre), rng);
  const scale = options.scale || pickFrom(dungeonConfig.scales, rng);

  const titles = forGenre(SAMPLE_TITLES_BY_GENRE, genre);
  const title = pickFrom(titles, rng);

  const premise = `${title} — A ${scale.toLowerCase()} ${purpose.toLowerCase()} currently serving as an ${currentState.toLowerCase()}.`;

  // Purpose & Construction axes (Cairn-style paired rolls), composed into history.
  const builder = pickFrom(forGenre(BUILDER_BY_GENRE, genre), rng);
  // Derived from the selected purpose so the history describes what the user
  // actually asked for. A genre may override the shared wording where its tone
  // clashes; the genre-wide table is only the fallback for custom purposes.
  const originalUse = pickFrom(
    forGenreTables(genre).originalUsesByPurpose?.[purpose] ??
      ORIGINAL_USE_BY_PURPOSE[purpose] ??
      forGenre(ORIGINAL_USE_BY_GENRE, genre),
    rng,
  );
  const entrance = pickFrom(forGenre(ENTRANCE_BY_GENRE, genre), rng);
  const composition = pickFrom(forGenre(COMPOSITION_BY_GENRE, genre), rng);
  const history = `Raised by ${builder} as ${originalUse}, the delve is entered through ${entrance}, its halls built from ${composition}.`;

  // Ruination axis, composed onto the picked current-state category.
  // Derived from the selected current state so the two can't contradict.
  const condition = pickFrom(
    CONDITION_BY_STATE[currentState] ?? forGenre(CONDITION_BY_GENRE, genre),
    rng,
  );
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
    virtues: new Set(),
    vices: new Set(),
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
 * Names from this session's drafts that the model should not reuse.
 *
 * Takes entity titles plus any faction names in their rendered content, which
 * appear as "- **Name** — ...". The leading article is stripped so "the
 * Obsidian Directorate" also blocks "Obsidian Directorate".
 */
export function collectSessionNames(
  entities: Array<{ title?: string; content?: string }>,
  limit = 24,
): string[] {
  const names = new Set<string>();
  for (const entity of entities) {
    const title = entity.title?.trim();
    if (title) names.add(title);
    for (const match of (entity.content ?? "").matchAll(/- \*\*(.+?)\*\* —/g)) {
      const name = match[1].replace(/^the\s+/i, "").trim();
      if (name) names.add(name);
    }
  }
  // Most recent first, capped so the prompt does not balloon over a long session.
  return [...names].reverse().slice(0, limit);
}

/**
 * Render the mechanical rolls as creative seeds plus fixed structural
 * requirements.
 *
 * Deliberately withholds the locally-generated prose. When the prompt handed
 * over finished sentences the model reproduced them verbatim, so output variety
 * was capped by table size (a sprawling delve used the entire six-entry sector
 * pool every time) and most defects were failures to echo imposed text
 * faithfully. The seeds below are starting points to interpret; the structure
 * is the part that must not move.
 */
function formatDungeonSeeds(
  dungeon: ResolvedDungeon,
  avoidNames: string[] = [],
): string {
  const stockPlan = dungeon.sectors
    .map((s, idx) => `  ${idx + 1}. ${s.stockType ?? "Lore"}`)
    .join("\n");

  return [
    `Creative seeds — starting points to interpret. Write your own prose from these;`,
    `do NOT quote them back or treat them as finished text.`,
    `- Built by: ${dungeon.builder}`,
    `- Ruined by: ${dungeon.cause}`,
    `- Present condition: ${dungeon.condition}`,
    `- Entered via: ${dungeon.entrance}`,
    `- Built from: ${dungeon.composition}`,
    `- Faction A wants: ${dungeon.factions[0]?.goal ?? "Survival"} (obstacle: ${dungeon.factions[0]?.obstacle ?? "a rival faction"})`,
    `- Faction B wants: ${dungeon.factions[1]?.goal ?? "Dominion"} (obstacle: ${dungeon.factions[1]?.obstacle ?? "a rival faction"})`,
    ``,
    `Structure — fixed. Honour these exactly.`,
    `- EXACTLY ${dungeon.sectors.length} sectors, in order. Name and describe each one yourself.`,
    `- Each sector's stocked content must match its assigned type:`,
    stockPlan,
    `- EXACTLY 2 factions, opposed, pursuing the two goals above. Name them yourself.`,
    ...(avoidNames.length > 0
      ? [
          ``,
          `Already used elsewhere in this session — pick different names:`,
          ...avoidNames.map((n) => `- ${n}`),
        ]
      : []),
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
  return renderResolvedDungeon(resolveDungeon(options, rng));
}

/**
 * Render an already-resolved dungeon as the public document.
 *
 * Split out from generateDungeonLocal so a rejected AI response can fall back
 * to the exact foundation the prompt was built from, rather than re-rolling a
 * different dungeon than the one the user was told they were getting.
 */
function renderResolvedDungeon(
  dungeon: ResolvedDungeon,
): PublicGeneratorOutput {
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

  const systemInstruction = `You are a master worldbuilder and TTRPG dungeon designer. You write original ${dungeon.genre} delves that a GM can run at the table.

You will be given creative seeds and a fixed structure. The seeds are raw material — interpret them, build on them, and write your own prose. Do not quote them back. The structure (sector count, each sector's stocked-content type, exactly two opposed factions with the stated goals) is fixed and must be honoured precisely.

Everything else is yours to invent: the delve's name, every sector's name and description, the signature feature, the central secret, the hazards, the treasures, the hooks, and both faction names. Make them specific to this delve rather than generic to the genre, and make the whole document internally consistent — the history should explain the present state, the factions' goals should explain the conflict, and the secret should be worth the trip.

Write the "throughline" field first and let it govern everything else. It is one sentence covering who built the delve, what went wrong, and how that leaves it in exactly the Current State given above. Every later field must be consistent with it — if the throughline says the place is occupied and contested, the history cannot end with it permanently sealed or everyone inside dead.

The Current State is a setting the user chose. It is fixed. Whatever went wrong in the history, the place must end up in that stated condition, with both factions able to reach and contest it.

Return ONLY a single valid JSON object matching the requested schema. ${NAME_BAN_PROMPT}`;

  const userMessage = `Write an original ${dungeon.genre} dungeon / delve.

Setting Context:
- Active Theme / Genre: ${dungeon.genre} (${genreHint})
- Original Purpose: ${dungeon.purpose}
- Current State: ${dungeon.currentState}
- Scale: ${dungeon.scale}
${options.instruction ? `- Special Instructions: ${options.instruction}` : ""}

${formatDungeonSeeds(dungeon, options.avoidNames ?? [])}

Required JSON schema:
{
  "title": "Evocative, specific name for this delve.",
  "summary": "1-2 sentence premise of why this location is interesting.",
  "throughline": "ONE sentence: who built it, what went wrong, and how that leaves it in the Current State above. Write this before the fields below and keep them all consistent with it.",
  "history": "Who built it, what for, and what went wrong. Elaborate the throughline from the 'Built by' and 'Ruined by' seeds; it must end where the throughline says it ends.",
  "currentState": "How it functions today and what state it is in, consistent with the '${dungeon.currentState}' setting above.",
  "signatureFeature": "One distinctive landmark or phenomenon that defines this delve. Invent it.",
  "factions": [
    { "name": "Your name for Faction A", "virtue": "One-word virtue", "vice": "One-word vice", "goal": "${dungeon.factions[0]?.goal ?? "Survival"}", "obstacle": "What stands in their way — no lead-in words like 'held back by', no trailing period" },
    { "name": "Your name for Faction B", "virtue": "One-word virtue", "vice": "One-word vice", "goal": "${dungeon.factions[1]?.goal ?? "Dominion"}", "obstacle": "What stands in their way — no lead-in words, no trailing period" }
  ],
  "currentConflict": "How the two factions' goals are colliding right now, naming both.",
  "sectors": [
    // EXACTLY ${dungeon.sectors.length} entries, in the order of the stocked-content plan above.
    { "name": "Your name for this area — no leading number, no 'Sector N:' prefix, no surrounding quote marks", "description": "2-3 sentences of vivid, specific description.", "stockType": "the type assigned to this sector in the plan above", "stockDetail": "One concrete thing here matching that type: a creature for Monster, findable evidence for Lore, a landmark for Special, a danger for Trap." }
  ],
  "inhabitants": "How the two named factions relate to each other, referencing both by name.",
  "secret": "The hidden truth at the heart of this delve. Invent it, and make it connect to the history.",
  "hazards": "The environmental or structural dangers of this place.",
  "treasures": "Notable loot, relics, or knowledge to be found here.",
  "hooks": "2-3 reasons a party would come here, and rumours circulating about it."
}`;

  return {
    systemInstruction,
    userMessage,
    resolved: dungeon,
  };
}

/**
 * Banned names appearing in a field that carries an actual name.
 *
 * The ban list has only ever been a request in the prompt — every call site in
 * the codebase injects it into a string and nothing checks the response. That
 * was tolerable while names came from local tables; now that the model names
 * the delve, its sectors, and both factions, the list is worth enforcing.
 *
 * Checked against name fields only. Descriptions legitimately contain words
 * like "stone" and "ash", and flagging those would reject good responses.
 */
function bannedNamesIn(values: string[], extra: string[] = []): string[] {
  const found = new Set<string>();
  // Multi-word session names are matched whole; single words get a word
  // boundary so "Spine" does not match "Spineless".
  const forbidden = [...BANNED_NAMES, ...extra].filter((n) => n.trim());
  for (const value of values) {
    for (const banned of forbidden) {
      const escaped = banned.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(value)) {
        found.add(banned.trim());
      }
    }
  }
  return [...found];
}

/**
 * Check the structural invariants the mechanical layer owns.
 *
 * The model authors all the prose now, so there is nothing to check for
 * fidelity — we no longer care whether it echoed our sentences. What must hold
 * is the shape: the scale the user picked, the two opposed factions, and one
 * stocked room per sector. A violation means the response is not the dungeon
 * that was asked for, so the caller renders the foundation instead.
 */
function validateAiDungeon(
  title: string,
  throughline: string,
  omitted: readonly string[],
  sectors: DungeonSector[],
  factions: DungeonFaction[],
  foundation: ResolvedDungeon,
  avoidNames: string[] = [],
): string[] {
  const problems: string[] = [];

  // Silently substituting local prose for a field the model skipped puts back
  // the verbatim table text this generator moved away from. Ask for it instead;
  // the foundation is still the floor if the retry also omits it.
  if (omitted.length > 0) {
    problems.push(`missing required fields: ${omitted.join(", ")}`);
  }

  // The throughline is what keeps history, state, and conflict pointing at the
  // same causal chain. A response that skipped it was not planned as a whole.
  if (!throughline) {
    problems.push(
      "no throughline: state in one sentence how the history leaves the delve in the given Current State",
    );
  }

  const names = [
    title,
    ...sectors.map((s) => s.name),
    ...factions.map((f) => f.name),
  ];
  const banned = bannedNamesIn(names);
  if (banned.length > 0) {
    problems.push(`uses banned cliché names: ${banned.join(", ")}`);
  }
  const reused = bannedNamesIn(names, avoidNames).filter(
    (n) => !banned.includes(n),
  );
  if (reused.length > 0) {
    problems.push(
      `reuses names already used elsewhere in this session: ${reused.join(", ")}`,
    );
  }

  if (sectors.length !== foundation.sectors.length) {
    problems.push(
      `expected ${foundation.sectors.length} sectors, got ${sectors.length}`,
    );
  }
  if (sectors.some((s) => !s.name.trim() || !s.description.trim())) {
    problems.push("a sector is missing its name or description");
  }
  const details = sectors
    .map((s) => s.stockDetail?.trim().toLowerCase())
    .filter((d): d is string => !!d);
  if (new Set(details).size !== details.length) {
    problems.push("two sectors share the same stocked content");
  }

  if (factions.length !== 2) {
    problems.push(`expected 2 factions, got ${factions.length}`);
  } else {
    const [a, b] = factions;
    if (a.name.trim().toLowerCase() === b.name.trim().toLowerCase()) {
      problems.push("both factions have the same name");
    }
    if (
      sanitizeGoal(a.goal).toLowerCase() === sanitizeGoal(b.goal).toLowerCase()
    ) {
      problems.push("both factions pursue the same goal");
    }
  }

  return problems;
}

/**
 * Parse an AI JSON response for a Dungeon concept, falling back to local generator on error.
 */
export interface DungeonParseResult {
  output: PublicGeneratorOutput;
  /**
   * Why the response was rejected, empty when it was used. Surfaced so the
   * caller can tell the model what was wrong and give it another attempt
   * rather than silently shipping the local fallback.
   */
  problems: string[];
}

/**
 * Build a corrective follow-up prompt naming what the previous attempt got
 * wrong. The structural requirements are already in the original message, so
 * this only has to point at the violations.
 */
export function buildDungeonRetryMessage(
  userMessage: string,
  problems: string[],
): string {
  return [
    userMessage,
    ``,
    `Your previous response was rejected for these reasons:`,
    ...problems.map((p) => `- ${p}`),
    ``,
    `Return a corrected JSON object that fixes every point above. Keep whatever`,
    `was already good; change only what the list requires.`,
  ].join("\n");
}

export function parseDungeonResponseDetailed(
  rawText: string,
  options: DungeonGeneratorOptions = {},
  rng: Rng = defaultRng,
  /**
   * The locally-resolved dungeon the prompt asked the model to expand.
   *
   * Every section below renders only when its field is non-empty, so anything
   * the model omits disappears from the document silently — a delve came back
   * with no Adventure Hooks at all, and another with one sector out of six.
   * Falling back to the foundation means an incomplete response degrades to
   * the local text for that section instead of dropping it.
   */
  foundation?: ResolvedDungeon,
): DungeonParseResult {
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

    // Each field falls back to the foundation the model was asked to expand,
    // so an omitted key degrades to the local prose rather than deleting the
    // whole section from the document.
    const str = (v: unknown, fallback = "") =>
      typeof v === "string" && v.trim() ? v.trim() : fallback;

    // Which narrative fields the model actually supplied. Checked before the
    // foundation fallbacks below fill them in, since after that an omission is
    // indistinguishable from a real answer.
    const omitted = (
      [
        "history",
        "currentState",
        "signatureFeature",
        "currentConflict",
        "inhabitants",
        "secret",
        "hazards",
        "treasures",
        "hooks",
      ] as const
    ).filter((k) => !(typeof parsed[k] === "string" && parsed[k].trim()));

    // Planning scaffolding: the model writes this first so the fields after it
    // are generated against a single stated causal chain. Not rendered — the
    // summary already covers what the reader needs.
    const throughline = str(parsed.throughline);
    const history = str(parsed.history, foundation?.history ?? "");
    const currentState = str(
      parsed.currentState,
      foundation?.currentStateDetail ?? "",
    );
    const signatureFeature = str(
      parsed.signatureFeature,
      foundation?.signatureFeature ?? "",
    );
    const currentConflict = str(
      parsed.currentConflict,
      foundation?.currentConflict ?? "",
    );

    const rawSectors = Array.isArray(parsed.sectors) ? parsed.sectors : [];
    const sectors: DungeonSector[] = rawSectors.map(
      (s: Record<string, unknown>, idx: number) => ({
        name:
          typeof s?.name === "string" && sanitizeSectorName(s.name)
            ? sanitizeSectorName(s.name)
            : `Sector ${idx + 1}`,
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

    // Structure is the mechanical layer's to guarantee. If the response
    // violates it, ship the foundation the prompt was built from rather than a
    // dungeon that isn't the one the user asked for.
    if (foundation) {
      const problems = validateAiDungeon(
        title,
        throughline,
        omitted,
        sectors,
        factions,
        foundation,
        options.avoidNames ?? [],
      );
      if (problems.length > 0) {
        return { output: renderResolvedDungeon(foundation), problems };
      }
    }

    const inhabitants = str(parsed.inhabitants, foundation?.inhabitants ?? "");
    const secret = str(parsed.secret, foundation?.secret ?? "");
    const hazards = str(parsed.hazards, foundation?.hazards ?? "");
    const treasures = str(parsed.treasures, foundation?.treasures ?? "");
    const hooks = str(parsed.hooks, foundation?.hooks ?? "");

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
      output: {
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
      },
      problems: [],
    };
  } catch {
    // Malformed JSON is worth another attempt too, so report it as a problem
    // rather than quietly returning the fallback.
    return {
      output: foundation
        ? renderResolvedDungeon(foundation)
        : generateDungeonLocal(options),
      problems: [
        "the response was not valid JSON matching the requested schema",
      ],
    };
  }
}

/**
 * Parse an AI dungeon response, discarding the rejection reasons.
 *
 * Kept for callers that cannot retry. Prefer parseDungeonResponseDetailed and
 * a corrective second attempt where a model call is available.
 */
export function parseDungeonResponse(
  rawText: string,
  options: DungeonGeneratorOptions = {},
  rng: Rng = defaultRng,
  foundation?: ResolvedDungeon,
): PublicGeneratorOutput {
  return parseDungeonResponseDetailed(rawText, options, rng, foundation).output;
}
