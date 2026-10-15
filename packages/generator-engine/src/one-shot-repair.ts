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
import { validateOneShot } from "./one-shot-validate";
import type {
  OneShotAdventure,
  OneShotClue,
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
3. Clock: one rule advances it. If the fiction counts something (bell notes, nights, seals), that count IS the ticks and the numbers match. The stakes become irreversible only at the last tick ("deadline"). The clock agrees with the stakes and the finale.
4. Emphasis (${adventure.emphasis}): the scenes deliver it. Action means real opposition: enemies with tactics, battlefield hazards and conditions that change mid-scene, in "opposition".
5. Intent over passwords: no challenge or finale step may require reciting exact words. Clever reasoning, or clearly expressing the right intent, succeeds.
6. Compression: state each fact once, where the GM needs it. Rewrite scene situations as tight adventure prose. Do not repeat clue text, solutions or answers across scenes.

Rules:
- Keep the premise, title, scene ids, titles, minutes, essential flags, links, NPC names and roles unchanged.
- State facts outright: real names, words, objects and their order.
- Vital facts must be found in an essential scene before the finale.
- Only include the parts you change. Return {} if nothing needs changing.

Return only JSON shaped like:
{
  "antagonistId": "npc-2",
  "briefing": { "trigger": "", "questions": [{ "question": "", "answer": "" }] },
  "threads": [{ "setup": "", "payoff": "", "sceneIds": ["scene-3"] }],
  "solution": { "summary": "", "requirements": [{ "what": "", "detail": "", "sceneIds": ["scene-2"] }], "steps": [""], "alternatives": [""], "mistakes": [""] },
  "clock": { "name": "", "advances": "", "ticks": [{ "trigger": "", "effect": "" }], "slow": "", "deadline": "" },
  "scenes": [{ "id": "scene-2", "situation": "", "approaches": [""], "addNpcIds": ["npc-4"], "challenge": { "type": "combat", "description": "", "success": "", "otherApproaches": [""], "opposition": "", "failForward": "" } }],
  "npcs": [{ "id": "npc-1", "name": "only for a new NPC", "role": "only for a new NPC", "motivation": "", "knows": "", "reaction": "", "cues": "", "backstory": "", "tactics": "", "stopIf": "", "limits": "" }],
  "clues": [{ "id": "clue-1", "text": "", "addRoutes": [{ "sceneId": "scene-2", "method": "" }] }]
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
    questions: questions.length ? questions : briefing.questions,
  };
}

function repairScene(
  scene: OneShotScene,
  raw: unknown,
  npcIds: Set<string>,
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
    challenge: parseChallenge(r.challenge, scene.challenge),
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
  };
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
  const inScenes = (id: string) => (sceneIds.has(id) ? id : undefined);
  const npcs = repairNpcs(adventure.npcs, data.npcs);
  const npcIds = new Set(npcs.map((n) => n.id));
  const scenes = byId(data.scenes);
  const clues = byId(data.clues);
  const repairedClues = adventure.clues.map((c) =>
    clues.has(c.id) ? repairClue(c, clues.get(c.id), sceneIds) : c,
  );
  const threads = parseThreads(data.threads, inScenes);
  const antagonistId = str(data.antagonistId);
  return {
    ...adventure,
    briefing: repairBriefing(adventure.briefing, data.briefing),
    antagonistId: npcIds.has(antagonistId)
      ? antagonistId
      : adventure.antagonistId,
    threads: threads.length ? threads : adventure.threads,
    solution: parseSolution(data.solution, inScenes) ?? adventure.solution,
    clock: parseClock(data.clock) ?? adventure.clock,
    scenes: adventure.scenes.map((s) =>
      withClueIds(
        scenes.has(s.id) ? repairScene(s, scenes.get(s.id), npcIds) : s,
        repairedClues,
      ),
    ),
    npcs,
    clues: repairedClues,
  };
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
  const repaired = mergeRepair(adventure, data);
  const errors = (a: OneShotAdventure) =>
    validateOneShot(a).filter((i) => i.severity === "error").length;
  return errors(repaired) > errors(adventure) ? adventure : repaired;
}
