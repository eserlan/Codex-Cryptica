/**
 * Prompts for staged one-shot generation. Each stage is given what earlier
 * stages decided and asked only for its own part, so each call is short and
 * every later part is written knowing the earlier ones: the premise and
 * antagonist first, then the scene plan, the finale, each scene, and the
 * supporting cast.
 */

import { bufferFor } from "./one-shot-validate";
import type { ResolvedOneShot } from "./one-shot-types";
import {
  CLOCK_RULE,
  COMMITMENT_RULE,
  EMPHASIS_HINT,
  ENDINGS_RULE,
  PACING_RULE,
} from "./one-shot-rules";
import { describeOneShotOptions, sceneCountFor } from "./public-one-shot";

export interface StagePrompt {
  systemInstruction: string;
  userMessage: string;
}

const SYSTEM =
  "You are an experienced game master writing one part of a playable, system-neutral one-shot adventure. Reply with JSON only.";

const JSON_ONLY =
  "Return only the JSON object. Do not include markdown code block formatting like ```json.";

const STYLE = `Style:
- Write like an adventure, not a checklist. State facts outright: real names, words, objects and their order.
- State each fact once, where the GM needs it.
- Never require players to recite exact words; clever reasoning or clearly expressing the right intent succeeds.`;

const prompt = (userMessage: string): StagePrompt => ({
  systemInstruction: SYSTEM,
  userMessage,
});

/** Stage 1: the premise, the antagonist and the patron. */
export function corePrompt(
  resolved: ResolvedOneShot,
  sessionContext = "",
): StagePrompt {
  return prompt(`Plan the core of a single-session RPG one-shot.
${describeOneShotOptions(resolved)}

Decide the premise, the hidden truth, what set it off now, the stakes, the antagonist driving the threat and the patron who brings the party in. Answer 3–5 questions players will obviously ask (why now, why us, why doesn't the patron handle it, why would the antagonist do this).
${STYLE}

Return JSON shaped like:
{
  "title": "",
  "briefing": { "premise": "", "hook": "", "objective": "", "secret": "", "trigger": "", "stakes": "", "prep": "", "questions": [{ "question": "", "answer": "" }] },
  "antagonist": { "name": "", "role": "", "motivation": "", "knows": "", "reaction": "", "cues": "", "backstory": "why they do this", "tactics": "how they act or fight when opposed", "stopIf": "what would persuade them to stop", "limits": "what they cannot or will not do" },
  "patron": { "name": "", "role": "", "motivation": "", "knows": "", "reaction": "", "cues": "" }
}
${sessionContext}
${JSON_ONLY}`);
}

/** Stage 2: the scene plan, clues, clock, threads and supporting cast. */
export function structurePrompt(
  resolved: ResolvedOneShot,
  core: unknown,
): StagePrompt {
  const count = sceneCountFor(resolved.structure, resolved.durationMinutes);
  const buffer = bufferFor(resolved.durationMinutes);
  return prompt(`Plan the scenes of this one-shot. The core is decided:
${JSON.stringify(core)}
${describeOneShotOptions(resolved)}

Rules:
- Exactly ${count} scenes, ids "scene-1".."scene-${count}". The first has kind "opening", the last "climax", the rest "middle". "next" lists the scene ids each leads to.
- Scene "minutes" are multiples of 5 and, with a ${buffer}-minute buffer, add up to ${resolved.durationMinutes}. The climax gets the largest share. Optional scenes take at most a fifth of the time.
- The patron is "npc-1" and the antagonist "npc-2"; add 1–3 supporting NPCs as "npc-3" onwards (name and role only). The antagonist appears in the climax. NPCs met in the opening return or pay off later.
- Exactly 3 vital clues, each with a short "label" and the actual fact as "text", discoverable in at least two scenes, one of them an essential scene before the climax.
- "clock": ${CLOCK_RULE}
- "threads": every promise the hook and briefing make, with its payoff and the later scene where it happens.
- Plan for the emphasis (${resolved.emphasis}) as play, not just theme: ${EMPHASIS_HINT[resolved.emphasis] ?? "match the scenes to it"}.
- ${COMMITMENT_RULE}
- ${PACING_RULE}

Return JSON shaped like:
{
  "scenes": [{ "id": "scene-1", "title": "", "kind": "opening", "essential": true, "minutes": 30, "purpose": "", "location": "", "npcIds": ["npc-1"], "challengeType": "social", "next": ["scene-2"] }],
  "npcs": [{ "id": "npc-3", "name": "", "role": "" }],
  "clues": [{ "id": "clue-1", "label": "", "text": "", "essential": true, "routes": [{ "sceneId": "scene-1", "method": "" }, { "sceneId": "scene-2", "method": "" }] }],
  "clock": { "name": "", "advances": "", "ticks": [{ "trigger": "", "effect": "" }], "slow": "", "deadline": "" },
  "threads": [{ "setup": "", "payoff": "", "sceneIds": ["scene-3"] }],
  "runningLate": ["steps to finish on time, most painless first"]
}
${JSON_ONLY}`);
}

/** Stage 3: how the finale resolves, and the endings. */
export function finalePrompt(core: unknown, structure: unknown): StagePrompt {
  return prompt(`Work out how this one-shot's finale is resolved.
Core: ${JSON.stringify(core)}
Plan: ${JSON.stringify(structure)}

The solution names everything the finale needs with its real content and the earlier essential scenes where each is found, the steps the party takes, at least one other way through, and what each kind of mistake costs.
${ENDINGS_RULE}
${STYLE}

Return JSON shaped like:
{
  "solution": { "summary": "", "requirements": [{ "what": "", "detail": "", "sceneIds": ["scene-2"] }], "steps": [""], "alternatives": [""], "mistakes": [""] },
  "endings": [{ "id": "end-1", "title": "", "condition": "", "consequence": "" }],
  "epilogueHook": ""
}
${JSON_ONLY}`);
}

export interface SceneBrief {
  scene: Record<string, unknown>;
  clues: unknown[];
  threads: unknown[];
  npcs: unknown[];
  isOpening: boolean;
}

/** Stage 4: one scene, written against everything already decided. */
export function scenePrompt(
  resolved: ResolvedOneShot,
  context: { core: unknown; structure: unknown; finale: unknown },
  brief: SceneBrief,
): StagePrompt {
  const opening = brief.isOpening
    ? `,
  "opening": { "readAloud": "", "firstDecision": "", "involvement": ["ways the characters get involved"] }`
    : "";
  return prompt(`Write one scene of this one-shot.
Core: ${JSON.stringify(context.core)}
Plan: ${JSON.stringify(context.structure)}
Finale: ${JSON.stringify(context.finale)}

The scene to write: ${JSON.stringify(brief.scene)}
Clues it must offer (with how they are found): ${JSON.stringify(brief.clues)}
Threads it carries: ${JSON.stringify(brief.threads)}
NPCs present: ${JSON.stringify(brief.npcs)}

Rules:
- Keep its title, location, NPCs and place in the plan. If an NPC appears in several scenes, say why they are here; respect every NPC's limits.
- The challenge says what the party must actually achieve ("success"), how force, lies, magic or an unexpected plan play out ("otherApproaches") and what happens on failure ("failForward"; failure never stops the adventure).
- Fights and hazards get "opposition": who or what opposes the party, how they fight and one thing that changes mid-scene.
- Deliver the emphasis (${resolved.emphasis}): ${EMPHASIS_HINT[resolved.emphasis] ?? "match the challenge to it"}. Only an optional scene gets "skip".
- If "next" lists more than one scene, the situation describes each route out: what it risks and what it finds.
${STYLE}

Return JSON shaped like:
{
  "situation": "",
  "approaches": [""],
  "challenge": { "type": "social", "description": "", "success": "", "otherApproaches": [""], "opposition": "", "failForward": "" },
  "outcomes": [""],
  "shorten": "how to run it in half the time",
  "skip": ""${opening}
}
${JSON_ONLY}`);
}

/** Stage 5: profiles for the supporting cast. */
export function npcsPrompt(
  context: { core: unknown; structure: unknown },
  npcs: unknown[],
): StagePrompt {
  return prompt(`Give the supporting NPCs of this one-shot playable profiles.
Core: ${JSON.stringify(context.core)}
Plan: ${JSON.stringify(context.structure)}
NPCs: ${JSON.stringify(npcs)}

Motivations must explain what each NPC does in their scenes. No biographies.

Return JSON shaped like:
{ "npcs": [{ "id": "npc-3", "motivation": "", "knows": "", "reaction": "", "cues": "a roleplay cue", "limits": "" }] }
${JSON_ONLY}`);
}
