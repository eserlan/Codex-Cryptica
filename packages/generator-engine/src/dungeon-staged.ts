/**
 * Staged AI generation for the Dungeon & Delve generator (#4133).
 *
 * The one-pass route asks for the history, every sector, the hazards and
 * treasures and both factions in a single answer, then tries to repair
 * contradictions after the dependent prose is written. This route writes the
 * delve in the order it depends on itself, and each step only sees the
 * validated output of the steps before it:
 *
 * 1. foundation: title, throughline, history, secret and one brief per sector id
 * 2. geography and contents: sectors, hazards, treasures, hooks
 * 3. factions: written against the sectors and contents that now exist
 * 4. coherence: assemble, validate, and repair only if something is still off
 *
 * The fixed plan (sector count, ids, stock types, faction drives) comes from
 * the resolved dungeon and is never taken from the model. A stage that stays
 * unusable returns `null`, and the caller runs the one-pass route, which has
 * its own local fallback. An abort throws; nothing partial is returned.
 */

import {
  avoidNamesExcludingContext,
  formatCampaignContextBlock,
} from "./campaign-context";
import { parseFencedJson } from "./llm-response-utils";
import {
  bannedNamesIn,
  buildDungeonCoherencePrompt,
  formatDungeonSeeds,
  parseDungeonResponseDetailed,
  type DungeonParseResult,
  PLACEHOLDER_FACTION_NAME,
  sanitizeGoal,
  type DungeonGeneratorOptions,
  type DungeonJson,
  type ResolvedDungeon,
} from "./public-dungeon";
import { GENRE_HINTS } from "./public-dungeon-constants";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import { type Rng, defaultRng } from "./random-utils";

export type DungeonStageId = "foundation" | "sectors" | "factions";

export interface DungeonStagedDeps {
  complete: (systemInstruction: string, userMessage: string) => Promise<string>;
  signal?: AbortSignal;
  rng?: Rng;
  /** Caller-supplied context (vault, naming, instructions) placed before every stage. */
  contextPrefix?: string;
}

/** What a run cost and where it needed help, for comparing against the one-pass route. */
export interface DungeonStagedStats {
  aiCalls: number;
  repairedStages: DungeonStageId[];
  coherenceRepaired: boolean;
  /** Problems the final document still has after every repair. */
  remainingIssues: string[];
}

export interface DungeonStagedResult {
  output: PublicGeneratorOutput;
  structured: DungeonJson;
  stats: DungeonStagedStats;
}

type Json = Record<string, unknown>;
export interface StageCheck {
  /** Break the shape; the stage's output cannot be used. */
  hard: string[];
  /** Coherence doubts; the output is usable but worth another look. */
  soft: string[];
}

const rec = (v: unknown): Json =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown): string =>
  typeof v === "string"
    ? v.trim()
    : arr(v)
        .filter((x): x is string => typeof x === "string")
        .join(" ")
        .trim();
const textList = (v: unknown): string[] =>
  arr(v)
    .map(text)
    .filter((s) => s.length > 0);

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw (
    signal.reason ?? new DOMException("The operation was aborted", "AbortError")
  );
}

function isAbort(err: unknown, signal?: AbortSignal): boolean {
  return (
    !!signal?.aborted ||
    (err instanceof DOMException && err.name === "AbortError")
  );
}

// ---------------------------------------------------------------------------
// Validation (pure)
// ---------------------------------------------------------------------------

const FOUNDATION_FIELDS = [
  "title",
  "summary",
  "throughline",
  "history",
  "currentState",
  "signatureFeature",
  "secret",
] as const;

export function checkFoundation(
  data: Json,
  resolved: ResolvedDungeon,
): StageCheck {
  const hard: string[] = [];
  const missing = FOUNDATION_FIELDS.filter((k) => !text(data[k]));
  if (missing.length > 0) {
    hard.push(`missing required fields: ${missing.join(", ")}`);
  }
  const ids = arr(data.sectorBriefs).map((b) => text(rec(b).id));
  const plan = resolved.sectors.map((s) => s.id);
  if (ids.join("|") !== plan.join("|")) {
    hard.push(
      `sectorBriefs must be exactly ${plan.join(", ")} in that order, got ${ids.join(", ") || "none"}`,
    );
  } else if (arr(data.sectorBriefs).some((b) => !text(rec(b).brief))) {
    hard.push("a sector brief is empty");
  }
  const banned = bannedNamesIn([text(data.title)]);
  if (banned.length > 0)
    hard.push(`title uses banned names: ${banned.join(", ")}`);
  return { hard, soft: [] };
}

function sectorListCountIssues(data: Json): string[] {
  const issues: string[] = [];
  for (const key of ["hazards", "treasures", "hooks"] as const) {
    const count = textList(data[key]).length;
    if (count < 2 || count > 3) {
      issues.push(`${key} must contain 2–3 entries, got ${count}`);
    }
  }
  return issues;
}

export function checkSectors(
  data: Json,
  resolved: ResolvedDungeon,
  avoidNames: string[] = [],
): StageCheck {
  const hard: string[] = [];
  const plan = resolved.sectors;
  const sectors = arr(data.sectors).map(rec);
  const ids = sectors.map((s) => text(s.id));
  if (ids.join("|") !== plan.map((s) => s.id).join("|")) {
    hard.push(
      `sectors must be exactly ${plan.map((s) => s.id).join(", ")} in that order, got ${ids.join(", ") || "none"}`,
    );
  } else {
    if (sectors.some((s) => !text(s.name) || !text(s.description))) {
      hard.push("a sector is missing its name or description");
    }
    const details = sectors.map((s) => text(s.stockDetail).toLowerCase());
    if (details.some((d) => !d)) hard.push("a sector has no stockDetail");
    else if (new Set(details).size !== details.length) {
      hard.push("two sectors share the same stocked content");
    }
    const names = sectors.map((s) => text(s.name).toLowerCase());
    if (new Set(names).size !== names.length) {
      hard.push("two sectors share the same name");
    }
    const banned = bannedNamesIn(
      sectors.map((s) => text(s.name)),
      avoidNames,
    );
    if (banned.length > 0) {
      hard.push(
        `sector names use banned or already-used names: ${banned.join(", ")}`,
      );
    }
  }
  hard.push(...sectorListCountIssues(data));
  return { hard, soft: [] };
}

const PLACE_WORDS =
  "Vault|Archive|Archives|Chamber|Hall|Stairwell|Gallery|Crypt|Tunnel|Passage|Annex|Sanctum|Cistern|Armoury|Armory|Library|Shaft|Bridge|Gate|Cellar|Lift|Elevator|Corridor|Laboratory|Reactor|Bunker";
const PLACE_PHRASE = new RegExp(
  `\\b((?:[A-Z][\\w'’-]+\\s+){1,3}(?:${PLACE_WORDS})s?)\\b`,
  "g",
);

const STOPWORDS = new Set(
  "that with from this their they have been into over under about which where when while hold held keep kept still near inside around those these there other than then them what will would could should must".split(
    " ",
  ),
);
const significant = (s: string): string[] =>
  s
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));

const ACQUIRE =
  /\b(secure|seize|recover|retrieve|obtain|claim|steal|acquire|take|find|loot|reclaim|collect|capture|locate)\b/i;
const OUT_OF_REACH =
  /\b(sealed|locked|cannot|can't|unable|out of reach|beyond (their )?reach|inaccessible|jammed|barred|guarded|trapped)\b/i;

type Inventory = Pick<
  DungeonJson,
  | "title"
  | "history"
  | "currentState"
  | "signatureFeature"
  | "secret"
  | "hazards"
  | "treasures"
  | "sectors"
>;

/** Everything the dungeon has established, lower-cased, for "does this exist?" lookups. */
function inventoryCorpus(d: Inventory, factionNames: string[] = []): string {
  return [
    d.title,
    d.history,
    d.currentState,
    d.signatureFeature,
    d.secret,
    ...d.hazards,
    ...d.treasures,
    ...d.sectors.flatMap((s) => [s.name, s.description, s.stockDetail ?? ""]),
    ...factionNames,
  ]
    .join("\n")
    .toLowerCase();
}

interface FactionLike {
  name: string;
  goal: string;
  obstacle: string;
  relationship: string;
  strength: string;
  origin: string;
  belief: string;
  territorySectorIds: string[];
}

/** Sector ids and named places a piece of faction text relies on but the delve never established. */
function unestablishedReferences(
  label: string,
  value: string,
  ids: ReadonlySet<string>,
  corpus: string,
): string[] {
  const issues: string[] = [];
  for (const m of value.matchAll(/\bsector-\d+\b/gi)) {
    if (!ids.has(m[0].toLowerCase())) {
      issues.push(`${label} refers to ${m[0]}, which does not exist`);
    }
  }
  for (const m of value.matchAll(PLACE_PHRASE)) {
    const phrase = m[1].replace(/^(the|a|an)\s+/i, "").toLowerCase();
    if (phrase && !corpus.includes(phrase)) {
      issues.push(
        `${label} names "${m[1]}", a place that is not established in the sectors or contents`,
      );
    }
  }
  return issues;
}

/** A goal to acquire something the faction's own territory already holds. */
function ownedGoalIssues(
  f: FactionLike,
  sectors: Inventory["sectors"],
): string[] {
  const goal = sanitizeGoal(f.goal);
  if (!ACQUIRE.test(goal) || OUT_OF_REACH.test(f.goal)) return [];
  const goalWords = new Set(significant(goal));
  return sectors
    .filter((s) => f.territorySectorIds.includes(s.id))
    .filter((s) => {
      const detail = significant(s.stockDetail ?? "");
      const shared = detail.filter((w) => goalWords.has(w));
      return detail.length > 0 && shared.length >= Math.min(2, detail.length);
    })
    .map(
      (s) =>
        `${f.name} goal is to get "${s.stockDetail}", which is already in its own territory (${s.name}) with no reason it is out of reach`,
    );
}

/**
 * Coherence doubts that need the established inventory: invented places and
 * goals to acquire what a faction already holds. Heuristic, so reported as
 * soft problems rather than rejecting a whole dungeon.
 */
export function checkFactionGrounding(
  factions: readonly FactionLike[],
  factionSituation: string,
  dungeon: Inventory,
): string[] {
  const corpus = inventoryCorpus(
    dungeon,
    factions.map((f) => f.name),
  );
  const ids = new Set(dungeon.sectors.map((s) => s.id));
  const issues = factions.flatMap((f) => [
    ...(
      [
        "goal",
        "obstacle",
        "relationship",
        "strength",
        "origin",
        "belief",
      ] as const
    ).flatMap((field) =>
      unestablishedReferences(`${f.name} ${field}`, f[field], ids, corpus),
    ),
    ...ownedGoalIssues(f, dungeon.sectors),
  ]);
  issues.push(
    ...unestablishedReferences(
      "factionSituation",
      factionSituation,
      ids,
      corpus,
    ),
  );
  return [...new Set(issues)];
}

const FACTION_FIELDS = [
  "identity",
  "goal",
  "obstacle",
  "origin",
  "belief",
  "strength",
  "relationship",
] as const;

function territoryProblems(
  label: string,
  f: Json,
  validSectorIds: ReadonlySet<string>,
): string[] {
  const territory = arr(f.territorySectorIds).map(String);
  if (territory.length === 0) return [`${label} has no territorySectorIds`];
  if (territory.every((id) => validSectorIds.has(id))) return [];
  return [
    `${label} territorySectorIds must be among ${[...validSectorIds].join(", ")}, got ${territory.join(", ")}`,
  ];
}

function checkFactionEntry(
  f: Json,
  index: number,
  validSectorIds: ReadonlySet<string>,
): string[] {
  const problems: string[] = [];
  const label = text(f.name) || `faction ${index + 1}`;
  const missing: string[] = FACTION_FIELDS.filter((k) => !text(f[k]));
  for (const n of ["leader", "notable"] as const) {
    if (!text(rec(f[n]).name) || !text(rec(f[n]).description)) missing.push(n);
  }
  if (missing.length > 0)
    problems.push(`${label} is missing: ${missing.join(", ")}`);
  problems.push(...territoryProblems(label, f, validSectorIds));
  if (!text(f.name)) problems.push(`faction ${index + 1} has no name`);
  else if (PLACEHOLDER_FACTION_NAME.test(text(f.name))) {
    problems.push(`${label} uses a placeholder name`);
  }
  return problems;
}

export function checkFactions(
  data: Json,
  resolved: ResolvedDungeon,
  sectors: DungeonJson["sectors"],
  inventory: Omit<Inventory, "sectors">,
  avoidNames: string[] = [],
): StageCheck {
  const hard: string[] = [];
  if (!text(data.factionSituation)) hard.push("factionSituation is missing");
  const raw = arr(data.factions).map(rec);
  if (raw.length !== 2) {
    hard.push(`expected 2 factions, got ${raw.length}`);
    return { hard, soft: [] };
  }
  const valid = new Set(sectors.map((s) => s.id));
  raw.forEach((f, i) => hard.push(...checkFactionEntry(f, i, valid)));
  const names = raw.map((f) => text(f.name).toLowerCase());
  if (names[0] && names[0] === names[1])
    hard.push("both factions have the same name");
  const banned = bannedNamesIn(
    raw.map((f) => text(f.name)),
    avoidNames,
  );
  if (banned.length > 0)
    hard.push(
      `faction names use banned or already-used names: ${banned.join(", ")}`,
    );
  if (hard.length > 0) return { hard, soft: [] };

  const soft = checkFactionGrounding(
    raw.map((f) => ({
      name: text(f.name),
      goal: text(f.goal),
      obstacle: text(f.obstacle),
      relationship: text(f.relationship),
      strength: text(f.strength),
      origin: text(f.origin),
      belief: text(f.belief),
      territorySectorIds: arr(f.territorySectorIds).map(String),
    })),
    text(data.factionSituation),
    { ...inventory, sectors },
  );
  return { hard, soft };
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function systemFor(resolved: ResolvedDungeon, stage: string): string {
  return `You are a master worldbuilder and TTRPG dungeon designer writing an original ${resolved.genre} delve a GM can run at the table. You write it in stages; this is the ${stage} stage.

Everything already established in earlier stages is authoritative: do not change it, rename it, or contradict it. The fixed structure (sector ids, each sector's stocked-content type, exactly two factions with their assigned drives) is honoured exactly. Be specific to this delve, not generic to the genre. Respect any campaign context the user supplied; it outranks the creative seeds.

Return ONLY a single valid JSON object matching the requested schema. ${NAME_BAN_PROMPT}`;
}

function settingBlock(
  options: DungeonGeneratorOptions,
  resolved: ResolvedDungeon,
  contextPrefix = "",
): string {
  const hint =
    GENRE_HINTS[resolved.genre] ||
    GENRE_HINTS["Classic Fantasy"] ||
    GENRE_HINTS["Fantasy"] ||
    "";
  return `${contextPrefix}Setting Context:
- Active Theme / Genre: ${resolved.genre} (${hint})
- Original Purpose: ${resolved.purpose}
- Current State: ${resolved.currentState}
- Scale: ${resolved.scale}
${formatCampaignContextBlock(options.campaignContext)}
${options.instruction ? `- Special Instructions: ${options.instruction}` : ""}`;
}

function withProblems(
  message: string,
  problems: string[],
  previous: Json | null,
) {
  if (problems.length === 0) return message;
  return `${message}

Your previous answer for this stage was not usable:
${problems.map((p) => `- ${p}`).join("\n")}
${previous ? `\nPrevious answer:\n${JSON.stringify(previous, null, 2)}\n` : ""}
Return the corrected JSON for this stage only. Keep whatever was already good; change only what the list requires.`;
}

function foundationMessage(
  options: DungeonGeneratorOptions,
  resolved: ResolvedDungeon,
  contextPrefix?: string,
): string {
  const plan = resolved.sectors.map((s) => s.id);
  return `Stage 1 of 3: lay the foundation of this delve.

${settingBlock(options, resolved, contextPrefix)}

${formatDungeonSeeds(
  resolved,
  avoidNamesExcludingContext(options.avoidNames ?? [], options.campaignContext),
  options.avoidTraits ?? [],
)}

Do not write sector names, hazards, treasures or factions yet. Later stages write those from what you establish here.

Required JSON schema:
{
  "title": "Evocative, specific name for this delve.",
  "summary": "1-2 sentence premise of why this location is interesting.",
  "throughline": "ONE sentence: who built it, what went wrong, and how that leaves it in the Current State above.",
  "history": "Who built it, what for, and what went wrong; must end where the throughline ends. Treasures later must fit who built it.",
  "currentState": "How it functions today, consistent with '${resolved.currentState}'.",
  "signatureFeature": "One distinctive landmark or phenomenon that defines this delve.",
  "secret": "The hidden truth at the heart of the delve, connected to the history.",
  "sectorBriefs": [
    // EXACTLY ${plan.length} entries, ids copied exactly, in this order: ${plan.join(", ")}
    { "id": "sector-1", "brief": "One sentence: this area's role in the delve and how it connects to the history or secret." }
  ]
}`;
}

function sectorsMessage(
  options: DungeonGeneratorOptions,
  resolved: ResolvedDungeon,
  foundation: Json,
  contextPrefix?: string,
): string {
  const plan = resolved.sectors
    .map((s) => `  ${s.id}: ${s.stockType ?? "Lore"}`)
    .join("\n");
  return `Stage 2 of 3: expand the sector briefs into the delve's geography and contents.

${settingBlock(options, resolved, contextPrefix)}

Established foundation (do not change):
${JSON.stringify(foundation, null, 2)}

Sector plan (id: stocked-content type), fixed:
${plan}

Do not add any sector beyond these. Do not write factions yet; they will be written against what you write here, so make the contents specific enough to want, guard or fear.

Required JSON schema:
{
  "sectors": [
    // EXACTLY ${resolved.sectors.length} entries, in plan order, "id" copied exactly
    { "id": "sector-1", "name": "Your name for this area — no leading number, no 'Sector N:' prefix", "description": "2-3 sentences of vivid, specific description that follows its brief.", "stockDetail": "One concrete thing here matching its stock type: a creature for Monster, findable evidence for Lore, a landmark for Special, a danger for Trap. Unique across sectors." }
  ],
  "hazards": ["2-3 distinct dangers, one per entry"],
  "treasures": ["2-3 distinct finds, one per entry, fitting who built this delve and what it was for"],
  "hooks": ["2-3 reasons a party would come here or rumours about it, one per entry"]
}`;
}

function factionsMessage(
  options: DungeonGeneratorOptions,
  resolved: ResolvedDungeon,
  established: Json,
  contextPrefix?: string,
): string {
  const drives = resolved.factions
    .map((f, i) => `  Faction ${i + 1}: ${f.drive}`)
    .join("\n");
  const ids = resolved.sectors.map((s) => s.id).join(", ");
  const one = (i: number) =>
    `{ "name": "An invented name — never 'Faction A', 'First Faction' or similar.", "identity": "One plain sentence: what these people are.", "virtue": "One-word virtue", "vice": "One-word vice", "goal": "Concrete, present-tense; achievable using only the established sectors and contents, and not something it already holds.", "drive": "${resolved.factions[i]?.drive ?? ""}", "obstacle": "What blocks it, drawn from an established sector, hazard, treasure or the other faction. One sentence.", "origin": "How it became connected to this delve, tied to the history.", "belief": "What it believes about the delve, interpreting established facts.", "territorySectorIds": ["one or more of: ${ids}"], "strength": "Its real advantage; not the territory itself, and it must not cancel the obstacle.", "leader": { "name": "Character name", "description": "One sentence." }, "notable": { "name": "A different character name", "description": "One sentence." }, "relationship": "This faction's own strategy toward the other faction; not a repeat of the standoff." }`;
  return `Stage 3 of 3: write the factions against the delve as it now exists.

${settingBlock(options, resolved, contextPrefix)}

Established delve (do not change, and do not add to it):
${JSON.stringify(established, null, 2)}

Fixed drives (each faction keeps its own):
${drives}

Rules:
- Territory is one or more of the sector ids above, never a place name.
- Factions animate the delve; they do not extend it. Small local dressing inside a held sector (a barricade, a camp, a patrol) is fine, but do not invent a new chamber, vault, archive, route, entrance, artifact or unexplained power.
- Goal, obstacle, belief and relationship must refer to sectors, hazards, treasures or the secret listed above.
- A faction must not seek something its own territory already holds (check the stockDetail of its sectors), unless the text says why it is out of reach.
- Drive explains why the faction wants its goal and fits its identity.

Required JSON schema:
{
  "factionSituation": "2-3 sentences naming both factions: what each wants, why that collides, why neither has won, what makes it unstable. It must match their actual goals.",
  "factions": [
    ${one(0)},
    ${one(1)}
  ]
}`;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

interface StageOutcome {
  data: Json;
  soft: string[];
}

/** One model call, parsed as a JSON object; `null` when it throws or is not one. */
async function askJson(
  deps: DungeonStagedDeps,
  system: string,
  message: string,
): Promise<Json | null> {
  try {
    const reply = await deps.complete(system, message);
    throwIfAborted(deps.signal);
    const parsed = parseFencedJson<unknown>(reply);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Json)
      : null;
  } catch (err) {
    if (isAbort(err, deps.signal)) throw err;
    return null;
  }
}

/**
 * Ask for one stage, with one targeted retry. A draft with no hard problems is
 * kept, so a failing retry falls back to it instead of discarding the stage.
 */
async function runStage(
  deps: DungeonStagedDeps,
  stats: DungeonStagedStats,
  id: DungeonStageId,
  system: string,
  message: string,
  check: (data: Json) => StageCheck,
): Promise<StageOutcome | null> {
  let problems: string[] = [];
  let previous: Json | null = null;
  let best: StageOutcome | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    throwIfAborted(deps.signal);
    stats.aiCalls++;
    const data = await askJson(
      deps,
      system,
      withProblems(message, problems, previous),
    );
    if (!data) {
      problems = ["the response was not a valid JSON object"];
      continue;
    }
    const result = check(data);
    if (result.hard.length === 0) {
      best = { data, soft: result.soft };
      if (result.soft.length === 0) {
        if (attempt > 0) stats.repairedStages.push(id);
        return best;
      }
    }
    problems = [...result.hard, ...result.soft];
    previous = data;
  }
  if (best) stats.repairedStages.push(id);
  return best;
}

function sectorsFrom(
  resolved: ResolvedDungeon,
  data: Json,
): DungeonJson["sectors"] {
  const byId = new Map(arr(data.sectors).map((s) => [text(rec(s).id), rec(s)]));
  return resolved.sectors.map((plan) => {
    const s = byId.get(plan.id) ?? {};
    return {
      id: plan.id,
      name: text(s.name),
      description: text(s.description),
      stockType: plan.stockType,
      stockDetail: text(s.stockDetail),
    };
  });
}

function factionsFrom(resolved: ResolvedDungeon, data: Json): Json[] {
  return arr(data.factions).map((f, i) => ({
    ...rec(f),
    // The drive is fixed input, not something the model gets to change.
    drive: resolved.factions[i]?.drive ?? text(rec(f).drive),
  }));
}

/** The foundation stage's validated output, as the facts later stages receive. */
function foundationFactsOf(f: Json) {
  return {
    title: text(f.title),
    throughline: text(f.throughline),
    history: text(f.history),
    currentState: text(f.currentState),
    signatureFeature: text(f.signatureFeature),
    secret: text(f.secret),
    sectorBriefs: arr(f.sectorBriefs).map((b) => ({
      id: text(rec(b).id),
      brief: text(rec(b).brief),
    })),
  };
}

const issuesOf = (d: DungeonJson) =>
  checkFactionGrounding(d.factions, d.factionSituation, d);

/**
 * Stage 4 repair: one call over the whole document with the known problems
 * named, using the existing proofreading prompt. Kept only if it parses and
 * leaves fewer problems; otherwise the assembled draft stands.
 */
async function repairCoherence(
  deps: DungeonStagedDeps,
  stats: DungeonStagedStats,
  current: DungeonParseResult,
  issues: string[],
  context: {
    options: DungeonGeneratorOptions;
    resolved: ResolvedDungeon;
    rng: Rng;
  },
): Promise<{ result: DungeonParseResult; issues: string[] }> {
  const unchanged = { result: current, issues };
  throwIfAborted(deps.signal);
  const repair = buildDungeonCoherencePrompt(
    current.structured!,
    context.resolved,
  );
  stats.aiCalls++;
  let reply: string;
  try {
    reply = await deps.complete(
      repair.systemInstruction,
      `${repair.userMessage}

Known problems to fix (touch only what these require):
${issues.map((p) => `- ${p}`).join("\n")}`,
    );
  } catch (err) {
    if (isAbort(err, deps.signal)) throw err;
    return unchanged;
  }
  throwIfAborted(deps.signal);
  const repaired = parseDungeonResponseDetailed(
    reply,
    context.options,
    context.rng,
    context.resolved,
  );
  if (repaired.rejected || !repaired.structured) return unchanged;
  const left = issuesOf(repaired.structured);
  if (left.length >= issues.length) return unchanged;
  stats.coherenceRepaired = true;
  return { result: repaired, issues: left };
}

/**
 * Run the staged route. Resolves `null` when a stage is unusable or the
 * assembled dungeon is rejected, so the caller can run the one-pass route.
 */
export async function generateDungeonStaged(
  resolved: ResolvedDungeon,
  options: DungeonGeneratorOptions,
  deps: DungeonStagedDeps,
): Promise<DungeonStagedResult | null> {
  const rng = deps.rng ?? defaultRng;
  const stats: DungeonStagedStats = {
    aiCalls: 0,
    repairedStages: [],
    coherenceRepaired: false,
    remainingIssues: [],
  };
  const avoid = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    options.campaignContext,
  );

  throwIfAborted(deps.signal);
  const foundation = await runStage(
    deps,
    stats,
    "foundation",
    systemFor(resolved, "foundation"),
    foundationMessage(options, resolved, deps.contextPrefix),
    (d) => checkFoundation(d, resolved),
  );
  if (!foundation) return null;
  const facts = foundationFactsOf(foundation.data);

  const geography = await runStage(
    deps,
    stats,
    "sectors",
    systemFor(resolved, "geography and contents"),
    sectorsMessage(options, resolved, facts, deps.contextPrefix),
    (d) => checkSectors(d, resolved, avoid),
  );
  if (!geography) return null;
  const sectors = sectorsFrom(resolved, geography.data);
  const hazards = textList(geography.data.hazards);
  const treasures = textList(geography.data.treasures);
  const hooks = textList(geography.data.hooks);

  const inventory = {
    title: facts.title,
    history: facts.history,
    currentState: facts.currentState,
    signatureFeature: facts.signatureFeature,
    secret: facts.secret,
    hazards,
    treasures,
  };
  const factions = await runStage(
    deps,
    stats,
    "factions",
    systemFor(resolved, "factions"),
    factionsMessage(
      options,
      resolved,
      { ...facts, sectors, hazards, treasures },
      deps.contextPrefix,
    ),
    (d) => checkFactions(d, resolved, sectors, inventory, avoid),
  );
  if (!factions) return null;

  // Stage 4: assemble through the existing parser so rendering, name rules
  // and fallbacks are exactly the one-pass route's.
  let final = parseDungeonResponseDetailed(
    JSON.stringify({
      ...inventory,
      summary: text(foundation.data.summary),
      throughline: facts.throughline,
      sectors,
      hooks,
      factionSituation: text(factions.data.factionSituation),
      factions: factionsFrom(resolved, factions.data),
    }),
    options,
    rng,
    resolved,
  );
  if (final.rejected || !final.structured) return null;

  let issues = issuesOf(final.structured);
  if (issues.length > 0) {
    ({ result: final, issues } = await repairCoherence(
      deps,
      stats,
      final,
      issues,
      { options, resolved, rng },
    ));
  }
  stats.remainingIssues = issues;

  return { output: final.output, structured: final.structured!, stats };
}
