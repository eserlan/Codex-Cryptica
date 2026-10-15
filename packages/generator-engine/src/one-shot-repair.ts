/**
 * Review and repair for the One-Shot Adventure Builder. After generation the
 * model reads its whole adventure back as an editor and GM: it checks the
 * story holds together across scenes, fills the gaps the playability review
 * found, and tightens prose that repeats itself. The reply is merged field
 * by field: ids, times, essential flags, links, names and titles stay
 * locked, and a repair that breaks the structure is thrown away.
 */

import { parseFencedJson } from "./llm-response-utils";
import {
  npcDetail,
  parseChallenge,
  parseClock,
  parseNpc,
  parseQuestions,
  parseSolution,
  parseThreads,
  rec,
  str,
  strs,
} from "./one-shot-parse";
import { dedupeOneShot } from "./one-shot-dedupe";
import { parseResources } from "./one-shot-resources";
import {
  normaliseState,
  parseDecisions,
  parseRequires,
  parseRoutes,
  parseTheories,
  parseVerdicts,
  parseWhereabouts,
} from "./one-shot-state";
import {
  CLOCK_DATA_RULE,
  CLOCK_RULE,
  COMMITMENT_RULE,
  CONTINUITY_RULE,
  DECISIONS_RULE,
  EMPHASIS_HINT,
  ENDINGS_RULE,
  PACING_RULE,
  REQUIREMENT_RULE,
  ROUTES_RULE,
  THEORIES_RULE,
  RESOURCE_RULE,
  THREAD_DATA_RULE,
  WHEREABOUTS_RULE,
} from "./one-shot-rules";
import { validateOneShot } from "./one-shot-validate";
import type {
  OneShotAdventure,
  OneShotClue,
  OneShotTheory,
  OneShotGap,
  OneShotNpc,
  OneShotScene,
} from "./one-shot-types";

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function buildOneShotRepairPrompt(
  adventure: OneShotAdventure,
  gaps: OneShotGap[],
): { systemInstruction: string; userMessage: string } {
  const found = gaps.length
    ? `\nThe automatic check found these gaps; fix every one:\n${gaps.map((g) => `- ${g.message}`).join("\n")}\n`
    : "";
  return {
    systemInstruction:
      "You are an experienced game master and editor reviewing a one-shot adventure so it can be run straight from the page and reads like an adventure, not a checklist.",
    userMessage: `Here is a one-shot adventure as JSON:
${JSON.stringify(adventure)}

Walk through running it scene by scene as the GM, then review it as a whole.
${found}
Check, and fix in place:
1. Commitments: list every consequential fact or promise the hook, briefing and opening make (a person in danger, a rule an object follows, a restriction on an NPC, a piece of history) in "threads", with how and in which later scene it pays off. Later scenes must respect every restriction and agree with every history. If a scene contradicts one, rewrite the scene.
2. Antagonist: the NPC driving the threat has a full profile (backstory: why they are doing this; tactics: how they act or fight when opposed; stopIf: what would persuade them to stop) and is in the finale. Set "antagonistId". If they are missing from the NPCs, add them.
3. Clock: ${CLOCK_RULE} ${CLOCK_DATA_RULE} The clock agrees with the stakes and the finale.
4. Emphasis (${adventure.emphasis}): the scenes deliver it as play, not just theme: ${EMPHASIS_HINT[adventure.emphasis] ?? "match the scenes to it"}. Action means real opposition: enemies with tactics, battlefield hazards and conditions that change mid-scene, in "opposition". To add a route between scenes, use "addNext".
5. Intent over passwords: no challenge or finale step may require reciting exact words. Clever reasoning, or clearly expressing the right intent, succeeds.
6. Compression: state each fact once, where the GM needs it. Rewrite scene situations as tight adventure prose. Do not repeat clue text, solutions or answers across scenes.
7. Endings: ${ENDINGS_RULE}
8. Causes and rescues: ${COMMITMENT_RULE}
9. Pacing: ${PACING_RULE} Remove any act or part timings from the briefing.
10. Continuity: follow every named NPC and important object through the scenes in order. ${CONTINUITY_RULE} Fix a contradiction in the scene text, not by renaming.
11. Finale requirements: ${REQUIREMENT_RULE}
12. Who is where: ${WHEREABOUTS_RULE} ${ROUTES_RULE} ${THREAD_DATA_RULE} ${RESOURCE_RULE}
13. Decisions and theories: ${DECISIONS_RULE} ${THEORIES_RULE} Theories only for an investigation or mystery.

Rules:
- Keep the premise, title, scene ids, titles, minutes, essential flags, NPC names and roles unchanged. Links may only be added, with "addNext".
- State facts outright: real names, words, objects and their order.
- Vital facts, and every "clue" requirement, must be found in an essential scene before the finale.
- Only include the parts you change. Return {} if nothing needs changing.

Return only JSON shaped like:
{
  "antagonistId": "npc-2",
  "briefing": { "trigger": "", "prep": "", "questions": [{ "question": "", "answer": "" }] },
  "decisions": [{ "id": "stopped", "question": "" }],
  "theories": [{ "id": "theory-1", "name": "", "summary": "", "isTrue": false, "obvious": true }],
  "endings": [{ "id": "end-1", "condition": "", "consequence": "", "requires": { "stopped": true } }],
  "resources": [{ "id": "food", "name": "", "start": 5, "unit": "", "spends": [{ "sceneId": "scene-1", "what": "", "amount": 1 }], "whenEmpty": "" }],
  "threads": [{ "about": "npc-3", "kind": "rescue", "setup": "", "payoff": "", "sceneIds": ["scene-3"] }],
  "solution": { "summary": "", "requirements": [{ "kind": "clue", "what": "", "detail": "", "sceneIds": ["scene-2"] }], "steps": [""], "alternatives": [""], "mistakes": [""] },
  "clock": { "name": "", "advances": "", "schedule": ["scene-end-after-opening", "finale-start"], "startsAt": 1, "pushes": "", "ticks": [{ "trigger": "", "effect": "" }], "slow": "", "deadline": "" },
  "scenes": [{ "id": "scene-2", "situation": "", "approaches": [""], "addNpcIds": ["npc-4"], "addNext": ["scene-4"], "whereabouts": [{ "who": "npc-1", "kind": "npc", "state": "free", "where": "", "how": "" }], "routes": [{ "to": "scene-4", "risk": "", "find": "" }], "challenge": { "type": "combat", "description": "", "success": "", "otherApproaches": [""], "opposition": "", "failForward": "" } }],
  "npcs": [{ "id": "npc-1", "name": "only for a new NPC", "role": "only for a new NPC", "motivation": "", "knows": "", "reaction": "", "cues": "", "backstory": "", "tactics": "", "stopIf": "", "limits": "" }],
  "clues": [{ "id": "clue-1", "text": "", "addRoutes": [{ "sceneId": "scene-2", "method": "" }], "supports": ["theory-2"], "contradicts": ["theory-1"] }]
}
Do not include markdown code block formatting like \`\`\`json.`,
  };
}

function repairBriefing(
  briefing: OneShotAdventure["briefing"],
  raw: unknown,
): OneShotAdventure["briefing"] {
  const b = rec(raw);
  const questions = parseQuestions(b.questions);
  return {
    ...briefing,
    trigger: str(b.trigger, briefing.trigger ?? "") || undefined,
    prep: str(b.prep, briefing.prep),
    questions: questions.length ? questions : briefing.questions,
  };
}

/** Links may only be added, forward, to scenes that exist. */
function addedLinks(
  scene: OneShotScene,
  raw: unknown,
  order: Map<string, number>,
): string[] {
  const here = order.get(scene.id) ?? -1;
  return [
    ...new Set(
      strs(raw).filter(
        (id) => (order.get(id) ?? -1) > here && !scene.next.includes(id),
      ),
    ),
  ];
}

function repairScene(
  scene: OneShotScene,
  raw: unknown,
  npcIds: Set<string>,
  order: Map<string, number>,
): OneShotScene {
  const r = rec(raw);
  const approaches = strs(r.approaches);
  const added = strs(r.addNpcIds).filter(
    (id) => npcIds.has(id) && !scene.npcIds.includes(id),
  );
  return {
    ...scene,
    situation: str(r.situation, scene.situation),
    approaches: approaches.length ? approaches : scene.approaches,
    npcIds: [...scene.npcIds, ...added],
    next: [...scene.next, ...addedLinks(scene, r.addNext, order)],
    challenge: parseChallenge(r.challenge, scene.challenge),
    whereabouts: parseWhereabouts(r.whereabouts) ?? scene.whereabouts,
    routes: parseRoutes(r.routes) ?? scene.routes,
  };
}

function repairNpc(npc: OneShotNpc, raw: unknown): OneShotNpc {
  const r = rec(raw);
  return {
    ...npc,
    motivation: str(r.motivation, npc.motivation),
    knows: str(r.knows, npc.knows),
    reaction: str(r.reaction, npc.reaction),
    cues: str(r.cues, npc.cues),
    ...npcDetail(r, npc),
  };
}

/** Existing NPCs are revised; a named NPC with a new id is added. */
function repairNpcs(npcs: OneShotNpc[], raw: unknown): OneShotNpc[] {
  const known = new Map(npcs.map((n) => [n.id, n]));
  const revised = npcs.map((n) => {
    const reply = list(raw).find((r) => str(rec(r).id) === n.id);
    return reply ? repairNpc(n, reply) : n;
  });
  const added = list(raw)
    .filter((r) => !known.has(str(rec(r).id)) && str(rec(r).name))
    .map((r, i) => parseNpc(r, npcs.length + i))
    .filter((n) => !known.has(n.id));
  return [...revised, ...added];
}

/** Clue routes can only be added, and only into scenes that exist. */
function repairClue(
  clue: OneShotClue,
  raw: unknown,
  sceneIds: Set<string>,
  theories: OneShotTheory[] | undefined,
): OneShotClue {
  const r = rec(raw);
  const added = list(r.addRoutes)
    .map((route) => ({
      sceneId: str(rec(route).sceneId),
      method: str(rec(route).method, "Investigate"),
    }))
    .filter(
      (route) =>
        sceneIds.has(route.sceneId) &&
        !clue.routes.some((existing) => existing.sceneId === route.sceneId),
    );
  return {
    ...clue,
    text: str(r.text, clue.text),
    routes: [...clue.routes, ...added],
    supports: parseVerdicts(r.supports, theories) ?? clue.supports,
    contradicts: parseVerdicts(r.contradicts, theories) ?? clue.contradicts,
  };
}

/** Endings keep their ids and titles; the review may sharpen how each is reached. */
function repairEndings(
  endings: OneShotAdventure["endings"],
  raw: unknown,
): OneShotAdventure["endings"] {
  const replies = byId(raw);
  return endings.map((e) => {
    const r = rec(replies.get(e.id));
    return {
      ...e,
      condition: str(r.condition, e.condition),
      consequence: str(r.consequence, e.consequence),
      requires: parseRequires(r.requires) ?? e.requires,
    };
  });
}

function byId(raw: unknown): Map<string, unknown> {
  return new Map(list(raw).map((item) => [str(rec(item).id), item]));
}

function withClueIds(scene: OneShotScene, clues: OneShotClue[]): OneShotScene {
  const added = clues
    .filter(
      (c) =>
        c.routes.some((r) => r.sceneId === scene.id) &&
        !scene.clueIds.includes(c.id),
    )
    .map((c) => c.id);
  return added.length
    ? { ...scene, clueIds: [...scene.clueIds, ...added] }
    : scene;
}

function mergeRepair(
  adventure: OneShotAdventure,
  data: Record<string, unknown>,
): OneShotAdventure {
  const sceneIds = new Set(adventure.scenes.map((s) => s.id));
  const order = new Map(adventure.scenes.map((s, i) => [s.id, i]));
  const inScenes = (id: string) => (sceneIds.has(id) ? id : undefined);
  const npcs = repairNpcs(adventure.npcs, data.npcs);
  const npcIds = new Set(npcs.map((n) => n.id));
  const scenes = byId(data.scenes);
  const clues = byId(data.clues);
  const theories = parseTheories(data.theories) ?? adventure.theories;
  const repairedClues = adventure.clues.map((c) =>
    clues.has(c.id) ? repairClue(c, clues.get(c.id), sceneIds, theories) : c,
  );
  const threads = parseThreads(data.threads, inScenes);
  const reviewedSetups = new Set(
    threads.map((thread) => thread.setup.trim().toLowerCase()),
  );
  const mergedThreads = threads.length
    ? [
        ...threads,
        ...(adventure.threads ?? []).filter(
          (thread) => !reviewedSetups.has(thread.setup.trim().toLowerCase()),
        ),
      ]
    : adventure.threads;
  const antagonistId = str(data.antagonistId);
  return {
    ...adventure,
    briefing: repairBriefing(adventure.briefing, data.briefing),
    antagonistId: npcIds.has(antagonistId)
      ? antagonistId
      : adventure.antagonistId,
    threads: mergedThreads,
    decisions: parseDecisions(data.decisions) ?? adventure.decisions,
    resources:
      parseResources(data.resources, (id) => !!inScenes(id)) ??
      adventure.resources,
    theories,
    solution: parseSolution(data.solution, inScenes) ?? adventure.solution,
    clock: parseClock(data.clock) ?? adventure.clock,
    endings: repairEndings(adventure.endings, data.endings),
    scenes: adventure.scenes.map((s) =>
      withClueIds(
        scenes.has(s.id) ? repairScene(s, scenes.get(s.id), npcIds, order) : s,
        repairedClues,
      ),
    ),
    npcs,
    clues: repairedClues,
  };
}

/** Whether a review reply is JSON an editor could act on, even if empty. */
export function isReadableRepair(text: string): boolean {
  try {
    const value: unknown = parseFencedJson(text);
    return value !== null && typeof value === "object" && !Array.isArray(value);
  } catch {
    return false;
  }
}

/**
 * Merge a review reply into the adventure. Returns the original when the
 * reply can't be read or would break the adventure's structure.
 */
export function applyOneShotRepair(
  adventure: OneShotAdventure,
  text: string,
): OneShotAdventure {
  let data: Record<string, unknown>;
  try {
    data = rec(parseFencedJson(text));
  } catch {
    return adventure;
  }
  if (!Object.keys(data).length) return adventure;
  const repaired = dedupeOneShot(normaliseState(mergeRepair(adventure, data)));
  const errors = (a: OneShotAdventure) =>
    validateOneShot(a).filter((i) => i.severity === "error").length;
  return errors(repaired) > errors(adventure) ? adventure : repaired;
}
