/**
 * Targeted repair for the One-Shot Adventure Builder. After the playability
 * review finds gaps, the model is asked to walk through running the adventure
 * and fill only what is missing. The reply is merged field by field: ids,
 * times, essential flags, links, names and titles stay locked, and a repair
 * that breaks the structure is thrown away.
 */

import { parseFencedJson } from "./llm-response-utils";
import {
  parseChallenge,
  parseClock,
  parseQuestions,
  parseSolution,
  rec,
  str,
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
  return {
    systemInstruction:
      "You are an experienced game master checking that a one-shot adventure can be run straight from the page, then filling what is missing.",
    userMessage: `Here is a one-shot adventure as JSON:
${JSON.stringify(adventure)}

Walk through running it scene by scene as the GM. At every decision, ask what you would need to know to adjudicate it, and whether the adventure says so. Fix these gaps, and any other missing fact, solution or motivation you find:
${gaps.map((g) => `- ${g.message}`).join("\n")}

Rules:
- Keep the premise, title, scene ids, titles, minutes, essential flags, links, NPC names and roles unchanged.
- State facts outright: real names, words, passages, objects and their order. Never write "the correct passages" or "the true name" without giving them.
- Vital facts must be found in an essential scene before the finale. Optional scenes add depth or an advantage, never the only early source.
- If an NPC appears in several scenes, say in that scene's situation why they are there.
- Only include the parts you change.

Return only JSON shaped like:
{
  "briefing": { "trigger": "", "questions": [{ "question": "", "answer": "" }] },
  "solution": { "summary": "", "requirements": [{ "what": "", "detail": "", "sceneIds": ["scene-2"] }], "steps": [""], "alternatives": [""], "mistakes": [""] },
  "clock": { "name": "", "advances": "", "ticks": [{ "trigger": "", "effect": "" }], "slow": "" },
  "scenes": [{ "id": "scene-2", "situation": "", "challenge": { "description": "", "success": "", "otherApproaches": [""], "failForward": "" } }],
  "npcs": [{ "id": "npc-1", "motivation": "", "knows": "", "reaction": "" }],
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

function repairScene(scene: OneShotScene, raw: unknown): OneShotScene {
  const r = rec(raw);
  return {
    ...scene,
    situation: str(r.situation, scene.situation),
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
  };
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

/**
 * Merge a repair reply into the adventure. Returns the original when the
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
  const sceneIds = new Set(adventure.scenes.map((s) => s.id));
  const scenes = byId(data.scenes);
  const npcs = byId(data.npcs);
  const clues = byId(data.clues);
  const repairedClues = adventure.clues.map((c) =>
    clues.has(c.id) ? repairClue(c, clues.get(c.id), sceneIds) : c,
  );
  const repaired: OneShotAdventure = {
    ...adventure,
    briefing: repairBriefing(adventure.briefing, data.briefing),
    solution:
      parseSolution(data.solution, (id) =>
        sceneIds.has(id) ? id : undefined,
      ) ?? adventure.solution,
    clock: parseClock(data.clock) ?? adventure.clock,
    scenes: adventure.scenes.map((s) => {
      const scene = scenes.has(s.id) ? repairScene(s, scenes.get(s.id)) : s;
      const added = repairedClues
        .filter(
          (c) =>
            c.routes.some((r) => r.sceneId === s.id) &&
            !scene.clueIds.includes(c.id),
        )
        .map((c) => c.id);
      return added.length
        ? { ...scene, clueIds: [...scene.clueIds, ...added] }
        : scene;
    }),
    npcs: adventure.npcs.map((n) =>
      npcs.has(n.id) ? repairNpc(n, npcs.get(n.id)) : n,
    ),
    clues: repairedClues,
  };
  const errors = (a: OneShotAdventure) =>
    validateOneShot(a).filter((i) => i.severity === "error").length;
  return errors(repaired) > errors(adventure) ? adventure : repaired;
}
