/**
 * Defensive parsing of AI replies for the One-Shot Adventure Builder. Model
 * output is untrusted: every field is coerced, ids are reassigned by position
 * and the time budget is rebuilt, so only the writing is taken on trust.
 */

import { dedupeOneShot } from "./one-shot-dedupe";
import { parseFencedJson } from "./llm-response-utils";
import { normaliseTimeBudget, validateOneShot } from "./one-shot-validate";
import { ONE_SHOT_REQUIREMENT_KINDS } from "./one-shot-types";
import type {
  OneShotAdventure,
  OneShotChallenge,
  OneShotClock,
  OneShotQuestion,
  OneShotSolution,
  OneShotThread,
  OneShotClue,
  OneShotEnding,
  OneShotNpc,
  OneShotScene,
  OneShotSceneKind,
  ResolvedOneShot,
} from "./one-shot-types";

type Rec = Record<string, unknown>;

const CHALLENGE_TYPES: OneShotChallenge["type"][] = [
  "combat",
  "social",
  "exploration",
  "puzzle",
  "hazard",
];

export const rec = (v: unknown): Rec =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;
export const strs = (v: unknown): string[] =>
  list(v).filter((x): x is string => typeof x === "string" && !!x.trim());
const positive = (v: unknown, fallback: number): number =>
  Number(v) > 0 ? Number(v) : fallback;

export function challengeType(
  v: unknown,
  fallback: OneShotChallenge["type"],
): OneShotChallenge["type"] {
  return CHALLENGE_TYPES.find((t) => t === v) ?? fallback;
}

const DEFAULT_FAIL_FORWARD =
  "The party still moves on, but pays a cost: time, a favour, or the antagonist is warned.";

export function parseChallenge(
  raw: unknown,
  fallback?: OneShotChallenge,
): OneShotChallenge {
  const c = rec(raw);
  const other = strs(c.otherApproaches);
  return {
    type: challengeType(c.type, fallback?.type ?? "exploration"),
    description: str(c.description, fallback?.description ?? ""),
    success: str(c.success, fallback?.success ?? "") || undefined,
    otherApproaches: other.length ? other : fallback?.otherApproaches,
    opposition: str(c.opposition, fallback?.opposition ?? "") || undefined,
    failForward: str(
      c.failForward,
      fallback?.failForward ?? DEFAULT_FAIL_FORWARD,
    ),
  };
}

function parseScene(raw: unknown, i: number, count: number): OneShotScene {
  const r = rec(raw);
  const kind: OneShotSceneKind =
    i === 0 ? "opening" : i === count - 1 ? "climax" : "middle";
  return {
    id: `scene-${i + 1}`,
    title: str(r.title, `Scene ${i + 1}`),
    kind,
    essential: kind !== "middle" || r.essential !== false,
    minutes: positive(r.minutes, 30),
    purpose: str(r.purpose),
    situation: str(r.situation),
    location: str(r.location),
    npcIds: strs(r.npcIds),
    approaches: strs(r.approaches),
    clueIds: [],
    challenge: parseChallenge(r.challenge),
    outcomes: strs(r.outcomes),
    next: strs(r.next),
    shorten: str(r.shorten, "Run it as a single decisive beat, then move on."),
    skip: undefined,
  };
}

/** A skip note only belongs on an optional scene, and never as schema filler. */
function skipNote(raw: unknown, scene: OneShotScene): string | undefined {
  const skip = str(rec(raw).skip);
  if (scene.essential || !skip || /^optional scenes? only\.?$/i.test(skip)) {
    return undefined;
  }
  return skip;
}

const NPC_DETAIL = ["backstory", "tactics", "stopIf", "limits"] as const;

/** Merge the optional NPC detail fields, keeping `fallback` where `raw` has none. */
export function npcDetail(
  raw: unknown,
  fallback: Partial<OneShotNpc> = {},
): Partial<OneShotNpc> {
  const n = rec(raw);
  const out: Partial<OneShotNpc> = {};
  for (const key of NPC_DETAIL) {
    const value = str(n[key], fallback[key] ?? "");
    if (value) out[key] = value;
  }
  return out;
}

export function parseNpc(raw: unknown, i: number): OneShotNpc {
  const n = rec(raw);
  return {
    id: str(n.id, `npc-${i + 1}`),
    name: str(n.name, `NPC ${i + 1}`),
    role: str(n.role),
    motivation: str(n.motivation),
    knows: str(n.knows),
    reaction: str(n.reaction),
    cues: str(n.cues),
    ...npcDetail(n),
  };
}

const ANTAGONIST_ROLE = /villain|antagonist|cultist|tyrant|mastermind/i;

/** The model's antagonistId if it names a real NPC, else a role-based guess. */
function findAntagonist(raw: unknown, npcs: OneShotNpc[]): string | undefined {
  const id = str(raw);
  if (npcs.some((n) => n.id === id)) return id;
  return npcs.find((n) => ANTAGONIST_ROLE.test(n.role))?.id;
}

function parseClue(
  raw: unknown,
  i: number,
  sceneIds: Map<string, string>,
): OneShotClue {
  const c = rec(raw);
  const routes = list(c.routes).map((route) => {
    const r = rec(route);
    return {
      sceneId: sceneIds.get(String(r.sceneId)) ?? "",
      method: str(r.method, "Investigate"),
    };
  });
  return {
    id: str(c.id, `clue-${i + 1}`),
    label: str(c.label) || undefined,
    text: str(c.text, `Clue ${i + 1}`),
    essential: c.essential !== false,
    routes: routes.filter((r) => r.sceneId),
  };
}

function parseEnding(raw: unknown, i: number): OneShotEnding {
  const e = rec(raw);
  return {
    id: str(e.id, `end-${i + 1}`),
    title: str(e.title, `Ending ${i + 1}`),
    condition: str(e.condition),
    consequence: str(e.consequence),
  };
}

/** Parse scenes, remapping whatever ids the model used to `scene-N`. */
function parseScenes(rawScenes: unknown[]) {
  const sceneIds = new Map<string, string>();
  rawScenes.forEach((s, i) => {
    const id = rec(s).id;
    if (id) sceneIds.set(String(id), `scene-${i + 1}`);
  });
  const scenes = rawScenes.map((raw, i) => {
    const scene = parseScene(raw, i, rawScenes.length);
    scene.skip = skipNote(raw, scene);
    scene.next = scene.next
      .map((id) => sceneIds.get(id))
      .filter((id): id is string => !!id);
    if (scene.kind !== "climax" && scene.next.length === 0) {
      scene.next = [`scene-${i + 2}`];
    }
    return scene;
  });
  return { scenes, sceneIds };
}

function attachClues(scenes: OneShotScene[], clues: OneShotClue[]) {
  for (const clue of clues) {
    for (const route of clue.routes) {
      const scene = scenes.find((s) => s.id === route.sceneId);
      if (scene && !scene.clueIds.includes(clue.id)) {
        scene.clueIds.push(clue.id);
      }
    }
  }
}

export function parseQuestions(raw: unknown): OneShotQuestion[] {
  return list(raw)
    .map((q) => ({
      question: str(rec(q).question),
      answer: str(rec(q).answer),
    }))
    .filter((q) => q.question && q.answer);
}

function parseBriefing(raw: unknown): OneShotAdventure["briefing"] {
  const b = rec(raw);
  return {
    premise: str(b.premise),
    hook: str(b.hook),
    objective: str(b.objective),
    secret: str(b.secret),
    trigger: str(b.trigger) || undefined,
    stakes: str(b.stakes),
    prep: str(b.prep),
    questions: parseQuestions(b.questions),
  };
}

/** Scene references are remapped to `scene-N`; unknown ones are dropped. */
export function parseSolution(
  raw: unknown,
  sceneIds: (id: string) => string | undefined,
): OneShotSolution | undefined {
  const s = rec(raw);
  const requirements = list(s.requirements)
    .map((r) => {
      const req = rec(r);
      const kind = ONE_SHOT_REQUIREMENT_KINDS.find(
        (k) => k === str(req.kind).toLowerCase(),
      );
      return {
        ...(kind ? { kind } : {}),
        what: str(req.what),
        detail: str(req.detail),
        sceneIds: strs(req.sceneIds)
          .map(sceneIds)
          .filter((id): id is string => !!id),
      };
    })
    .filter((r) => r.what);
  const steps = strs(s.steps);
  if (!requirements.length && !steps.length) return undefined;
  return {
    summary: str(s.summary),
    requirements,
    steps,
    alternatives: strs(s.alternatives),
    mistakes: strs(s.mistakes),
  };
}

export function parseThreads(
  raw: unknown,
  sceneIds: (id: string) => string | undefined,
): OneShotThread[] {
  return list(raw)
    .map((t) => {
      const thread = rec(t);
      return {
        setup: str(thread.setup),
        payoff: str(thread.payoff),
        sceneIds: strs(thread.sceneIds)
          .map(sceneIds)
          .filter((id): id is string => !!id),
      };
    })
    .filter((t) => t.setup);
}

export function parseClock(raw: unknown): OneShotClock | undefined {
  const c = rec(raw);
  const ticks = list(c.ticks)
    .map((t) => ({ trigger: str(rec(t).trigger), effect: str(rec(t).effect) }))
    .filter((t) => t.effect);
  if (!ticks.length) return undefined;
  return {
    name: str(c.name, "The clock"),
    advances: str(c.advances),
    ticks,
    slow: str(c.slow),
    deadline: str(c.deadline) || undefined,
  };
}

const DEFAULT_RUNNING_LATE = [
  "Skip optional scenes first.",
  "Hand over the missing clue and go to the climax.",
];

/**
 * Parse an AI reply into a checked adventure. Throws when the reply cannot be
 * repaired into something playable so the caller falls back to local
 * generation instead of showing a broken adventure.
 */
export function parseOneShotAdventure(
  text: string,
  resolved: ResolvedOneShot,
): OneShotAdventure {
  const data = rec(parseFencedJson(text));
  const rawScenes = list(data.scenes);
  if (rawScenes.length < 3)
    throw new Error("One-shot reply has too few scenes.");
  if (rawScenes.length > 6)
    throw new Error("One-shot reply has too many scenes.");

  const { scenes, sceneIds } = parseScenes(rawScenes);
  const npcs = list(data.npcs).map(parseNpc);
  const npcIds = new Set(npcs.map((n) => n.id));
  for (const scene of scenes) {
    scene.npcIds = scene.npcIds.filter((id) => npcIds.has(id));
  }
  const clues = list(data.clues).map((c, i) => parseClue(c, i, sceneIds));
  attachClues(scenes, clues);

  const opening = rec(data.opening);
  const runningLate = strs(data.runningLate);
  const adventure = dedupeOneShot(
    normaliseTimeBudget({
      version: 1,
      title: str(data.title, "Untitled One-Shot"),
      genre: resolved.genre,
      system: resolved.system,
      emphasis: resolved.emphasis,
      structure: resolved.structure,
      tone: resolved.tone,
      durationMinutes: resolved.durationMinutes,
      partySize: resolved.partySize,
      partyLevel: resolved.partyLevel,
      briefing: parseBriefing(data.briefing),
      opening: {
        situation: str(opening.situation, scenes[0].situation),
        readAloud: str(opening.readAloud) || undefined,
        firstDecision: str(opening.firstDecision),
        involvement: strs(opening.involvement),
      },
      scenes,
      npcs,
      clues,
      endings: list(data.endings).map(parseEnding),
      antagonistId: findAntagonist(data.antagonistId, npcs),
      threads: parseThreads(data.threads, (id) => sceneIds.get(id)),
      solution: parseSolution(data.solution, (id) => sceneIds.get(id)),
      clock: parseClock(data.clock),
      epilogueHook: str(data.epilogueHook) || undefined,
      timeBudget: {
        bufferMinutes: 0,
        runningLate: runningLate.length ? runningLate : DEFAULT_RUNNING_LATE,
      },
    }),
  );
  const errors = validateOneShot(adventure).filter(
    (i) => i.severity === "error",
  );
  if (errors.length) {
    throw new Error(`One-shot reply is not playable: ${errors[0].message}`);
  }
  return adventure;
}

/** Merge a model's rewrite into a scene, keeping every locked field. */
export function mergeSceneReply(
  scene: OneShotScene,
  raw: unknown,
): OneShotScene {
  const d = rec(raw);
  const approaches = strs(d.approaches);
  const outcomes = strs(d.outcomes);
  return {
    ...scene,
    situation: str(d.situation, scene.situation),
    approaches: approaches.length ? approaches : scene.approaches,
    challenge: parseChallenge(d.challenge, scene.challenge),
    outcomes: outcomes.length ? outcomes : scene.outcomes,
  };
}

/** Merge a model's rewrite into an NPC. Name and role stay as they were. */
export function mergeNpcReply(npc: OneShotNpc, raw: unknown): OneShotNpc {
  const d = rec(raw);
  return {
    ...npc,
    ...npcDetail(d, npc),
    motivation: str(d.motivation, npc.motivation),
    knows: str(d.knows, npc.knows),
    reaction: str(d.reaction, npc.reaction),
    cues: str(d.cues, npc.cues),
  };
}
