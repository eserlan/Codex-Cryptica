/**
 * Staged one-shot generation. Instead of one long call that either returns a
 * whole adventure or nothing, the adventure is built in short steps, each
 * written knowing the earlier ones: core → plan → finale → scenes and
 * supporting cast → review. Progress is reported after every step so the
 * page can show what is happening.
 *
 * A failed core or plan has nothing to build on, so it throws and the caller
 * falls back to local generation. A later part that fails is written from
 * templates for that part only, and reported so the GM can regenerate it.
 */

import { localDecisions } from "./one-shot-local-state";
import { parseFencedJson } from "./llm-response-utils";
import { parseOneShotAdventure, rec } from "./one-shot-parse";
import { checkPlayability } from "./one-shot-playability";
import { sceneOrder } from "./one-shot-state";
import {
  applyOneShotRepair,
  buildOneShotRepairPrompt,
  isReadableRepair,
} from "./one-shot-repair";
import {
  corePrompt,
  finalePrompt,
  npcsPrompt,
  scenePrompt,
  structurePrompt,
  type SceneBrief,
  type StagePrompt,
} from "./one-shot-stage-prompts";
import type {
  OneShotAdventure,
  OneShotGap,
  OneShotGeneratorOptions,
  ResolvedOneShot,
} from "./one-shot-types";
import { regenerateOneShotLocal, resolveOneShot } from "./public-one-shot";
import { type Rng, defaultRng } from "./random-utils";

export type OneShotStepStatus =
  "pending" | "active" | "done" | "fallback" | "skipped";

export interface OneShotProgressStep {
  id: "core" | "structure" | "finale" | "scenes" | "npcs" | "review";
  label: string;
  status: OneShotStepStatus;
  /** e.g. "3 of 5" while scenes are being written. */
  detail?: string;
}

export interface OneShotStageDeps {
  /** Run one prompt and return the model's text. */
  call: (prompt: StagePrompt, signal?: AbortSignal) => Promise<string>;
  signal?: AbortSignal;
  onProgress?: (steps: OneShotProgressStep[]) => void;
}

export interface OneShotStagedResult {
  adventure: OneShotAdventure;
  resolved: ResolvedOneShot;
  /** Parts written from templates because their AI step didn't finish. */
  fallbackParts: string[];
  /** The final review didn't finish or couldn't be read. */
  reviewSkipped: boolean;
}

type Json = Record<string, unknown>;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const STEP_LABELS: Record<OneShotProgressStep["id"], string> = {
  core: "Premise, villain and stakes",
  structure: "Scenes, clues and the clock",
  finale: "How the finale works",
  scenes: "Writing the scenes",
  npcs: "Supporting characters",
  review: "Checking it runs from the page",
};

class Progress {
  private steps: OneShotProgressStep[] = (
    Object.keys(STEP_LABELS) as OneShotProgressStep["id"][]
  ).map((id) => ({ id, label: STEP_LABELS[id], status: "pending" }));

  constructor(private emit?: (steps: OneShotProgressStep[]) => void) {}

  set(
    id: OneShotProgressStep["id"],
    status: OneShotStepStatus,
    detail?: string,
  ) {
    this.steps = this.steps.map((s) =>
      s.id === id ? { ...s, status, detail } : s,
    );
    this.emit?.(this.steps.map((s) => ({ ...s })));
  }
}

/** One call, retried once; resolves to parsed JSON or null if both fail. */
async function ask(
  deps: OneShotStageDeps,
  prompt: StagePrompt,
): Promise<Json | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    throwIfAborted(deps.signal);
    try {
      const data = parseFencedJson(await deps.call(prompt, deps.signal));
      throwIfAborted(deps.signal);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return data as Json;
      }
    } catch {
      throwIfAborted(deps.signal);
      // try again, then give up
    }
  }
  return null;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw (
    signal.reason ?? new DOMException("The operation was aborted", "AbortError")
  );
}

/** What a written scene settled, for the scenes after it. */
function sceneRecord(brief: SceneBrief, draft: Json | null) {
  const scene = brief.scene;
  return {
    id: scene.id,
    title: scene.title,
    outcomes: draft ? list(draft.outcomes) : [],
    exit: draft?.exit ?? scene.whereabouts ?? [],
  };
}

function cluesForScene(clues: unknown[], id: string): unknown[] {
  const sceneClues = [];
  for (const c of clues) {
    const recC = rec(c);
    const routes = list(recC.routes);
    let foundMethod;
    let routeFound = false;
    for (const r of routes) {
      const recR = rec(r);
      if (recR.sceneId === id) {
        foundMethod = recR.method;
        routeFound = true;
        break;
      }
    }
    if (routeFound) {
      sceneClues.push({
        label: recC.label,
        text: recC.text,
        foundBy: foundMethod,
      });
    }
  }
  return sceneClues;
}

function threadsForScene(threads: unknown[], id: string): unknown[] {
  const sceneThreads = [];
  for (const t of threads) {
    const recT = rec(t);
    const sceneIds = list(recT.sceneIds);
    let found = false;
    for (const sceneId of sceneIds) {
      if (String(sceneId) === id) {
        found = true;
        break;
      }
    }
    if (found) sceneThreads.push(recT);
  }
  return sceneThreads;
}

function npcsForScene(npcs: unknown[], npcIds: string[]): unknown[] {
  const sceneNpcs = [];
  for (const n of npcs) {
    const recN = rec(n);
    if (npcIds.includes(String(recN.id))) sceneNpcs.push(recN);
  }
  return sceneNpcs;
}

function sceneBriefs(structure: Json): SceneBrief[] {
  const npcs = list(structure.npcs);
  const clues = list(structure.clues);
  const threads = list(structure.threads);
  return list(structure.scenes).map((raw, i) => {
    const scene = rec(raw);
    const id = String(scene.id ?? `scene-${i + 1}`);
    const npcIds = list(scene.npcIds).map(String);

    // ⚡ Bolt Optimization: Replace chained .map().filter() with imperative loops
    return {
      scene,
      isOpening: i === 0,
      clues: cluesForScene(clues, id),
      threads: threadsForScene(threads, id),
      npcs: npcsForScene(npcs, npcIds),
    };
  });
}

/** The cast in id order: patron, antagonist, then the supporting NPCs. */
function castOf(core: Json, structure: Json, profiles: Json | null) {
  const detail = new Map(
    list(profiles?.npcs).map((n) => [String(rec(n).id), rec(n)]),
  );
  return [
    { ...rec(core.patron), id: "npc-1" },
    { ...rec(core.antagonist), id: "npc-2" },
    ...list(structure.npcs).map((n) => ({
      ...rec(n),
      ...detail.get(String(rec(n).id)),
    })),
  ];
}

const FALLBACK_ENDINGS = (villain: string) => [
  {
    id: "end-1",
    title: "Stopped in Time",
    requires: { stopped: true, clean: true },
    condition: `The party uses what it learned to stop ${villain} before the clock runs out.`,
    consequence: "The threat ends and the party is owed a debt.",
  },
  {
    id: "end-2",
    title: "A Costly Bargain",
    requires: { stopped: true, clean: false },
    condition: `The party makes a deal with ${villain} or loses the key evidence.`,
    consequence: `${villain} keeps part of what they wanted.`,
  },
];

/** The finale's endings and the decisions behind them, or template ones. */
function finaleParts(finale: Json | null, villain: string) {
  return list(finale?.endings).length
    ? { endings: finale?.endings, decisions: finale?.decisions }
    : {
        endings: FALLBACK_ENDINGS(villain),
        decisions: localDecisions(villain),
      };
}

interface Drafts {
  core: Json;
  structure: Json;
  finale: Json | null;
  scenes: (Json | null)[];
  profiles: Json | null;
}

function assemble(drafts: Drafts): Json {
  const { core, structure, finale, scenes, profiles } = drafts;
  const villain = String(rec(core.antagonist).name ?? "the antagonist");
  const opening = rec(scenes[0]?.opening);
  return {
    title: core.title,
    briefing: core.briefing,
    opening: { situation: scenes[0]?.situation, ...opening },
    scenes: list(structure.scenes).map((raw, i) => ({
      ...rec(raw),
      ...(scenes[i] ?? {}),
    })),
    npcs: castOf(core, structure, profiles),
    antagonistId: "npc-2",
    clues: structure.clues,
    threads: structure.threads,
    resources: structure.resources,
    theories: structure.theories,
    ...finaleParts(finale, villain),
    clock: structure.clock,
    runningLate: structure.runningLate,
    solution: finale?.solution,
    epilogueHook: finale?.epilogueHook,
  };
}

/** Template-fill the parts whose AI step didn't finish. */
function fillFailedParts(
  adventure: OneShotAdventure,
  drafts: Drafts,
  rng: Rng,
): { adventure: OneShotAdventure; parts: string[] } {
  let filled = adventure;
  const parts: string[] = [];
  drafts.scenes.forEach((scene, i) => {
    const target = filled.scenes[i];
    if (scene || !target) return;
    filled = regenerateOneShotLocal(
      filled,
      { kind: "scene", id: target.id },
      rng,
    ).adventure;
    parts.push(target.title);
  });
  if (!drafts.profiles) {
    for (const npc of filled.npcs.slice(2)) {
      filled = regenerateOneShotLocal(
        filled,
        { kind: "npc", id: npc.id },
        rng,
      ).adventure;
    }
    if (filled.npcs.length > 2) parts.push("Supporting characters");
  }
  if (!drafts.finale) parts.push("Finale and endings");
  return { adventure: filled, parts };
}

/** One repair call against the given problems, retried once if unreadable. */
async function repairOnce(
  deps: OneShotStageDeps,
  adventure: OneShotAdventure,
  gaps: OneShotGap[],
): Promise<OneShotAdventure | null> {
  const prompt = buildOneShotRepairPrompt(adventure, gaps);
  for (let attempt = 0; attempt < 2; attempt++) {
    throwIfAborted(deps.signal);
    try {
      const text = await deps.call(prompt, deps.signal);
      throwIfAborted(deps.signal);
      if (isReadableRepair(text)) return applyOneShotRepair(adventure, text);
    } catch {
      throwIfAborted(deps.signal);
    }
  }
  return null;
}

/**
 * Review, check again, and repair what is still wrong, so the GM only sees
 * problems that survived two rounds. A second round that makes things worse
 * is thrown away.
 */
async function review(
  deps: OneShotStageDeps,
  adventure: OneShotAdventure,
): Promise<{ adventure: OneShotAdventure; skipped: boolean }> {
  const first = await repairOnce(deps, adventure, checkPlayability(adventure));
  if (!first) return { adventure, skipped: true };
  const left = checkPlayability(first);
  if (!left.length) return { adventure: first, skipped: false };
  const second = await repairOnce(deps, first, left);
  const better = second && checkPlayability(second).length < left.length;
  return { adventure: better ? second : first, skipped: false };
}

async function required(
  deps: OneShotStageDeps,
  progress: Progress,
  id: "core" | "structure",
  prompt: StagePrompt,
): Promise<Json> {
  throwIfAborted(deps.signal);
  progress.set(id, "active");
  const data = await ask(deps, prompt);
  if (!data) {
    progress.set(id, "fallback");
    throw new Error(`One-shot ${id} step did not finish.`);
  }
  progress.set(id, "done");
  return data;
}

async function writeParts(
  deps: OneShotStageDeps,
  progress: Progress,
  resolved: ResolvedOneShot,
  context: { core: Json; structure: Json; finale: Json | null },
) {
  const briefs = sceneBriefs(context.structure);
  const supporting = list(context.structure.npcs);
  let written = 0;
  progress.set("scenes", "active", `0 of ${briefs.length}`);
  if (supporting.length) progress.set("npcs", "active");
  // Keep one history per route so alternatives do not overwrite one another
  // before they converge on a shared scene.
  const writeScenes = async () => {
    const drafts: (Json | null)[] = briefs.map(() => null);
    const histories = briefs.map(() => [] as unknown[][]);
    const briefIndex = new Map(
      briefs.map((brief, i) => [String(brief.scene.id), i]),
    );
    const hasPredecessor = new Set(
      briefs.flatMap((brief) =>
        list(brief.scene.next)
          .map((id) => briefIndex.get(String(id)))
          .filter((index): index is number => index !== undefined),
      ),
    );
    briefs.forEach((_, i) => {
      if (!hasPredecessor.has(i)) histories[i].push([]);
    });
    const order = sceneOrder(
      briefs,
      (brief) => String(brief.scene.id),
      (brief) => list(brief.scene.next).map(String),
    );
    for (const i of order) {
      const brief = briefs[i];
      throwIfAborted(deps.signal);
      const draft = await ask(
        deps,
        scenePrompt(resolved, context, brief, histories[i]),
      );
      drafts[i] = draft;
      const record = sceneRecord(brief, draft);
      for (const nextId of list(brief.scene.next).map(String)) {
        const nextIndex = briefIndex.get(nextId);
        if (nextIndex !== undefined) {
          histories[nextIndex].push(
            ...histories[i].map((route) => [...route, record]),
          );
        }
      }
      written += 1;
      progress.set("scenes", "active", `${written} of ${briefs.length}`);
    }
    return drafts;
  };
  const npcTask = async () =>
    supporting.length ? ask(deps, npcsPrompt(context, supporting)) : null;
  const [profiles, scenes] = await Promise.all([npcTask(), writeScenes()]);
  const failedScenes = scenes.filter((s) => !s).length;
  progress.set(
    "scenes",
    failedScenes ? "fallback" : "done",
    failedScenes ? `${failedScenes} from templates` : undefined,
  );
  progress.set(
    "npcs",
    !supporting.length ? "skipped" : profiles ? "done" : "fallback",
  );
  return { scenes, profiles };
}

/**
 * Generate a one-shot in stages. Throws only when the core or plan can't be
 * produced; the caller then falls back to a fully local adventure.
 */
export async function runOneShotStages(
  options: OneShotGeneratorOptions,
  deps: OneShotStageDeps,
  sessionContext = "",
  rng: Rng = defaultRng,
): Promise<OneShotStagedResult> {
  throwIfAborted(deps.signal);
  const progress = new Progress(deps.onProgress);
  const resolved = resolveOneShot(options, rng);
  const core = await required(
    deps,
    progress,
    "core",
    corePrompt(resolved, sessionContext),
  );
  const structure = await required(
    deps,
    progress,
    "structure",
    structurePrompt(resolved, core),
  );

  progress.set("finale", "active");
  const finale = await ask(deps, finalePrompt(core, structure));
  progress.set("finale", finale ? "done" : "fallback");

  const { scenes, profiles } = await writeParts(deps, progress, resolved, {
    core,
    structure,
    finale,
  });
  const drafts: Drafts = { core, structure, finale, scenes, profiles };
  const parsed = parseOneShotAdventure(
    JSON.stringify(assemble(drafts)),
    resolved,
  );
  const { adventure: filled, parts } = fillFailedParts(parsed, drafts, rng);

  progress.set("review", "active");
  const reviewed = await review(deps, filled);
  progress.set("review", reviewed.skipped ? "skipped" : "done");

  return {
    adventure: reviewed.adventure,
    resolved,
    fallbackParts: parts,
    reviewSkipped: reviewed.skipped,
  };
}
