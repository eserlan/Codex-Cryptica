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
  generatePlaceholderName,
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
  FACTION_IDENTITIES,
  FACTION_VIRTUES,
  FACTION_VICES,
  FACTION_DRIVES,
  FACTION_GOALS_BY_DRIVE,
  FACTION_LEADER_DESCRIPTORS,
  FACTION_NOTABLE_DESCRIPTORS,
  FACTION_STRENGTHS,
  FACTION_INSTABILITY_HOOKS,
  FACTION_ORIGIN_TEMPLATES,
  FACTION_BELIEF_TEMPLATES,
  type FactionLoreContext,
  SECTOR_CONNECTORS,
  SECRETS_BY_GENRE,
  HAZARDS_BY_GENRE,
  TREASURES_BY_GENRE,
  HOOKS_BY_GENRE,
} from "./public-dungeon-constants";
import { formatCampaignContextBlock } from "./campaign-context";

export { dungeonConfig, forGenre };

export interface DungeonGeneratorOptions {
  themeId?: string;
  genre?: string;
  purpose?: string;
  currentState?: string;
  scale?: string;
  instruction?: string;
  /** Free-text world/campaign background from the form's context field. */
  campaignContext?: string;
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
  /**
   * Virtue/vice pairs already used this session. Unlike `avoidNames`, reusing
   * one is reported but never rejects the response — losing a whole dungeon
   * over a repeated adjective is the disproportion this generator already had
   * to correct once.
   */
  avoidTraits?: string[];
}

const STOCK_TYPES = ["Monster", "Lore", "Special", "Trap"] as const;
type DungeonStockType = (typeof STOCK_TYPES)[number];

function isStockType(v: unknown): v is DungeonStockType {
  return (
    typeof v === "string" && (STOCK_TYPES as readonly string[]).includes(v)
  );
}

export interface DungeonSector {
  /**
   * Positional id ("sector-1", "sector-2", ...), fixed by the mechanical
   * layer before any name or description exists — for local generation and
   * for AI generation alike, since sector count and stock-type plan are
   * locked seeds either way. Factions reference sectors by this id, never by
   * name, so a faction's territory can be validated against the dungeon that
   * actually exists rather than whatever string the model wrote.
   */
  id: string;
  name: string;
  description: string;
  /** Cairn-style room-stocking bucket: Monster / Lore / Special / Trap. */
  stockType?: DungeonStockType;
  stockDetail?: string;
}

function sectorId(index: number): string {
  return `sector-${index + 1}`;
}

export interface DungeonSectorEdge {
  from: number;
  to: number;
  via: string;
}

/** A named faction NPC — structured so rendering owns the "Name — description" format, not the model. */
export interface DungeonFactionNpc {
  name: string;
  description: string;
}

export interface DungeonFaction {
  name: string;
  /** What these people are, in plain language — e.g. "A militant religious order fallen into extremism." */
  identity: string;
  virtue: string;
  vice: string;
  /** Concrete, present-tense objective inside this dungeon — what they're doing right now. */
  goal: string;
  /** Underlying motivation the goal serves, e.g. Redemption, Survival, Dominion. */
  drive: string;
  /** Immediate pressure stopping them from just succeeding. */
  obstacle: string;
  /** Why the faction exists and how it became connected to this dungeon. */
  origin: string;
  /** What it believes about the dungeon, its mission, or the current conflict. */
  belief: string;
  /**
   * Sector ids (see DungeonSector.id) it currently controls — never a
   * free-form place name, so territory can be validated against sectors
   * that actually exist rather than geography the model invented.
   */
  territorySectorIds: string[];
  /** Its primary strategic advantage — not just numbers. */
  strength: string;
  leader: DungeonFactionNpc;
  /** A second useful faction NPC and role, distinct from the leader. */
  notable: DungeonFactionNpc;
  /** Specific, actionable relationship to at least one other faction. */
  relationship: string;
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
  /** 2-3 sentences: what each side wants, why that conflicts, why it's unresolved, what makes it unstable. */
  factionSituation: string;
  sectors: DungeonSector[];
  sectorEdges: DungeonSectorEdge[];
  map: string;
  /** Singular by definition — a delve has one central secret. */
  secret: string;
  /**
   * Discrete items a GM picks from, so these are lists rather than prose. The
   * schema previously asked hooks for "2-3 reasons" while typing it a string,
   * and that contradiction is what let an arrayed answer read as a missing one.
   */
  hazards: string[];
  treasures: string[];
  hooks: string[];
  /**
   * Already-established named/described things a faction may reference but
   * must not contradict or replace — the dungeon is authoritative, factions
   * adapt to it. Composed from signatureFeature, secret, hazards, and
   * treasures rather than invented separately.
   */
  knownFeatures: string[];
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

/** Like pickUnused, but for pools that aren't plain strings (e.g. template functions), indexed by position. */
function pickUnusedIndex(
  poolLength: number,
  used: Set<number>,
  rng: Rng,
): number {
  const all = Array.from({ length: poolLength }, (_, i) => i);
  const remaining = all.filter((i) => !used.has(i));
  const picked = pickFrom(remaining.length > 0 ? remaining : all, rng);
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
 * Strip a leading "held back by"/"struggling against" lead-in and trailing
 * period an AI response may add to an obstacle string. The Obstacle field
 * stands alone now ("**Obstacle:** X."), so callers re-capitalize the result
 * themselves rather than lowering it to continue a sentence.
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

/** Render discrete entries as a markdown list, so a GM can scan them. */
function formatList(items: string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

/**
 * Coerce a narrative field to prose, accepting a list.
 *
 * The schema asks hooks for "2-3 reasons a party would come here", which
 * invites a JSON array, and several other fields read naturally as lists.
 * Requiring a string meant an arrayed answer was indistinguishable from an
 * omission, so it was silently replaced with table text — three consecutive
 * generated delves had table hooks under otherwise entirely original prose.
 */
function narrativeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
  }
  // A prose blob becomes a single entry: degraded, never wrong.
  const text = narrativeText(value);
  return text ? [text] : [];
}

function narrativeText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim())
      .join(" ");
  }
  return "";
}

/**
 * Strip a leading "to"/"Seeks"/"they want to" lead-in an AI response may add
 * to a goal clause, since callers either render it standalone (capitalized)
 * or embed it after their own lead-in ("want to X").
 */
function sanitizeGoal(s: string): string {
  return s
    .replace(/^\s*(to|seeks?( to)?|they want to|wants? to)\s+/i, "")
    .trim()
    .replace(/\.+$/, "");
}

interface UsedFactionTraits {
  names: Set<string>;
  identities: Set<string>;
  virtues: Set<string>;
  vices: Set<string>;
  drives: Set<string>;
  obstacles: Set<string>;
  leaderDescriptors: Set<string>;
  notableDescriptors: Set<string>;
  /** Indices into the dungeon's sector list, so the two factions don't default to controlling the same ground. */
  territorySectorIdx: Set<number>;
  originIdx: Set<number>;
  beliefIdx: Set<number>;
}

/**
 * Generate a named faction: virtue/vice traits, a drive with a concrete goal
 * that serves it, an immediate obstacle, dungeon-specific origin/belief, a
 * named leader plus one other notable NPC, and territory drawn from the
 * dungeon's own sector ids (never a free-form place name). `relationship` is
 * left blank — it can only be written once both of the dungeon's factions exist.
 */
function generateFaction(
  genre: string,
  rng: Rng,
  used: UsedFactionTraits,
  ctx: FactionLoreContext,
  sectorIds: string[],
): DungeonFaction {
  const name = pickUnused(
    forGenre(FACTION_NAMES_BY_GENRE, genre),
    used.names,
    rng,
  );
  const drive = pickUnused(FACTION_DRIVES, used.drives, rng);
  const goal = pickFrom(
    FACTION_GOALS_BY_DRIVE[drive] ?? FACTION_GOALS_BY_DRIVE.Survival,
    rng,
  );
  const obstacle = pickUnused(
    forGenreTables(genre).factionObstacles,
    used.obstacles,
    rng,
  );
  const leaderDescriptor = pickUnused(
    FACTION_LEADER_DESCRIPTORS,
    used.leaderDescriptors,
    rng,
  );
  const notableDescriptor = pickUnused(
    FACTION_NOTABLE_DESCRIPTORS,
    used.notableDescriptors,
    rng,
  );
  // One sector of the dungeon's own — never a free-form place name — so
  // territory can be validated against the sectors that actually exist.
  const territorySectorIds = [
    sectorIds[pickUnusedIndex(sectorIds.length, used.territorySectorIdx, rng)],
  ];
  const strength = sentenceCase(pickFrom(FACTION_STRENGTHS, rng));
  const origin =
    FACTION_ORIGIN_TEMPLATES[
      pickUnusedIndex(FACTION_ORIGIN_TEMPLATES.length, used.originIdx, rng)
    ](ctx);
  const belief =
    FACTION_BELIEF_TEMPLATES[
      pickUnusedIndex(FACTION_BELIEF_TEMPLATES.length, used.beliefIdx, rng)
    ](ctx);
  return {
    name,
    identity: pickUnused(FACTION_IDENTITIES, used.identities, rng),
    // Virtue and vice are deduped alongside drive and obstacle: two factions
    // that are both "greedy" read as one faction written twice.
    virtue: pickUnused(FACTION_VIRTUES, used.virtues, rng),
    vice: pickUnused(FACTION_VICES, used.vices, rng),
    goal,
    drive,
    obstacle,
    origin,
    belief,
    territorySectorIds,
    strength,
    leader: {
      name: generatePlaceholderName(rng),
      description: leaderDescriptor,
    },
    notable: {
      name: generatePlaceholderName(rng),
      description: notableDescriptor,
    },
    relationship: "",
  };
}

/** Resolve sector ids to their names for prose, joined naturally ("A, B and C"). */
function territoryNames(ids: string[], sectors: DungeonSector[]): string {
  const byId = new Map(sectors.map((s) => [s.id, s.name]));
  const names = ids.map((id) => byId.get(id)).filter((n): n is string => !!n);
  if (names.length === 0) return "these halls";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * A faction's own strategy, attitude, or planned response to the shared
 * standoff — not a restatement of the mutual dependency, which the shared
 * Faction Situation paragraph already covers. This is "what they intend to
 * do about it", drawn independently per faction so the two need not mirror.
 */
function composeRelationship(
  self: DungeonFaction,
  other: DungeonFaction,
  sectors: DungeonSector[],
  rng: Rng,
): string {
  const otherTerritory = territoryNames(other.territorySectorIds, sectors);
  const templates: Array<() => string> = [
    () =>
      `${self.name} are stalling, betting ${other.name} breaks first rather than risk open conflict now.`,
    () =>
      `${self.name} are quietly preparing to strike first, unwilling to let the standoff drag on much longer.`,
    () =>
      `${self.name} would rather negotiate than fight, if ${other.name} can be made to see reason.`,
    () =>
      `${self.name} treat ${other.name} as a nuisance to be dealt with later, not a real threat yet.`,
    () =>
      `${self.name} are gathering intelligence on ${other.name} before committing to any move against them.`,
    () =>
      `${self.name} have already written ${other.name} off as beyond negotiation, and are arming for it.`,
    () =>
      `${self.name} probe ${other.name}'s hold on ${otherTerritory} for a weakness, without yet risking a direct move.`,
  ];
  return sentenceCase(pickFrom(templates, rng)());
}

/**
 * Shared 2-3 sentence paragraph covering the whole faction situation: what
 * each side wants, why that's incompatible, why neither has already won, and
 * what could tip the current, unstable balance — the thing the PCs can act on.
 */
function composeFactionSituation(
  a: DungeonFaction,
  b: DungeonFaction,
  rng: Rng,
): string {
  const wants = sentenceCase(
    `${a.name} want to ${a.goal}, while ${b.name} want to ${b.goal} — ambitions that cannot both succeed while either side still holds ground the other needs.`,
  );
  const stuck = sentenceCase(
    `${a.name} are held back by ${a.obstacle}, and ${b.name} by ${b.obstacle}, so neither can force the issue outright.`,
  );
  const unstable = sentenceCase(`${pickFrom(FACTION_INSTABILITY_HOOKS, rng)}.`);
  return [wants, stuck, unstable].join(" ");
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

  const secretsList = forGenre(SECRETS_BY_GENRE, genre);
  const secret = pickFrom(secretsList, rng);

  const hazardsList = forGenre(HAZARDS_BY_GENRE, genre);
  const hazards = pickRandomItems(hazardsList, 2 + Math.floor(rng() * 2), rng);

  const treasuresList = forGenre(TREASURES_BY_GENRE, genre);
  const treasures = pickRandomItems(
    treasuresList,
    2 + Math.floor(rng() * 2),
    rng,
  );

  const hooksList = forGenre(HOOKS_BY_GENRE, genre);
  const hooks = pickRandomItems(hooksList, 2 + Math.floor(rng() * 2), rng);

  // Sectors are resolved before factions: territory now references sector
  // ids, so the sectors a faction can hold have to already exist.
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
    Lore: new Set(hooks),
    Special: new Set([signatureFeature]),
    Trap: new Set(hazards),
  };
  const sectors: DungeonSector[] = pickedSectors.map((s, idx) => {
    const stockType = rollStockType(rng);
    const stockDetail = pickStockDetail(stockType, genre, usedByType, rng);
    return {
      id: sectorId(idx),
      name: s.name,
      description: s.description,
      stockType,
      stockDetail,
    };
  });

  const sectorEdges = buildSectorEdges(sectors.length, rng);
  const map = renderDungeonMap(
    sectors.map((s) => s.name),
    sectorEdges,
  );

  // Facts a faction may draw on but must not contradict or replace — the
  // dungeon is authoritative, factions adapt to it.
  // The secret is deliberately excluded: it's the dungeon's twist reveal, and
  // the AI schema still asks for its own invented secret rather than being
  // handed one as a locked fact to reference.
  const knownFeatures = [signatureFeature, ...hazards, ...treasures];

  // Two factions (virtue/vice, drive/goal/obstacle, origin/belief) built together
  // so the situation stays internally consistent rather than being picked
  // independently. Traits are drawn distinct across the pair so the two
  // factions don't read as reskins of each other.
  const factionCtx: FactionLoreContext = { builder, cause, originalUse };
  const usedFactionTraits: UsedFactionTraits = {
    names: new Set(),
    identities: new Set(),
    virtues: new Set(),
    vices: new Set(),
    drives: new Set(),
    obstacles: new Set(),
    leaderDescriptors: new Set(),
    notableDescriptors: new Set(),
    territorySectorIdx: new Set(),
    originIdx: new Set(),
    beliefIdx: new Set(),
  };
  const sectorIds = sectors.map((s) => s.id);
  const factionA = generateFaction(
    genre,
    rng,
    usedFactionTraits,
    factionCtx,
    sectorIds,
  );
  const factionB = generateFaction(
    genre,
    rng,
    usedFactionTraits,
    factionCtx,
    sectorIds,
  );
  factionA.relationship = composeRelationship(factionA, factionB, sectors, rng);
  factionB.relationship = composeRelationship(factionB, factionA, sectors, rng);
  const factions = [factionA, factionB];

  const factionSituation = composeFactionSituation(factionA, factionB, rng);

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
    factionSituation,
    sectors,
    sectorEdges,
    map,
    secret,
    hazards,
    treasures,
    hooks,
    knownFeatures,
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
    for (const match of (entity.content ?? "").matchAll(
      /^### (.+)\n\n\w+, but \w+\./gm,
    )) {
      const name = match[1].replace(/^the\s+/i, "").trim();
      if (name) names.add(name);
    }
  }
  // Most recent first, capped so the prompt does not balloon over a long session.
  return [...names].reverse().slice(0, limit);
}

/**
 * Virtue/vice pairs already used this session.
 *
 * The model pairs archetypes with traits consistently — knowledge-seekers kept
 * coming back as "Curiosity, but Hubris" and devotional factions as "Devotion,
 * but Fanaticism", across genres and under different faction names. The names
 * vary; the characterisation does not.
 */
export function collectSessionTraits(
  entities: Array<{ content?: string }>,
  limit = 12,
): string[] {
  const pairs = new Set<string>();
  for (const entity of entities) {
    for (const match of (entity.content ?? "").matchAll(
      /^### .+\n\n(\w+), but (\w+)\./gm,
    )) {
      pairs.add(`${match[1]}, but ${match[2]}`);
    }
  }
  return [...pairs].reverse().slice(0, limit);
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
  avoidTraits: string[] = [],
): string {
  const stockPlan = dungeon.sectors
    .map(
      (s) =>
        `  ${s.id}: ${s.stockType ?? "Lore"} (name and describe this one yourself)`,
    )
    .join("\n");

  return [
    `Creative seeds — starting points to interpret. Write your own prose from these;`,
    `do NOT quote them back or treat them as finished text.`,
    `- Built by: ${dungeon.builder}`,
    `- Ruined by: ${dungeon.cause}`,
    `- Present condition: ${dungeon.condition}`,
    `- Entered via: ${dungeon.entrance}`,
    `- Built from: ${dungeon.composition}`,
    `- Faction A drive: ${dungeon.factions[0]?.drive ?? "Survival"} (obstacle category, for shape only, not finished text: "${dungeon.factions[0]?.obstacle ?? "a rival faction"}" — reinterpret this using the sectors/hazards/treasures you write below; do not keep this wording or the entity it implies)`,
    `- Faction B drive: ${dungeon.factions[1]?.drive ?? "Dominion"} (obstacle category, for shape only, not finished text: "${dungeon.factions[1]?.obstacle ?? "a rival faction"}" — reinterpret this using the sectors/hazards/treasures you write below; do not keep this wording or the entity it implies)`,
    ``,
    `Structure — fixed. Honour these exactly.`,
    `- EXACTLY ${dungeon.sectors.length} sectors, in this order, using these exact ids. Name and describe each one yourself; the id stays fixed regardless of what you name it:`,
    stockPlan,
    `- EXACTLY 2 factions, each keeping its assigned drive but inventing everything else about it — see schema.`,
    `- Each faction's territorySectorIds must be a subset of the sector ids above — no other value is valid.`,
    `- Do not invent any new sector, level, chamber, route, entrance, exit, stairwell, elevator, vault, or archive beyond the ${dungeon.sectors.length} sectors listed above. A faction may add small local dressing inside a sector it holds (a barricade, a camp, a shrine, a patrol) but not a new named place.`,
    ``,
    `Already-established facts — do not contradict or replace these. A faction's goal, obstacle, origin, and belief must draw on these or on the sectors above, not on a new artifact, threat, or location you invent:`,
    ...dungeon.knownFeatures.map((f) => `- ${f}`),
    ...(avoidNames.length > 0
      ? [
          ``,
          `Already used elsewhere in this session — pick different names:`,
          ...avoidNames.map((n) => `- ${n}`),
        ]
      : []),
    ...(avoidTraits.length > 0
      ? [
          ``,
          `Virtue/vice pairs already used this session — characterise these`,
          `factions differently:`,
          ...avoidTraits.map((t) => `- ${t}`),
        ]
      : []),
  ].join("\n");
}

/** Render one faction as its own section: identity, agenda, backstory, holdings, faces, and its stake in the other faction. */
/** Render a faction NPC as "Name — description.", capitalizing only the description's first letter. */
function formatNpc(npc: DungeonFactionNpc): string {
  return `${npc.name} — ${endSentence(npc.description)}`;
}

function formatFaction(f: DungeonFaction, sectors: DungeonSector[]): string {
  return [
    `### ${f.name}`,
    ``,
    `**Identity:** ${endSentence(f.identity)}`,
    ``,
    `${f.virtue}, but ${f.vice}.`,
    ``,
    `**Goal:** ${endSentence(sentenceCase(sanitizeGoal(f.goal)))}`,
    `**Drive:** ${endSentence(f.drive)}`,
    `**Obstacle:** ${endSentence(sentenceCase(sanitizeObstacle(f.obstacle)))}`,
    ``,
    `**Origin:** ${endSentence(f.origin)}`,
    `**Belief:** ${endSentence(f.belief)}`,
    ``,
    `**Territory:** ${endSentence(sentenceCase(territoryNames(f.territorySectorIds, sectors)))}`,
    `**Strength:** ${endSentence(f.strength)}`,
    ``,
    `**Leader:** ${formatNpc(f.leader)}`,
    `**Notable:** ${formatNpc(f.notable)}`,
    ``,
    `**Relationship:** ${endSentence(f.relationship)}`,
  ].join("\n");
}

function formatFactions(
  factions: DungeonFaction[],
  sectors: DungeonSector[],
): string {
  return factions.map((f) => formatFaction(f, sectors)).join("\n\n");
}

/** Close a sentence the model left unterminated, so it sits with table entries. */
function endSentence(text: string): string {
  const trimmed = text.trim();
  return !trimmed || /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function formatSector(s: DungeonSector, idx: number): string {
  const stockLine =
    s.stockType && s.stockDetail
      ? `\n\n*${s.stockType} — ${endSentence(s.stockDetail)}*`
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
    `## Key Sectors & Layout`,
    sectorsFormatted,
    ``,
    `## Faction Situation`,
    dungeon.factionSituation,
    ``,
    formatFactions(dungeon.factions, dungeon.sectors),
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
    formatList(dungeon.hazards),
    ``,
    `### Treasures & Artifacts`,
    formatList(dungeon.treasures),
    ``,
    `### Adventure Hooks & Rumours`,
    formatList(dungeon.hooks),
  ].join("\n");

  return {
    type: "location",
    kind: "dungeon",
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

You will be given creative seeds and a fixed structure. The seeds are raw material — interpret them, build on them, and write your own prose. Do not quote them back. The structure (sector count, each sector's stocked-content type, exactly two factions each keeping its assigned drive) is fixed and must be honoured precisely.

Everything else is yours to invent: the delve's name, every sector's name and description, the signature feature, the central secret, the hazards, the treasures, the hooks, and both factions' full write-ups. Make them specific to this delve rather than generic to the genre, and make the whole document internally consistent — the history should explain the present state, and the secret should be worth the trip.

The dungeon you establish is authoritative. Factions animate it; they do not add to it. Write the sectors, secret, hazards, and treasures first, in the order the schema lists them, before the faction situation and factions — those come last precisely so a faction's goal, obstacle, and belief can reference something that already exists on the page, instead of the other way around. Once written, those are the only geography and named things that exist. A faction may add small local dressing inside a sector it holds (a barricade, a camp, a shrine, a supply pile, a patrol route) without that counting as new geography, but must not invent a new chamber, vault, archive, route, entrance, stairwell, artifact, or unexplained power just to have something to want or fear. Sectors are referenced by id, never by a place name you make up on the spot — a faction's territory is always one or more of the sector ids you already assigned. Treasures must fit who built this delve and what it was for — a dwarven, elven, or otherwise culturally-specific artifact or key reads as a mistake unless that people or craft is actually named somewhere in the history; do not borrow a race or culture from the wider setting just because it's genre-typical.

Each faction is a compact working entry for a GM to run, not a full standalone faction article — keep every field tight and useful, not decorative. Every faction needs an invented name of its own. Never write a placeholder like "Faction A", "Faction 1", "First Faction", or "Unnamed Faction" into the name field — those are labels for you to fill in, not values.

Identity is one plain-language sentence stating what kind of faction this is (a cult, a mercenary crew, a corporate strike team, whatever fits), read before anything else about them. Four fields must each mean something different: Goal is what it wants right now; Drive (fixed, given below) is why it wants that; Obstacle is what is blocking or pressuring it; Belief is what it thinks is true, which need not be correct. None of the four may restate another — and Drive must naturally explain this faction's Identity and Goal, not just be consistent with them if you squint. Test it by swapping the Drive for a different one: if the Identity and Goal would read exactly the same either way, Drive isn't actually doing anything. A faction of profit-driven treasure hunters whose Belief is dismissively practical has no business running on a Drive of Vengeance; a faction whose Identity is archivists chasing political leverage and whose Belief is about lineage and legitimacy is not driven by Knowledge — that is Ascension, Dominion, or Redemption. If Drive is Vengeance, the Identity, Goal, and Belief should all read as someone settling a score, not an unrelated grab for loot. Obstacle must arise from an established sector, hazard, treasure, or the other faction — a trap that already injured them, a shortage the hazards explain, a rival holding something they need, a deadline tied to the secret — and it must actually stand between this faction and its Goal from where its Territory places it, not just be a generic pressure lifted from elsewhere. Never a new watcher, curse, debt, or power that wasn't already on the page; that is a second mystery competing with the one you already wrote. Origin and Belief must connect directly to this delve's own history, current state, or transformation — not generic faction lore that could belong to any dungeon.

Territory and Strength answer different questions and must not collapse into each other: Territory is where the faction is established — one or more sector ids. Strength is what makes it effective or hard to dislodge there — knowledge, equipment, legitimacy, mobility, numbers, whatever it is. Do not restate the territory itself (a place name) as if holding it were the advantage; the advantage is what they can do because of it. Strength may take the edge off this faction's own Obstacle, but must not cancel it outright — if Strength already neutralizes what Obstacle describes, Obstacle isn't actually blocking anything and one of the two needs to change. A faction's Goal must never ask it to acquire something the rest of its own entry — Strength, Territory, or factionSituation — already says it possesses or controls; if Strength says they hold the strongbox, Goal cannot also be "secure the strongbox." Likewise, a faction should not seek to acquire something already sitting inside its own Territory unless the text explains why possession remains out of reach (sealed in a vault they can't open, guarded by something even they avoid). Leader and Notable are each a name plus one sentence identifying who they are and why they matter; render them as separate name/description fields, not a formatted string.

Write a factionSituation field first, before the factions: 2-3 sentences on what each side wants, why those wants collide, why neither has already won, and what makes the current standoff unstable enough for the party to actually change. Prefer mutual dependency over one-sided conflict, but only where the established sectors, hazards, treasures, or secret actually support it both ways — do not force artificial symmetry ("each needs something from the other") if what you've actually established only really gives one side something to withhold. If factionSituation says a faction wants an item for a reason, that faction's own Goal must give the same reason — a scroll cache introduced as a weapon against a monster cannot become "research material for antidotes" once you reach that faction's Goal; the two fields are describing the same want and must not disagree about why. Everything in the two factions must be consistent with it — after writing both factions, re-check factionSituation once more against their actual Territory, Goal, Strength, and Relationship; it must still hold, not just have been plausible when you first wrote it.

Relationship is each faction's own strategy, attitude, or planned response to that standoff — not a restatement of the mutual dependency factionSituation already covers. It might be stalling for time, preparing to strike first, seeking a deal, gathering intelligence, or refusing to take the other side seriously. Never a flat "they are rivals" or "they distrust each other", and never just "we need X from them" again. It also must not contradict Obstacle: if Obstacle says a binding oath, an injury, or a lockdown stops this faction from acting in a particular sector or against the other faction directly, Relationship cannot then have them actively doing exactly that.

Write the "throughline" field before factionSituation and let it govern everything else. It is one sentence covering who built the delve, what went wrong, and how that leaves it in exactly the Current State given above. Every later field must be consistent with it — if the throughline says the place is occupied and contested, the history cannot end with it permanently sealed or everyone inside dead.

The Current State is a setting the user chose. It is fixed. Whatever went wrong in the history, the place must end up in that stated condition, with both factions able to reach and contest it.

Before you finish, run this checklist per faction. Start with one blunt question, before any of the others: given this faction's Territory, and everything the sector(s) in it already establish (their own Lore/stockDetail entries), what does this faction already physically control? Write that list for yourself first. Goal and Obstacle both get derived from it, not invented independently:
1. Does Goal name something outside that list of already-controlled things? If the thing it wants is already on the list, that isn't the goal anymore — unless the text explains why it's still out of reach despite being there (sealed in a vault they can't open, guarded by something even they avoid).
2. Wherever a field claims a treasure, hazard, or creature belongs to a specific sector — is that the same sector whose own Lore/stockDetail/Monster entry actually establishes it? A sector's own entry is the only confirmed source for what's in it. Never relocate a treasure or hazard to a different sector, never invent a creature or threat for a sector beyond what its own entry establishes (or what's clearly derived from it — a "pack" implied by a lone wolf, not an unrelated new monster), and never place anything in a sector whose entry doesn't mention it.
3. Does Obstacle describe a real barrier between this faction and reaching something it doesn't yet control — not something actually impossible (ground it never needed to cross to reach its Goal, or a restriction that could only ever be lifted by doing the very thing it forbids)?
4. Does factionSituation actually describe this faction's own Goal — the same want, the same item, the same location — not a different one, and not a loose paraphrase?
5. Does Relationship describe a strategy or attitude toward the rival faction specifically, not just a mood in isolation?
6. Does Drive explain why this faction wants its Goal, and fit its Identity too — not just restate the danger or pressure that belongs in Obstacle? (A faction driven by Wealth or Ascension doesn't become "driven by Survival" just because something in the dungeon could kill it.)
7. Is Territory/Obstacle spatially sensible against the sector chain (sector-1 to sector-2 to sector-3, in order, unless a shortcut is described)? If this faction's own Territory spans two non-adjacent sectors, is there an established shortcut connecting them, or does the text explain how it holds both despite the gap?
8. Does every treasure's cultural provenance (dwarven, elven, or otherwise) trace to something the history actually names, not just implies?
9. Can every item do what its text claims (a key opens locks, not masonry; a map informs, it doesn't fund anything) — and does every later mention of it stick to that same description, with no new power added on top?
10. Does every item named in a Goal materially serve it, for the same reason factionSituation already gave for wanting it?
11. Could this standoff be sharper than "both sides want the same treasure" using facts you've already established?

If any answer is off, fix that field using only what's already established elsewhere — don't invent something new to patch it.

Return ONLY a single valid JSON object matching the requested schema. ${NAME_BAN_PROMPT}`;

  const userMessage = `Write an original ${dungeon.genre} dungeon / delve.

Setting Context:
- Active Theme / Genre: ${dungeon.genre} (${genreHint})
- Original Purpose: ${dungeon.purpose}
- Current State: ${dungeon.currentState}
- Scale: ${dungeon.scale}
${formatCampaignContextBlock(options.campaignContext)}
${options.instruction ? `- Special Instructions: ${options.instruction}` : ""}

${formatDungeonSeeds(dungeon, options.avoidNames ?? [], options.avoidTraits ?? [])}

${formatDungeonJsonSchema(dungeon)}`;

  return {
    systemInstruction,
    userMessage,
    resolved: dungeon,
  };
}

/**
 * The "Required JSON schema" block shared by the first-pass generation prompt
 * and the second-pass coherence prompt, so the two can't drift apart on what
 * each field means.
 */
function formatDungeonJsonSchema(dungeon: ResolvedDungeon): string {
  return `Required JSON schema:
{
  "title": "Evocative, specific name for this delve.",
  "summary": "1-2 sentence premise of why this location is interesting.",
  "throughline": "ONE sentence: who built it, what went wrong, and how that leaves it in the Current State above. Write this before the fields below and keep them all consistent with it.",
  "history": "Who built it, what for, and what went wrong. Elaborate the throughline from the 'Built by' and 'Ruined by' seeds; it must end where the throughline says it ends.",
  "currentState": "How it functions today and what state it is in, consistent with the '${dungeon.currentState}' setting above.",
  "signatureFeature": "One distinctive landmark or phenomenon that defines this delve. Invent it.",
  "sectors": [
    // EXACTLY ${dungeon.sectors.length} entries, in the order of the id/stock-type plan above. Write these before the factions below, since factions reference these sectors by id.
    { "id": "sector-1", "name": "Your name for this area — no leading number, no 'Sector N:' prefix, no surrounding quote marks", "description": "2-3 sentences of vivid, specific description.", "stockType": "the type assigned to this sector in the plan above", "stockDetail": "One concrete thing here matching that type: a creature for Monster, findable evidence for Lore, a landmark for Special, a danger for Trap." }
    // ...one entry per sector id above, "id" copied exactly from the plan.
  ],
  "secret": "The hidden truth at the heart of this delve. Invent it, and make it connect to the history. Write this and the two lists below before the factions — they are established facts a faction may want, guard, or be undone by, not things to invent after the fact.",
  "hazards": ["2-3 distinct dangers, one per entry"],
  "treasures": ["2-3 distinct finds, one per entry — consistent with who built this delve and what it was for. No orphaned relics from a people or craft the history never mentioned."],
  "factionSituation": "2-3 sentences: what each faction wants, why that's incompatible, why neither has already won, and what makes the current balance unstable. Prefer mutual dependency — A controls or needs something B has, and B controls or needs something A has. Name both factions.",
  "factions": [
    { "name": "An invented name for this faction — never a placeholder like 'Faction A' or 'First Faction'.", "identity": "What these people are, in plain language — one sentence, no proper names besides the faction's own.", "virtue": "One-word virtue", "vice": "One-word vice", "goal": "Concrete, present-tense: what they are trying to accomplish inside this dungeon right now, achievable using only the sectors, hazards, treasures, and secret already established above.", "drive": "${dungeon.factions[0]?.drive ?? "Survival"}", "obstacle": "The immediate pressure stopping them — draw this from an established sector, hazard, treasure, or the other faction, never a new threat or power invented for the occasion. A deadline, shortage, injury, or standoff, whatever fits. One sentence.", "origin": "Why this faction exists and how it became connected to this specific dungeon — tied to the history/current state above.", "belief": "What it believes about the dungeon, interpreting facts already established above — not unrelated lore.", "territorySectorIds": ["sector-1"], "strength": "Its real strategic advantage — not just numbers, and not the territory itself: could be position, knowledge, equipment, legitimacy, mobility, access.", "leader": { "name": "Character name", "description": "One concise sentence on who they are and why they lead." }, "notable": { "name": "A different character name than the leader", "description": "One concise sentence on their role." }, "relationship": "This faction's own strategy, attitude, or planned response to the standoff in factionSituation — stalling, striking first, seeking a deal, gathering intelligence, refusing to engage, whatever fits. Not a repeat of what it needs from the other faction." },
    { "name": "An invented name for this faction — never a placeholder like 'Faction B' or 'Second Faction'.", "identity": "What these people are, in plain language — one sentence, no proper names besides the faction's own.", "virtue": "One-word virtue", "vice": "One-word vice", "goal": "Concrete, present-tense: what they are trying to accomplish inside this dungeon right now, achievable using only the sectors, hazards, treasures, and secret already established above.", "drive": "${dungeon.factions[1]?.drive ?? "Dominion"}", "obstacle": "The immediate pressure stopping them — draw this from an established sector, hazard, treasure, or the other faction, never a new threat or power invented for the occasion. A deadline, shortage, injury, or standoff, whatever fits. One sentence.", "origin": "Why this faction exists and how it became connected to this specific dungeon — tied to the history/current state above.", "belief": "What it believes about the dungeon, interpreting facts already established above — not unrelated lore.", "territorySectorIds": ["sector-2"], "strength": "Its real strategic advantage — not just numbers, and not the territory itself: could be position, knowledge, equipment, legitimacy, mobility, access.", "leader": { "name": "Character name", "description": "One concise sentence on who they are and why they lead." }, "notable": { "name": "A different character name than the leader", "description": "One concise sentence on their role." }, "relationship": "This faction's own strategy, attitude, or planned response to the standoff in factionSituation — stalling, striking first, seeking a deal, gathering intelligence, refusing to engage, whatever fits. Not a repeat of what it needs from the other faction." }
  ],
  "hooks": ["2-3 reasons a party would come here or rumours about it, one per entry"]
}`;
}

/**
 * Matches a schema-echo instead of an invented name — the model returning
 * "Faction A", "The First Faction", "Unnamed Faction", or similar literally
 * lifted from the prompt's placeholder labels rather than naming the faction.
 */
const PLACEHOLDER_FACTION_NAME =
  /^(the\s+)?(first|second|1st|2nd)\s+faction$|faction\s*[ab12]\b|^((an?|the)\s+)?unnamed\s+faction$/i;

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
  avoidTraits: string[] = [],
  invalidTerritoryFactions: readonly string[] = [],
  omittedFactionFields: readonly string[] = [],
): { structural: string[]; content: string[] } {
  const problems: string[] = [];

  // A skipped field is worth another attempt — silently substituting local
  // prose puts back the verbatim table text this generator moved away from —
  // but it does not make the rest of the response unusable, so it is reported
  // separately from the violations that do.
  const content: string[] = [];
  if (omitted.length > 0) {
    content.push(`missing required fields: ${omitted.join(", ")}`);
  }
  if (omittedFactionFields.length > 0) {
    content.push(
      `missing required faction fields: ${omittedFactionFields.join(", ")}`,
    );
  }
  // Territory claiming a sector that doesn't exist is the exact failure this
  // whole id scheme exists to catch — treated as structural, not a gap to
  // patch, since a faction that controls invented ground isn't grounded at all.
  if (invalidTerritoryFactions.length > 0) {
    problems.push(
      `references a territorySectorIds value outside the established sectors: ${invalidTerritoryFactions.join(", ")}`,
    );
  }
  const reusedTraits = factions
    .map((f) => `${f.virtue}, but ${f.vice}`)
    .filter((pair) =>
      avoidTraits.some((used) => used.toLowerCase() === pair.toLowerCase()),
    );
  if (reusedTraits.length > 0) {
    content.push(
      `reuses virtue/vice pairs already used this session: ${reusedTraits.join("; ")}`,
    );
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
    if (a.drive.trim().toLowerCase() === b.drive.trim().toLowerCase()) {
      problems.push("both factions share the same drive");
    }
    if (
      sanitizeGoal(a.goal).toLowerCase() === sanitizeGoal(b.goal).toLowerCase()
    ) {
      problems.push("both factions pursue the same goal");
    }
    const placeholders = [a, b]
      .filter((f) => PLACEHOLDER_FACTION_NAME.test(f.name.trim()))
      .map((f) => f.name);
    if (placeholders.length > 0) {
      problems.push(
        `uses a placeholder faction name instead of an invented one: ${placeholders.join(", ")}`,
      );
    }
  }

  return { structural: problems, content };
}

/**
 * The AI-facing dungeon shape — the same fields the "Required JSON schema"
 * asks for, already parsed and fallback-filled. Round-trips through
 * `JSON.stringify` straight back into the schema the coherence pass is asked
 * to return, so a repair pass has the exact thing it's meant to proofread.
 */
export interface DungeonJson {
  title: string;
  summary: string;
  history: string;
  currentState: string;
  signatureFeature: string;
  sectors: DungeonSector[];
  factionSituation: string;
  factions: DungeonFaction[];
  secret: string;
  hazards: string[];
  treasures: string[];
  hooks: string[];
}

/**
 * Parse an AI JSON response for a Dungeon concept, falling back to local generator on error.
 */
export interface DungeonParseResult {
  output: PublicGeneratorOutput;
  /**
   * True when the response was structurally unusable and `output` is the local
   * foundation. False means `output` is the model's work, even if `problems`
   * lists gaps that were patched from the foundation.
   */
  rejected: boolean;
  /**
   * Why the response was rejected, empty when it was used. Surfaced so the
   * caller can tell the model what was wrong and give it another attempt
   * rather than silently shipping the local fallback.
   */
  problems: string[];
  /**
   * The structured shape behind `output`, present only when the response was
   * accepted (`!rejected`). A caller can feed this straight into
   * `buildDungeonCoherencePrompt` for a proofreading pass, without needing to
   * re-derive it from the rendered markdown.
   */
  structured?: DungeonJson;
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

/**
 * Build an optional second-pass prompt that proofreads and repairs an
 * already-accepted dungeon response, rather than generating a new one.
 *
 * Unlike `buildDungeonRetryMessage` (which re-sends the original prompt to a
 * response that failed structural validation and asks for a fresh attempt),
 * this hands the model its own prior output and asks it to fix specific
 * coherence issues in place — same names, same premise, same sectors,
 * touching only what needs touching. Callers should only reach for this once
 * a response has already passed hard validation; it has nothing to repair a
 * structurally broken response into.
 */
export function buildDungeonCoherencePrompt(
  structured: DungeonJson,
  resolved: ResolvedDungeon,
): DungeonPrompt {
  const sectorPlan = resolved.sectors
    .map((s) => `  ${s.id}: ${s.stockType ?? "Lore"}`)
    .join("\n");

  const systemInstruction = `You are proofreading and repairing a ${resolved.genre} dungeon / delve write-up you already produced. This is NOT a new generation — do not rewrite the premise, invent a different history, or replace names, tone, or ideas that already work. Your job is targeted correction, and preserving good existing content is itself a success condition, not a fallback.

Your actual job: read the whole document as one connected argument about a single place. Every field is a claim — about what exists, who wants what and why, who holds what, who can act where. If any two claims can't both be true at once, that's a contradiction, and you resolve it using only what's already established elsewhere in the document — never by inventing something new to paper over it. The list below names the contradictions this generator produces most often, to calibrate your eye. It is a set of examples, not an exhaustive checklist — a real contradiction that doesn't match any item on it is still yours to find and fix.

Structural things to fix first:
1. Contradictions between top-level sections (history vs. current state, throughline vs. secret, etc.).
2. Any faction referencing a sector, room, route, item, hazard, or NPC that isn't actually established below — ground it in something real or remove it. Never invent new major geography (rooms, routes, stairs, lifts, vaults, archives) to fix this.
3. A placeholder faction name such as "Faction A", "First Faction", or "Unnamed Faction" — replace it with an actual invented name and update every reference to match.

Then, per faction, start with one blunt question before any of the others: given this faction's Territory, and everything the sector(s) in it already establish (their own Lore/stockDetail entries), what does this faction already physically control? Work that out first — Goal and Obstacle both get checked against it, not treated as independent claims:
4. Does Goal name something outside that already-controlled list? If the thing it wants is already on the list, that isn't the goal anymore — unless the text explains why it's still out of reach despite being there (sealed in a vault they can't open, guarded by something even they avoid).
5. Wherever a field claims a treasure, hazard, or creature belongs to a specific sector — is that the same sector whose own Lore/stockDetail/Monster entry actually establishes it? A sector's own entry is the only confirmed source for what's in it — if a faction's Goal, Obstacle, or Relationship places something in a different sector, invents a creature/threat beyond what a sector's own entry establishes (or what's clearly derived from it), or names a sector no entry ever placed it in, that's the error to fix, not the sector text.
6. Does Obstacle describe a real barrier between this faction and reaching something it doesn't yet control — not something actually impossible (ground it never needed to cross to reach its Goal, or a restriction that could only ever be lifted by doing the very thing it forbids)?
7. Does factionSituation actually describe this faction's own Goal — the same want, the same item, the same location — not a different one, and not a loose paraphrase?
8. Does Relationship describe a strategy or attitude toward the rival faction specifically, not just a mood in isolation, and not something that contradicts Obstacle (bound by an oath from entering a sector, then actively sweeping into that same sector)?
9. Does Drive explain why this faction wants its Goal, and fit its Identity too — not just restate the danger or pressure that belongs in Obstacle?
10. Does Strength name a real advantage rather than restating Territory, and does it take the edge off this faction's Obstacle without cancelling it outright?
11. Does every treasure's cultural provenance (dwarven, elven, or otherwise) trace to something the history actually names, not just implies — can every item do what its text claims (a key opens locks, not masonry; a map informs, it doesn't fund anything) — and does every later mention of an item stick to that same description, with no new power added on top?
12. Does every item named in a Goal materially serve it, for the same reason factionSituation already gave for wanting it?
13. Could this standoff be sharper than "both sides want the same treasure" using facts already established?
14. If this faction's own Territory spans two non-adjacent sectors, is there an established shortcut connecting them, or does the text explain how it holds both despite the gap?

Anything else that doesn't sit right — two fields that can't both be true, a claim with nothing behind it, spatial logic against the sector chain that doesn't add up — is still yours to find and fix even if it isn't named above. Trust your read of the whole document over this list.

Only touch what's actually broken. If a field already satisfies all of this, leave it exactly as written — do not paraphrase working prose for its own sake, and do not expand anything beyond what fixing the problem requires. Do not add fields beyond the schema below, and do not rename an established sector or faction unless the rename itself is the fix (e.g. replacing a placeholder name).

Sector ids are fixed and must not change: ${resolved.sectors.map((s) => s.id).join(", ")}. Every territorySectorIds value in the output must be one of these.

Return ONLY a single valid JSON object matching the schema below — the same shape you were given, corrected.`;

  const userMessage = `Here is the dungeon you produced. Proofread it against the rules above and return the corrected JSON.

Sector plan (id: stocked-content type — unchanged from the original generation):
${sectorPlan}

Previous output to repair:
${JSON.stringify(structured, null, 2)}

${formatDungeonJsonSchema(resolved)}`;

  return {
    systemInstruction,
    userMessage,
    resolved,
  };
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
    const str = (v: unknown, fallback = "") => narrativeText(v) || fallback;

    // Gaps the model left that were patched from the foundation. Reported so a
    // retry can ask for them, without discarding an otherwise good response.
    let contentGaps: string[] = [];

    // Which narrative fields the model actually supplied. Checked before the
    // foundation fallbacks below fill them in, since after that an omission is
    // indistinguishable from a real answer.
    const omitted = (
      [
        "history",
        "currentState",
        "signatureFeature",
        "factionSituation",
        "secret",
        "hazards",
        "treasures",
        "hooks",
      ] as const
    ).filter((k) =>
      k === "hazards" || k === "treasures" || k === "hooks"
        ? narrativeList(parsed[k]).length === 0
        : !narrativeText(parsed[k]),
    );

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
    const factionSituation = str(
      parsed.factionSituation,
      foundation?.factionSituation ?? "",
    );

    const rawSectors = Array.isArray(parsed.sectors) ? parsed.sectors : [];
    const sectors: DungeonSector[] = rawSectors.map(
      (s: Record<string, unknown>, idx: number) => ({
        id: sectorId(idx),
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

    // Territory ids are only ever trusted if they name a sector that actually
    // exists in this response — an id the model invented is worth exactly as
    // much as a free-form place name would have been.
    const validSectorIds = new Set(sectors.map((s) => s.id));

    // Unknown ids and missing mandatory sub-fields, checked against the raw
    // response before any fallback fills them in — same rule as the
    // top-level `omitted` check above. Unknown ids are structural (the
    // faction claims ground that doesn't exist); missing fields are content
    // gaps, reported for a retry without discarding an otherwise good response.
    const invalidTerritoryFactions: string[] = [];
    const omittedFactionFields: string[] = [];
    const MANDATORY_FACTION_FIELDS = [
      "identity",
      "goal",
      "drive",
      "obstacle",
      "origin",
      "belief",
      "strength",
      "relationship",
    ] as const;

    const rawFactions = Array.isArray(parsed.factions) ? parsed.factions : [];
    const factions: DungeonFaction[] = rawFactions
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
      .map((f, idx) => {
        const fallback = foundation?.factions[idx];
        const factionLabel =
          typeof f.name === "string" && f.name.trim()
            ? f.name.trim()
            : `faction ${idx + 1}`;
        // A field the model left blank falls back to the foundation's value
        // for the same field, never to a different field's text.
        const field = (v: unknown, fallbackValue = "") => {
          const value = narrativeText(v);
          return value || fallbackValue;
        };
        for (const key of MANDATORY_FACTION_FIELDS) {
          if (!narrativeText(f[key])) {
            omittedFactionFields.push(`${factionLabel}.${key}`);
          }
        }
        const npc = (
          v: unknown,
          fallbackValue?: DungeonFactionNpc,
          label = "",
        ): DungeonFactionNpc => {
          const obj =
            v && typeof v === "object" ? (v as Record<string, unknown>) : {};
          if (!narrativeText(obj.name)) {
            omittedFactionFields.push(`${factionLabel}.${label}.name`);
          }
          if (!narrativeText(obj.description)) {
            omittedFactionFields.push(`${factionLabel}.${label}.description`);
          }
          return {
            name: field(obj.name, fallbackValue?.name),
            description: field(obj.description, fallbackValue?.description),
          };
        };
        const rawTerritoryIds = Array.isArray(f.territorySectorIds)
          ? f.territorySectorIds
          : [];
        if (rawTerritoryIds.some((id) => !validSectorIds.has(id))) {
          invalidTerritoryFactions.push(factionLabel);
        }
        const territorySectorIds = rawTerritoryIds.filter(
          (id): id is string =>
            typeof id === "string" && validSectorIds.has(id),
        );
        return {
          name: typeof f.name === "string" ? f.name : "An unnamed faction",
          identity: field(f.identity, fallback?.identity),
          virtue: field(f.virtue, fallback?.virtue),
          vice: field(f.vice, fallback?.vice),
          goal: field(f.goal, fallback?.goal),
          drive: field(f.drive, fallback?.drive),
          obstacle: field(f.obstacle, fallback?.obstacle),
          origin: field(f.origin, fallback?.origin),
          belief: field(f.belief, fallback?.belief),
          territorySectorIds:
            territorySectorIds.length > 0
              ? territorySectorIds
              : (fallback?.territorySectorIds ?? []),
          strength: field(f.strength, fallback?.strength),
          leader: npc(f.leader, fallback?.leader, "leader"),
          notable: npc(f.notable, fallback?.notable, "notable"),
          // Not falling back to the foundation's own relationship text here:
          // that text names the foundation's sectors by name, which leaks a
          // local sector name into an otherwise fully AI-authored response
          // once the AI names its own sectors differently. An omission is
          // recomposed fresh below, against the sectors that actually render.
          relationship: field(f.relationship),
        };
      });

    // A relationship the model omitted is recomposed against the sectors and
    // factions that actually made it into this response, rather than reusing
    // the foundation's pre-written text (which names the foundation's own
    // sectors, not necessarily the ones just parsed above).
    if (factions.length === 2) {
      const [a, b] = factions;
      if (!a.relationship)
        a.relationship = composeRelationship(a, b, sectors, rng);
      if (!b.relationship)
        b.relationship = composeRelationship(b, a, sectors, rng);
    }

    // Structure is the mechanical layer's to guarantee. If the response
    // violates it, ship the foundation the prompt was built from rather than a
    // dungeon that isn't the one the user asked for.
    if (foundation) {
      const { structural, content } = validateAiDungeon(
        title,
        throughline,
        omitted,
        sectors,
        factions,
        foundation,
        options.avoidNames ?? [],
        options.avoidTraits ?? [],
        invalidTerritoryFactions,
        omittedFactionFields,
      );
      if (structural.length > 0) {
        return {
          // Flagged so the UI's existing "AI was unavailable" notice fires.
          // Without it a rejected response is indistinguishable from a normal
          // local generation, and nobody can tell the AI path failed at all.
          output: { ...renderResolvedDungeon(foundation), aiFallback: true },
          problems: [...structural, ...contentGaps],
          rejected: true,
        };
      }
      // Content gaps are still reported so the retry can ask for them, but the
      // response is kept: one missing field is not worth discarding an entire
      // AI-authored dungeon in favour of table prose.
      contentGaps = content;
    }

    const secret = str(parsed.secret, foundation?.secret ?? "");
    // List-shaped sections: an array is the expected form, a prose blob
    // degrades to a single entry, and an empty result falls back per-field.
    const list = (v: unknown, fallback: string[] = []) => {
      const parsedList = narrativeList(v);
      return parsedList.length > 0 ? parsedList : fallback;
    };
    const hazards = list(parsed.hazards, foundation?.hazards ?? []);
    const treasures = list(parsed.treasures, foundation?.treasures ?? []);
    const hooks = list(parsed.hooks, foundation?.hooks ?? []);

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
      factions.length > 0 ? formatFactions(factions, sectors) : "";

    // Main column: the narrative — what the dungeon is and why it matters.
    const content = [
      history ? `## History & Original Purpose\n${history}\n` : "",
      currentState ? `## Current State & Function\n${currentState}\n` : "",
      signatureFeature ? `## Signature Feature\n${signatureFeature}\n` : "",
      `## Key Sectors & Layout\n${sectorsFormatted}\n`,
      factionSituation || factionsFormatted
        ? `## Faction Situation\n${[factionSituation, factionsFormatted].filter(Boolean).join("\n\n")}\n`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Right rail / GM quick reference: what you need at the table.
    const lore = [
      map ? `### Dungeon Layout\n${map}\n` : "",
      secret ? `### Central Secret / Boss Mystery\n${secret}\n` : "",
      hazards.length ? `### Hazards & Traps\n${formatList(hazards)}\n` : "",
      treasures.length
        ? `### Treasures & Artifacts\n${formatList(treasures)}\n`
        : "",
      hooks.length ? `### Adventure Hooks & Rumours\n${formatList(hooks)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const themeId = options.themeId || "fantasy";
    const genre = options.genre || themeIdToLabel[themeId] || "Classic Fantasy";

    return {
      output: {
        type: "location",
        kind: "dungeon",
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
      problems: contentGaps,
      rejected: false,
      structured: {
        title,
        summary,
        history,
        currentState,
        signatureFeature,
        sectors,
        factionSituation,
        factions,
        secret,
        hazards,
        treasures,
        hooks,
      },
    };
  } catch {
    // Malformed JSON is worth another attempt too, so report it as a problem
    // rather than quietly returning the fallback.
    return {
      output: {
        ...(foundation
          ? renderResolvedDungeon(foundation)
          : generateDungeonLocal(options)),
        aiFallback: true,
      },
      problems: [
        "the response was not valid JSON matching the requested schema",
      ],
      rejected: true,
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
