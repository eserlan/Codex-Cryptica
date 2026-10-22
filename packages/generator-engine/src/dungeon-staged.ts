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
 * 3. factions: written against the sectors, contents and layout that now
 *    exist, including what each has done to the sectors it holds
 * 4. coherence: assemble, run the deterministic checks and one model review,
 *    and repair only if either finds something
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
  FIXING_DETAIL,
  ONE_PASS_DETAIL,
  StagedProgress,
} from "./staged-progress";
import {
  askModel,
  type CheckedDraft,
  isAbort,
  readJsonObject,
  runCheckedStage,
  throwIfAborted,
} from "./staged-runtime";
import {
  buildDungeonCoherencePrompt,
  formatDungeonSeeds,
  parseDungeonResponseDetailed,
  type DungeonParseResult,
  type DungeonGeneratorOptions,
  type DungeonJson,
  type ResolvedDungeon,
} from "./public-dungeon";
import { GENRE_HINTS } from "./public-dungeon-constants";
import { NAME_BAN_PROMPT } from "./public-npc";
import { type Rng, defaultRng } from "./random-utils";

import { asArray as arr, asRecord as rec } from "./llm-response-utils";
import { text, textList, presenceOf } from "./dungeon-stage-data";
import { checkFoundation, checkSectors } from "./dungeon-stage-checks";
import { checkFactions } from "./dungeon-faction-checks";
import { checkFactionGrounding } from "./dungeon-faction-grounding";
import { checkTerritoryAccess } from "./dungeon-territory-access";
import type { JsonObject as Json } from "./staged-runtime";
import type {
  DungeonStagedDeps,
  DungeonStagedStats,
  DungeonStagedResult,
  DungeonStageId,
  StageCheck,
  ProgressId,
  RunState,
} from "./dungeon-staged-types";

export type {
  DungeonStageId,
  DungeonStagedDeps,
  DungeonStagedStats,
  DungeonStagedResult,
  StageCheck,
} from "./dungeon-staged-types";
export { checkFoundation, checkSectors } from "./dungeon-stage-checks";
export { checkFactions } from "./dungeon-faction-checks";
export { checkFactionGrounding } from "./dungeon-faction-grounding";
export { checkTerritoryAccess } from "./dungeon-territory-access";

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

/** The fixed sector connections, labelled with names once sectors have them. */
function layoutBlock(
  resolved: ResolvedDungeon,
  names: readonly string[] = [],
): string {
  const label = (i: number) => {
    const id = resolved.sectors[i]?.id ?? `sector-${i + 1}`;
    return names[i] ? `${id} (${names[i]})` : id;
  };
  const lines = resolved.sectorEdges.map(
    (e) => `- ${label(e.from)} ↔ ${label(e.to)}, via ${e.via}`,
  );
  return `Layout (fixed; these are the only connections between sectors):
${lines.join("\n")}`;
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
  "history": "Who built it, what for, and what went wrong; must end where the throughline ends. Say how the thing that went wrong actually happened (the mechanism, not only that it failed), and do not restate the throughline or summary. Treasures later must fit who built it.",
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

${layoutBlock(resolved)}

Do not add any sector beyond these. Where the signature feature or the secret reaches into a sector, say how it shows there, so the place reads as one connected structure. Do not write factions yet; they will be written against what you write here, so make the contents specific enough to want, guard or fear.

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
  const names = arr(established.sectors).map((s) => text(rec(s).name));
  const one = (i: number) =>
    `{ "name": "An invented name — never 'Faction A', 'First Faction' or similar.", "identity": "One plain sentence: what these people are.", "virtue": "One-word virtue", "vice": "One-word vice", "goal": "Concrete, present-tense; achievable using only the established sectors and contents, and not something it already holds.", "drive": "${resolved.factions[i]?.drive ?? ""}", "obstacle": "What blocks it, drawn from an established sector, hazard, treasure or the other faction. One sentence.", "origin": "How it became connected to this delve, tied to the history.", "belief": "What it believes about the delve, interpreting established facts.", "territorySectorIds": ["one or more of: ${ids}"], "presence": [{ "sectorId": "each territory id, once", "detail": "One sentence: what this faction has done to that sector — a camp, barricade, shrine, ritual preparations, cataloguing, damage — visible to anyone who walks in." }], "strength": "Its real advantage; not the territory itself, and it must not cancel the obstacle.", "leader": { "name": "Character name", "description": "One sentence." }, "notable": { "name": "A different character name", "description": "One sentence." }, "relationship": "This faction's own strategy toward the other faction; not a repeat of the standoff." }`;
  return `Stage 3 of 3: write the factions against the delve as it now exists.

${settingBlock(options, resolved, contextPrefix)}

Established delve (do not change, and do not add to it):
${JSON.stringify(established, null, 2)}

Fixed drives (each faction keeps its own):
${drives}

${layoutBlock(resolved, names)}

Rules:
- Territory is one or more of the sector ids above, never a place name.
- Territory follows the layout. If a faction holds sectors that only connect through ground it does not hold, its strength, obstacle or relationship must say how it crosses or holds out (a smuggling route through an established hazard, a truce, an isolated enclave); otherwise give it connected sectors.
- The delve is occupied now. For every sector in a faction's territory, presence says what that faction has changed there.
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

const PROGRESS_STEPS: ReadonlyArray<{ id: ProgressId; label: string }> = [
  { id: "foundation", label: "History, secret and layout" },
  { id: "sectors", label: "Sectors, hazards and treasures" },
  { id: "factions", label: "Factions and what they want" },
  { id: "coherence", label: "Checking it all fits together" },
];

type StageOutcome = CheckedDraft<Json>;

/**
 * Ask for one stage, with one targeted retry that names the problems. A draft
 * with no hard problems is kept, so a failing retry falls back to it instead
 * of discarding the stage.
 */
function runStage(
  deps: DungeonStagedDeps,
  run: RunState,
  id: DungeonStageId,
  system: string,
  message: string,
  check: (data: Json) => StageCheck,
): Promise<StageOutcome | null> {
  return runCheckedStage(
    deps.complete,
    run,
    { id, system, message, check },
    deps.signal,
  );
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
  return arr(data.factions).map((f, i) => {
    const { presence: _presence, ...rest } = rec(f);
    return {
      ...rest,
      // The drive is fixed input, not something the model gets to change.
      drive: resolved.factions[i]?.drive ?? text(rec(f).drive),
    };
  });
}

/** Each faction's presence, moved onto the sectors it holds. */
function withPresence(
  sectors: DungeonJson["sectors"],
  data: Json,
): DungeonJson["sectors"] {
  const bySector = new Map<string, { faction: string; detail: string }[]>();
  for (const f of arr(data.factions).map(rec)) {
    const held = new Set(arr(f.territorySectorIds).map(String));
    for (const p of presenceOf(f)) {
      if (!held.has(p.sectorId)) continue;
      const list = bySector.get(p.sectorId) ?? [];
      list.push({ faction: text(f.name), detail: p.detail });
      bySector.set(p.sectorId, list);
    }
  }
  return sectors.map((s) =>
    bySector.has(s.id) ? { ...s, presence: bySector.get(s.id) } : s,
  );
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

/** Deterministic problems in an assembled delve. */
function issuesOf(d: DungeonJson, resolved: ResolvedDungeon): string[] {
  const factions = d.factions.map((f) => ({
    ...f,
    presence: d.sectors.flatMap((s) =>
      (s.presence ?? [])
        .filter((p) => p.faction === f.name)
        .map((p) => p.detail),
    ),
  }));
  return [
    ...checkFactionGrounding(factions, d.factionSituation, d),
    ...checkTerritoryAccess(factions, d.sectors, resolved.sectorEdges),
  ];
}

const REVIEW_SYSTEM = `You check a finished TTRPG dungeon write-up for problems a GM would trip over at the table. You do not rewrite it and you do not suggest improvements to prose that works. Return ONLY a single valid JSON object.`;

/** Marks the review message, so tests and logs can tell it from the repair. */
export const DUNGEON_REVIEW_MARKER = "Coherence review of a finished delve.";

function reviewMessage(
  d: DungeonJson,
  resolved: ResolvedDungeon,
  contextPrefix = "",
): string {
  return `${contextPrefix}${DUNGEON_REVIEW_MARKER}

${layoutBlock(
  resolved,
  d.sectors.map((s) => s.name),
)}

Delve:
${JSON.stringify(d, null, 2)}

List only real problems, at most 5, from these kinds:
- History and current state cannot both be true, or the secret contradicts the history.
- The central event (what went wrong) has no stated mechanism: it says that something happened but never how.
- The place reads as undisturbed although factions hold sectors in it, or a held sector shows no sign of who holds it.
- A faction cannot physically reach its own territory or goal along the layout above, and nothing says how it manages.
- A field restates another field instead of adding to it.

Campaign context above, if any, is established truth: something it explains is not a problem.

Each problem names the fields involved and says what is wrong in one sentence. If there are none, return an empty list.

Required JSON schema:
{ "issues": ["..."] }`;
}

/**
 * A model review of the assembled delve for the problems the deterministic
 * checks cannot see, retried once like every stage. Returns no issues when
 * both attempts fail or are unreadable; a missing review never blocks the
 * result.
 */
async function reviewCoherence(
  deps: DungeonStagedDeps,
  { stats }: RunState,
  d: DungeonJson,
  resolved: ResolvedDungeon,
): Promise<string[]> {
  const message = reviewMessage(d, resolved, deps.contextPrefix);
  const issues = await askModel(
    () => {
      stats.aiCalls++;
      return deps.complete(REVIEW_SYSTEM, message);
    },
    (reply) => {
      const data = readJsonObject(reply);
      return data && Array.isArray(data.issues)
        ? textList(data.issues).slice(0, 5)
        : null;
    },
    { signal: deps.signal, attempts: 2 },
  );
  if (issues) return issues;
  stats.reviewSkipped = true;
  return [];
}

/** Keep each sector's presence when the repair answer leaves it out. */
function keepPresence(reply: string, before: DungeonJson): string {
  let parsed: unknown;
  try {
    parsed = parseFencedJson<unknown>(reply);
  } catch {
    return reply;
  }
  const d = rec(parsed);
  if (!Array.isArray(d.sectors)) return reply;
  d.sectors = d.sectors.map((s, i) => {
    const sector = rec(s);
    const presence = before.sectors[i]?.presence;
    return arr(sector.presence).length === 0 && presence
      ? { ...sector, presence }
      : sector;
  });
  return JSON.stringify(d);
}

/**
 * Stage 4 repair: one call over the whole document with the known problems
 * named, using the existing proofreading prompt. Kept only if it parses and
 * does not add deterministic problems; with no review findings it must also
 * remove some, since then there is nothing else it could have fixed.
 */
async function repairCoherence(
  deps: DungeonStagedDeps,
  { stats, progress }: RunState,
  current: DungeonParseResult,
  found: { checks: string[]; review: string[] },
  context: {
    options: DungeonGeneratorOptions;
    resolved: ResolvedDungeon;
    rng: Rng;
  },
): Promise<{ result: DungeonParseResult; issues: string[] }> {
  const unchanged = {
    result: current,
    issues: [...found.checks, ...found.review],
  };
  throwIfAborted(deps.signal);
  progress.set("coherence", "active", FIXING_DETAIL);
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
${[...found.checks, ...found.review].map((p) => `- ${p}`).join("\n")}

Keep each sector's "presence" entries, updating a faction name there if you rename the faction.`,
    );
  } catch (err) {
    if (isAbort(err, deps.signal)) throw err;
    return unchanged;
  }
  throwIfAborted(deps.signal);
  const repaired = parseDungeonResponseDetailed(
    keepPresence(reply, current.structured!),
    context.options,
    context.rng,
    context.resolved,
  );
  if (repaired.rejected || !repaired.structured) return unchanged;
  const left = issuesOf(repaired.structured, context.resolved);
  const better =
    left.length < found.checks.length ||
    (left.length <= found.checks.length && found.review.length > 0);
  if (!better) return unchanged;
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
  const stats: DungeonStagedStats = {
    outcome: "fell-back",
    aiCalls: 0,
    repairedStages: [],
    reviewIssues: [],
    reviewSkipped: false,
    coherenceRepaired: false,
    remainingIssues: [],
  };
  const result = await runStaged(resolved, options, deps, stats);
  if (result) stats.outcome = "staged";
  deps.onStats?.(stats);
  return result;
}

async function runStaged(
  resolved: ResolvedDungeon,
  options: DungeonGeneratorOptions,
  deps: DungeonStagedDeps,
  stats: DungeonStagedStats,
): Promise<DungeonStagedResult | null> {
  const rng = deps.rng ?? defaultRng;
  const run: RunState = {
    stats,
    progress: new StagedProgress(PROGRESS_STEPS, deps.onProgress),
  };
  const avoid = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    options.campaignContext,
  );
  const stop = (at: DungeonStagedStats["stoppedAt"]) => {
    stats.stoppedAt = at;
    return null;
  };

  throwIfAborted(deps.signal);
  const foundation = await runStage(
    deps,
    run,
    "foundation",
    systemFor(resolved, "foundation"),
    foundationMessage(options, resolved, deps.contextPrefix),
    (d) => checkFoundation(d, resolved),
  );
  if (!foundation) return stop("foundation");
  const facts = foundationFactsOf(foundation.data);

  const geography = await runStage(
    deps,
    run,
    "sectors",
    systemFor(resolved, "geography and contents"),
    sectorsMessage(options, resolved, facts, deps.contextPrefix),
    (d) => checkSectors(d, resolved, avoid),
  );
  if (!geography) return stop("sectors");
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
    run,
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
  if (!factions) return stop("factions");

  // Stage 4: assemble through the existing parser so rendering, name rules
  // and fallbacks are exactly the one-pass route's.
  run.progress.set("coherence", "active");
  let final = parseDungeonResponseDetailed(
    JSON.stringify({
      ...inventory,
      summary: text(foundation.data.summary),
      throughline: facts.throughline,
      sectors: withPresence(sectors, factions.data),
      hooks,
      factionSituation: text(factions.data.factionSituation),
      factions: factionsFrom(resolved, factions.data),
    }),
    options,
    rng,
    resolved,
  );
  if (final.rejected || !final.structured) {
    run.progress.abandon("coherence", ONE_PASS_DETAIL);
    return stop("assembly");
  }

  const checks = issuesOf(final.structured, resolved);
  throwIfAborted(deps.signal);
  const review = await reviewCoherence(deps, run, final.structured, resolved);
  stats.reviewIssues = review;
  let issues = [...checks, ...review];
  if (issues.length > 0) {
    ({ result: final, issues } = await repairCoherence(
      deps,
      run,
      final,
      { checks, review },
      { options, resolved, rng },
    ));
  }
  stats.remainingIssues = issues;
  run.progress.set("coherence", "done");

  return { output: final.output, structured: final.structured!, stats };
}
