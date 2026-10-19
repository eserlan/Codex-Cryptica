/**
 * Staged Adventure Idea generation (#4135). Instead of one call that writes
 * the whole concept at once, the adventure is written in dependency order,
 * each stage seeing only the validated output of the stages before it:
 *
 * 1. Situation: title, throughline, initial situation, the primary objective
 *    and where each objective asset is right now. A given situation and its
 *    deadline are binding.
 * 2. Places and people: the key locations and NPCs or factions, anchored to
 *    the situation. Every asset's place and holder must get its own card.
 * 3. Consequences: threats, discoveries, complications, rewards, outcomes and
 *    hooks, built only from what stages 1 and 2 established.
 * 4. Consistency check: the whole adventure is read back against antagonist
 *    logic, causality, resolution, timeline and player agency, and only text
 *    with an identified contradiction is revised (adventure-consistency.ts).
 *    It never fails the run: an unusable check keeps the adventure as written.
 *
 * Earlier stages are locked by construction: later stages return only their
 * own fields, so a retry cannot rename the objective or the cast. The result
 * goes through the one-pass parser, so rendering and the Adventure Canvas
 * converter see the same shape as before.
 *
 * An unusable stage resolves `null` and the caller runs the existing one-pass
 * route, which has its own local fallback. An abort throws; nothing partial
 * is returned.
 */

import {
  avoidNamesExcludingContext,
  extractProperNouns,
} from "./campaign-context";
import {
  type AdventureGeneratorOptions,
  type AdventurePrompt,
  parseAdventureResponseDetailed,
  seedFidelityProblems,
  userSuppliedText,
} from "./public-adventure";
import { asArray, asRecord, asString } from "./llm-response-utils";
import {
  type AdventureParts,
  adventureVocabulary,
  applyConsistencyRevisions,
  consistencyTask,
  readConsistencyReview,
} from "./adventure-consistency";
import { normName, sameName } from "./adventure-name";
import { bannedNamesIn } from "./naming-policy";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { type Rng, defaultRng } from "./random-utils";
import { StagedProgress, type StagedProgressStep } from "./staged-progress";
import {
  type CheckedDraft,
  type DraftCheck,
  askJson,
  runCheckedStage,
  throwIfAborted,
} from "./staged-runtime";

export { sameName } from "./adventure-name";

export type AdventureStageId = "situation" | "cast" | "consequences" | "review";

export interface AdventureStagedDeps {
  complete: (systemInstruction: string, userMessage: string) => Promise<string>;
  signal?: AbortSignal;
  rng?: Rng;
  /** Caller-supplied context (vault, naming, instructions) placed before every stage. */
  contextPrefix?: string;
  /** Live step list for the page, in the same shape as the other staged generators'. */
  onProgress?: (steps: StagedProgressStep[]) => void;
  /**
   * Called once when a run finishes or gives up (not on abort), so a dev build
   * can compare the staged route against the one-pass route.
   */
  onStats?: (stats: AdventureStagedStats) => void;
  /** Clock for `elapsedMs`; injectable for tests. */
  now?: () => number;
}

export interface AdventureStagedStats {
  /** "fell-back" means the caller ran the one-pass route instead. */
  outcome: "staged" | "fell-back";
  /** The step that gave up, when `outcome` is "fell-back". */
  stoppedAt?: AdventureStageId | "assembly";
  aiCalls: number;
  elapsedMs: number;
  repairedStages: AdventureStageId[];
  /** Problems the final document still has, from the one-pass checks. */
  remainingIssues: string[];
  /** What the final consistency check did; absent when it never ran. */
  consistency?: AdventureConsistencyStats;
}

export interface AdventureConsistencyStats {
  /**
   * "revised": fixes were applied. "unchanged": nothing needed fixing, or no
   * fix was valid. "kept-original": the fixes added a problem the
   * one-pass checks had not reported, so the original was kept. "unavailable": the check gave no usable reply.
   */
  result: "revised" | "unchanged" | "kept-original" | "unavailable";
  flaggedChecks: number;
  appliedRevisions: number;
  droppedRevisions: number;
}

/** The counts a dev build logs for a run, never any generated text. */
export function adventureStatsLog(stats: AdventureStagedStats) {
  return {
    outcome: stats.outcome,
    stoppedAt: stats.stoppedAt,
    aiCalls: stats.aiCalls,
    elapsedMs: stats.elapsedMs,
    repairedStageCount: stats.repairedStages.length,
    remainingIssueCount: stats.remainingIssues.length,
    consistency: stats.consistency,
  };
}

export interface AdventureStagedResult {
  output: PublicGeneratorOutput;
  stats: AdventureStagedStats;
}

type Json = Record<string, unknown>;

const text = (v: unknown): string => asString(v).trim();
const texts = (v: unknown): string[] =>
  asArray(v)
    .map(text)
    .filter((s) => s.length > 0);

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

const isKnown = (name: string, known: readonly string[]) =>
  known.some((k) => sameName(name, k));

function nameProblems(names: string[], avoid: string[]): string[] {
  const problems: string[] = [];
  const banned = bannedNamesIn(names);
  if (banned.length > 0) {
    problems.push(`uses banned cliché names: ${banned.join(", ")}`);
  }
  const reused = bannedNamesIn(names, avoid).filter((n) => !banned.includes(n));
  if (reused.length > 0) {
    problems.push(
      `reuses names already used elsewhere in this session: ${reused.join(", ")}`,
    );
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Validation (pure)
// ---------------------------------------------------------------------------

const SITUATION_FIELDS = [
  "title",
  "summary",
  "throughline",
  "initialSituation",
  "primaryObjective",
] as const;

const ASSET_STATUSES = [
  "essential",
  "expendable",
  "optional",
  "secretly critical",
];

interface Asset {
  name: string;
  status: string;
  place: string;
  heldBy: string;
}

function assetsOf(situation: Json): Asset[] {
  return asArray(situation.assets).map((a) => {
    const r = asRecord(a);
    return {
      name: text(r.name),
      status: text(r.status).toLowerCase(),
      place: text(r.place),
      heldBy: text(r.heldBy),
    };
  });
}

/** Distinct names, keeping the first spelling of each. */
function distinctNames(names: string[]): string[] {
  const out: string[] = [];
  for (const n of names) if (n && !isKnown(n, out)) out.push(n);
  return out;
}

/** Stage 1: the situation contract. */
export function checkSituation(
  d: Json,
  options: AdventureGeneratorOptions,
  avoid: string[],
): DraftCheck {
  const hard: string[] = [];
  const soft: string[] = [];
  const missing = SITUATION_FIELDS.filter((f) => !text(d[f]));
  if (missing.length > 0) {
    hard.push(`missing required fields: ${missing.join(", ")}`);
  }
  const assets = assetsOf(d);
  assets.forEach((a, i) => {
    if (!a.name || !a.place) {
      hard.push(
        `assets[${i}] needs a "name" and the "place" it is in right now`,
      );
    }
    if (a.status && !ASSET_STATUSES.includes(a.status)) {
      soft.push(
        `assets[${i}] status "${a.status}" should be one of: ${ASSET_STATUSES.join(", ")}`,
      );
    }
  });
  if (distinctNames(assets.map((a) => a.place)).length > 3) {
    hard.push(
      "objective assets are spread over more than 3 places; use at most 3",
    );
  }
  if (distinctNames(assets.map((a) => a.heldBy)).length > 3) {
    hard.push("objective assets have more than 3 holders; use at most 3");
  }
  hard.push(...nameProblems([text(d.title)], avoid));
  hard.push(
    ...seedFidelityProblems(
      options.seed,
      JSON.stringify(d),
      `${text(d.summary)} ${text(d.primaryObjective)}`,
    ),
  );
  return { hard, soft };
}

/** How many locations and NPCs stage 2 is asked for. */
export interface CastCounts {
  locations: number;
  npcs: number;
}

/** Stage 2: places and people, anchored to the situation's assets. */
export function checkCast(
  d: Json,
  situation: Json,
  avoid: string[],
): DraftCheck {
  const hard: string[] = [];
  const soft: string[] = [];
  const locations = asArray(d.keyLocations).map(asRecord);
  const npcs = asArray(d.npcs).map(asRecord);

  // The prompt asks for the drawn count; anything in range is accepted, so a
  // near miss does not cost a retry.
  for (const [label, n] of [
    ["keyLocations", locations.length],
    ["npcs", npcs.length],
  ] as const) {
    if (n < 2 || n > 3) hard.push(`write 2-3 ${label} (got ${n})`);
  }

  const incomplete = (
    list: Json[],
    label: string,
    fields: readonly string[],
  ) => {
    list.forEach((item, i) => {
      const gaps = fields.filter((f) => !text(item[f]));
      if (gaps.length > 0) {
        hard.push(`${label}[${i}] is missing: ${gaps.join(", ")}`);
      }
    });
  };
  incomplete(locations, "keyLocations", ["name", "description", "dilemma"]);
  incomplete(npcs, "npcs", ["name", "role", "goal", "dilemma"]);

  const locationNames = locations.map((l) => text(l.name)).filter(Boolean);
  const npcNames = npcs.map((n) => text(n.name)).filter(Boolean);
  const all = [...locationNames, ...npcNames];
  // Exact names only: a faction named after its base ("Weir Mill Guild")
  // is not a duplicate of the place ("Weir Mill").
  const duplicates = all.filter(
    (n, i) => all.findIndex((m) => normName(m) === normName(n)) !== i,
  );
  if (duplicates.length > 0) {
    hard.push(
      `each name must be distinct: ${[...new Set(duplicates)].join(", ")}`,
    );
  }

  for (const asset of assetsOf(situation)) {
    if (asset.place && !isKnown(asset.place, locationNames)) {
      hard.push(
        `"${asset.name}" is at "${asset.place}", which needs its own keyLocations card with that name`,
      );
    }
    // A holder can be a person or a faction, and a faction may be written as
    // a place it controls.
    if (asset.heldBy && !isKnown(asset.heldBy, all)) {
      hard.push(
        `"${asset.name}" is held by "${asset.heldBy}", who needs their own npcs entry with that name`,
      );
    }
  }
  hard.push(...nameProblems(all, avoid));
  return { hard, soft };
}

/** Each consequence list and its allowed range. Every entry must be grounded. */
const CONSEQUENCE_LISTS = {
  threats: { min: 1, max: 2 },
  discoveries: { min: 2, max: 3 },
  complications: { min: 2, max: 3 },
  rewards: { min: 1, max: 3 },
  outcomes: { min: 2, max: 3 },
  hooks: { min: 2, max: 3 },
} as const;

type ConsequenceList = keyof typeof CONSEQUENCE_LISTS;

export type ConsequenceCounts = Record<ConsequenceList, number>;

const isConsequenceProblem = (problem: string) =>
  problem.startsWith("Primary objective deadline/clock");

/** Stage 3: consequences built only from what stages 1 and 2 established. */
export function checkConsequences(
  d: Json,
  established: string[],
  assembled: () => string[],
): DraftCheck {
  const hard: string[] = [];
  const soft: string[] = [];
  for (const [list, rule] of Object.entries(CONSEQUENCE_LISTS) as [
    ConsequenceList,
    (typeof CONSEQUENCE_LISTS)[ConsequenceList],
  ][]) {
    const entries = asArray(d[list]).map(asRecord);
    if (entries.length < rule.min) {
      hard.push(`write at least ${rule.min} ${list} (got ${entries.length})`);
    } else if (entries.length > rule.max) {
      soft.push(`write at most ${rule.max} ${list} (got ${entries.length})`);
    }
    entries.forEach((entry, i) => {
      if (!text(entry.title) || !text(entry.text)) {
        hard.push(`${list}[${i}] needs a "title" and a "text"`);
      }
      const involves = texts(entry.involves);
      if (involves.length === 0) {
        hard.push(
          `${list}[${i}] should list in "involves" the established names it depends on`,
        );
      }
      const unknown = involves.filter((n) => !isKnown(n, established));
      if (unknown.length > 0) {
        hard.push(
          `${list}[${i}] involves ${unknown.map((n) => `"${n}"`).join(", ")}, which earlier stages never established; use only established places, people and assets`,
        );
      }
    });
  }
  asArray(d.discoveries)
    .map(asRecord)
    .forEach((entry, i) => {
      const opens = text(entry.opens);
      if (!opens) {
        hard.push(
          `discoveries[${i}] needs "opens": the established place, person or route it opens up, or the decision it changes`,
        );
      } else if (!established.some((n) => isKnown(n, [opens]))) {
        soft.push(
          `discoveries[${i}] "opens" should name the established place, person or asset it leads to`,
        );
      }
    });
  if (hard.length > 0) return { hard, soft };

  // Of the one-pass checks over the assembled document, only clock
  // integration is this stage's to fix. The rest concern stages 1 and 2,
  // which are locked by now, and are reported as remaining issues instead.
  soft.push(...assembled().filter(isConsequenceProblem));
  return { hard, soft };
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function stageMessage(
  prompt: AdventurePrompt,
  contextPrefix: string,
  stage: string,
  established: Json | null,
  task: string,
  schema: string,
): string {
  return `${contextPrefix}${prompt.briefing}

${stage}
${
  established
    ? `
Established in earlier stages. This is fixed: use these names exactly, and do not change, rename or contradict any of it:
${JSON.stringify(established, null, 2)}
`
    : ""
}
${task}

Return ONLY a JSON object with exactly these fields, and no others:
${schema}`;
}

function situationMessage(
  prompt: AdventurePrompt,
  contextPrefix: string,
): string {
  return stageMessage(
    prompt,
    contextPrefix,
    "STAGE 1 OF 3: the situation.",
    null,
    `Write the situation that the rest of the adventure must build on. Later stages add places, people and consequences; here, establish only:
- the title and a ONE-sentence throughline that governs everything else;
- the initial situation: what is happening right now, who set it in motion, why it demands action now, and what role the player characters play;
- ONE primary objective with explicit success conditions and the pressure that makes delay costly. Use a clock only when the pressure really is time; social, political or resource pressure needs none;
- every objective asset (cargo, evidence, prisoners, relics, people to protect) with the named place it is in right now and who holds it, if anyone. Keep them to at most 3 places and 3 holders. If assets are split, say so in initialSituation too.`,
    `{
  "title": "Evocative, specific title for this adventure.",
  "summary": "1-2 sentence premise: what is this adventure about and why should players care?",
  "throughline": "ONE sentence: who set events in motion, what is at stake, and how that leads to the initial situation and primary objective.",
  "initialSituation": "2-3 sentences, as described above.",
  "primaryObjective": "One clear objective with explicit success conditions and the pressure that makes inaction costly.",
  "assets": [
    { "name": "", "status": "essential | expendable | optional | secretly critical", "place": "the named place it is in now", "heldBy": "the named person or faction holding it, or empty" }
  ]
}`,
  );
}

function castMessage(
  prompt: AdventurePrompt,
  contextPrefix: string,
  situation: Json,
  counts: CastCounts,
): string {
  return stageMessage(
    prompt,
    contextPrefix,
    "STAGE 2 OF 3: places and people.",
    situation,
    `Write exactly ${counts.locations} key locations and exactly ${counts.npcs} important NPCs or factions, anchored to the established situation.
- Every asset's "place" must be one of the key locations, using that exact name.
- Every asset's "heldBy" must be one of the NPCs or factions, using that exact name.
- Each one needs a role in this situation, a relation to another established element, leverage the players can use, and a dilemma between two legitimate priorities.
- Do not write threats, clues, complications or outcomes yet.`,
    `{
  "keyLocations": [
    { "name": "", "description": "2 sentences: physical description and atmosphere.", "role": "", "relation": "", "leverage": "", "dilemma": "" }
  ],
  "npcs": [
    { "name": "", "role": "", "relation": "", "goal": "What they want, specific and actionable", "secret": "", "leverage": "", "dilemma": "" }
  ]
}`,
  );
}

function consequencesMessage(
  prompt: AdventurePrompt,
  contextPrefix: string,
  established: Json,
  counts: ConsequenceCounts,
): string {
  return stageMessage(
    prompt,
    contextPrefix,
    "STAGE 3 OF 3: playable consequences.",
    established,
    `Write ${counts.threats} threats, ${counts.discoveries} discoveries, ${counts.complications} complications, ${counts.rewards} rewards, ${counts.outcomes} possible outcomes and ${counts.hooks} hooks, using only what is established above.
- Every entry must grow out of the established situation, places, people and assets. Do not introduce a new critical place, person or object now.
- In "involves", list the established names the entry depends on, spelled exactly as above. Leave out the player characters.
- Each discovery's "opens" names the established place, person or route it opens up, or the decision it changes.
- If the primary objective carries a clock, the threats or complications must use it.
- Complications add decisions, costs or shifted relationships, not just difficulty.
- Outcomes are distinct world end-states after the adventure, not tactics or mid-scene events.`,
    `{
  "threats": [{ "title": "", "text": "1-2 sentences: who or what opposes the party", "involves": [""] }],
  "discoveries": [{ "title": "", "text": "1-2 sentences: an actionable revelation", "opens": "", "involves": [""] }],
  "complications": [{ "title": "", "text": "1-2 sentences", "involves": [""] }],
  "rewards": [{ "title": "", "text": "1 sentence, proportionate to the stakes", "involves": [""] }],
  "outcomes": [{ "title": "", "text": "2-3 sentences: a different world end-state", "involves": [""] }],
  "hooks": [{ "title": "", "text": "1-2 sentences: why a particular party would engage", "involves": [""] }]
}`,
  );
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/** A consequence entry in the one-pass list format: "**Title**: text". */
function entryLines(v: unknown): string[] {
  return asArray(v)
    .map(asRecord)
    .map((e) => {
      const title = text(e.title).replace(/\*\*/g, "");
      const body = text(e.text);
      return title && body ? `**${title}**: ${body}` : title || body;
    })
    .filter(Boolean);
}

/** The three stages as one document in the one-pass response shape. */
export function assembleAdventure(
  situation: Json,
  cast: Json,
  consequences: Json,
): Json {
  return {
    title: text(situation.title),
    summary: text(situation.summary),
    throughline: text(situation.throughline),
    initialSituation: text(situation.initialSituation),
    primaryObjective: text(situation.primaryObjective),
    keyLocations: asArray(cast.keyLocations),
    npcs: asArray(cast.npcs),
    threats: entryLines(consequences.threats),
    discoveries: entryLines(consequences.discoveries),
    complications: entryLines(consequences.complications),
    rewards: entryLines(consequences.rewards),
    outcomes: entryLines(consequences.outcomes),
    hooks: entryLines(consequences.hooks),
  };
}

/** Every name a stage-3 entry may depend on. */
function establishedNames(
  situation: Json,
  cast: Json,
  options: AdventureGeneratorOptions,
): string[] {
  const named = (v: unknown) =>
    asArray(v)
      .map((x) => text(asRecord(x).name))
      .filter(Boolean);
  return distinctNames([
    ...named(cast.keyLocations),
    ...named(cast.npcs),
    ...assetsOf(situation).flatMap((a) => [a.name, a.place, a.heldBy]),
    ...extractProperNouns(userSuppliedText(options)),
  ]);
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const PROGRESS_STEPS: ReadonlyArray<{ id: AdventureStageId; label: string }> = [
  { id: "situation", label: "Situation, objective and stakes" },
  { id: "cast", label: "Places, people and factions" },
  { id: "consequences", label: "Threats, clues and outcomes" },
  { id: "review", label: "Consistency check" },
];

interface RunState {
  stats: AdventureStagedStats;
  progress: StagedProgress<AdventureStageId>;
  /** The system instruction every call uses. */
  system: string;
}

function runStage(
  deps: AdventureStagedDeps,
  run: RunState,
  id: AdventureStageId,
  system: string,
  message: string,
  check: (data: Json) => DraftCheck,
): Promise<CheckedDraft<Json> | null> {
  return runCheckedStage(
    deps.complete,
    run,
    { id, system, message, check },
    deps.signal,
  );
}

const clampCount = (n: number) => Math.min(3, Math.max(2, n));

/**
 * Run the staged route. Resolves `null` when a stage is unusable or the
 * assembled adventure is rejected, so the caller can run the one-pass route.
 */
export async function generateAdventureStaged(
  prompt: AdventurePrompt,
  options: AdventureGeneratorOptions,
  deps: AdventureStagedDeps,
): Promise<AdventureStagedResult | null> {
  const now = deps.now ?? Date.now;
  const started = now();
  const stats: AdventureStagedStats = {
    outcome: "fell-back",
    aiCalls: 0,
    elapsedMs: 0,
    repairedStages: [],
    remainingIssues: [],
  };
  const result = await runStaged(prompt, options, deps, stats);
  if (result) stats.outcome = "staged";
  stats.elapsedMs = now() - started;
  deps.onStats?.(stats);
  return result ? { output: result, stats } : null;
}

async function runStaged(
  prompt: AdventurePrompt,
  options: AdventureGeneratorOptions,
  deps: AdventureStagedDeps,
  stats: AdventureStagedStats,
): Promise<PublicGeneratorOutput | null> {
  const rng = deps.rng ?? defaultRng;
  const prefix = deps.contextPrefix ? `${deps.contextPrefix}\n\n` : "";
  const resolved = prompt.resolved;
  const run: RunState = {
    stats,
    progress: new StagedProgress(PROGRESS_STEPS, deps.onProgress),
    system: prompt.systemInstruction,
  };
  const avoid = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    userSuppliedText(options),
  );
  const stop = (at: AdventureStagedStats["stoppedAt"]) => {
    stats.stoppedAt = at;
    return null;
  };
  const system = prompt.systemInstruction;

  throwIfAborted(deps.signal);
  const situation = await runStage(
    deps,
    run,
    "situation",
    system,
    situationMessage(prompt, prefix),
    (d) => checkSituation(d, options, avoid),
  );
  if (!situation) return stop("situation");
  const contract = situation.data;

  const assets = assetsOf(contract);
  const counts: CastCounts = {
    locations: clampCount(
      Math.max(
        resolved.keyLocations.length,
        distinctNames(assets.map((a) => a.place)).length,
      ),
    ),
    npcs: clampCount(resolved.npcRoles.length),
  };
  const cast = await runStage(
    deps,
    run,
    "cast",
    system,
    castMessage(prompt, prefix, contract, counts),
    (d) => checkCast(d, contract, avoid),
  );
  if (!cast) return stop("cast");

  const established = establishedNames(contract, cast.data, options);
  const consequenceCounts: ConsequenceCounts = {
    threats: Math.min(2, Math.max(1, resolved.threats.length)),
    discoveries: clampCount(resolved.discoveries.length),
    complications: clampCount(resolved.complications.length),
    rewards: Math.min(3, Math.max(1, resolved.rewards.length)),
    outcomes: clampCount(resolved.outcomes.length),
    hooks: clampCount(resolved.hooks.length),
  };
  const consequences = await runStage(
    deps,
    run,
    "consequences",
    system,
    consequencesMessage(
      prompt,
      prefix,
      { ...contract, ...cast.data },
      consequenceCounts,
    ),
    (d) =>
      checkConsequences(
        d,
        established,
        () =>
          parseAdventureResponseDetailed(
            JSON.stringify(assembleAdventure(contract, cast.data, d)),
            options,
            rng,
            resolved,
          ).problems,
      ),
  );
  if (!consequences) return stop("consequences");

  return finishAdventure(
    deps,
    run,
    {
      situation: contract,
      cast: cast.data,
      consequences: consequences.data,
    },
    (parts) =>
      parseAdventureResponseDetailed(
        JSON.stringify(
          assembleAdventure(parts.situation, parts.cast, parts.consequences),
        ),
        options,
        rng,
        resolved,
      ),
    `${prefix}${prompt.briefing}`,
    established,
  );
}

/**
 * Assemble the three stages, run the consistency check over the result and
 * keep its fixes only when they add no new problem to the adventure.
 */
async function finishAdventure(
  deps: AdventureStagedDeps,
  run: RunState,
  parts: AdventureParts,
  assemble: (
    parts: AdventureParts,
  ) => ReturnType<typeof parseAdventureResponseDetailed>,
  briefing: string,
  established: string[],
): Promise<PublicGeneratorOutput | null> {
  let final = assemble(parts);
  if (final.rejected) {
    run.progress.set("review", "skipped");
    run.stats.stoppedAt = "assembly";
    return null;
  }
  const revised = await checkConsistency(
    deps,
    run,
    `${briefing}\n\n${consistencyTask(parts)}`,
    parts,
    established,
  );
  if (revised) {
    const candidate = assemble(revised);
    // A fix that adds any problem the one-pass checks did not already
    // report (a dropped seed deadline, a banned name) is not a fix.
    if (
      !candidate.rejected &&
      candidate.problems.every((p) => final.problems.includes(p))
    ) {
      final = candidate;
    } else {
      if (run.stats.consistency) run.stats.consistency.result = "kept-original";
      run.progress.set("review", "done", "kept as written");
    }
  }
  run.stats.remainingIssues = final.problems;
  return final.output;
}

/**
 * The final consistency check: one call over the whole adventure. Resolves
 * the revised parts, or `null` when nothing changes. Never fails the run; an
 * unusable reply keeps the adventure as written. Cancellation propagates.
 */
async function checkConsistency(
  deps: AdventureStagedDeps,
  run: RunState,
  message: string,
  parts: AdventureParts,
  established: string[],
): Promise<AdventureParts | null> {
  run.progress.set("review", "active");
  const reply = await askJson(
    () => {
      run.stats.aiCalls++;
      return deps.complete(run.system, message);
    },
    // Retry once, like the writing stages, so one transient failure does
    // not skip the check.
    { signal: deps.signal, attempts: 2 },
  );
  if (!reply) {
    run.stats.consistency = {
      result: "unavailable",
      flaggedChecks: 0,
      appliedRevisions: 0,
      droppedRevisions: 0,
    };
    run.progress.set("review", "skipped", "kept as written");
    return null;
  }
  const review = readConsistencyReview(
    reply,
    parts,
    adventureVocabulary(parts, established),
  );
  const applied = review.revisions.length;
  run.stats.consistency = {
    result: applied > 0 ? "revised" : "unchanged",
    flaggedChecks: review.flagged.length,
    appliedRevisions: applied,
    droppedRevisions: review.dropped.length,
  };
  run.progress.set(
    "review",
    "done",
    applied > 0 ? `${applied} fix${applied === 1 ? "" : "es"}` : undefined,
  );
  return applied > 0
    ? applyConsistencyRevisions(parts, review.revisions)
    : null;
}
