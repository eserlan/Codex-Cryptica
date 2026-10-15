/**
 * Entity-state continuity for the One-Shot Adventure Builder. A model writes
 * each scene against the plan, so it can put the same NPC by the stove in the
 * opening and under a cart in the next scene. This follows each named NPC
 * through the scenes in order and flags one who is present and free in one
 * scene but trapped, missing or captive in a later one, when the later scene
 * never says how that happened.
 */

import type {
  OneShotAdventure,
  OneShotGap,
  OneShotNpc,
  OneShotScene,
} from "./one-shot-types";

const TITLES = new Set(
  "the old young lady lord sir dame captain sister brother mother father master mistress doctor reeve elder king queen prince princess saint widow".split(
    " ",
  ),
);

/** Words in a name a scene would use on their own: "Tovin", "Ysabet". */
function nameWords(name: string): string[] {
  return name
    .split(/[\s,]+/)
    .map((w) => w.replace(/[^\p{L}'-]/gu, ""))
    .filter((w) => /^\p{Lu}/u.test(w) && w.length >= 3)
    .filter((w) => !TITLES.has(w.toLowerCase()));
}

const STATE =
  "(trapped|pinned|captive|captured|imprisoned|held (?:prisoner|captive)|missing|abducted|kidnapped|chained|shackled|caged|buried alive|lost)";

/**
 * The state has to belong to the NPC: "Tovin lies pinned", "Tovin, half
 * frozen, is still trapped", "pinned beneath the cart is Tovin". "Tovin says
 * the drivers are missing" does not count.
 */
function statePatterns(words: string[]): RegExp[] {
  const name = `\\b(?:${words.join("|")})\\b`;
  return [
    new RegExp(
      `${name}(?:,[^,.]{0,80},)?\\s+(?:is|lies|remains|was|has been|sits|hangs|stands|struggles|waits|cowers)\\s+(?:still\\s+|now\\s+|being\\s+)?(?:\\w+\\s+)?${STATE}\\b`,
      "i",
    ),
    new RegExp(`\\b${STATE}\\s+(?:\\w+\\s+){0,4}?${name}`, "i"),
  ];
}
/** The scene says how they came to be there. */
const EXPLAINED =
  /\b(?:was|were|has been|had been|got|gets|is|are) (?:taken|dragged|carried|snatched|seized|abducted|captured|lured|caught|ambushed|kidnapped)\b|\b(?:since|after|when) (?:the party|they|he|she) (?:left|parted)|\b(?:went|ran|slipped|wandered|crept) (?:back|off|away|out)\b|\bfollowed (?:the party|them)\b/i;
const CONDITIONAL = /\b(?:if|unless|should)\b/i;

const sentences = (text: string) =>
  text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());

function sceneText(scene: OneShotScene): string {
  return [
    scene.situation,
    scene.challenge.description,
    scene.challenge.success ?? "",
    ...scene.outcomes,
  ].join(" ");
}

/** The confinement this scene states outright for the NPC, if any. */
function confinement(
  scene: OneShotScene,
  words: string[],
): { state: string; explained: boolean } | undefined {
  const patterns = statePatterns(words);
  const text = sceneText(scene);
  for (const sentence of sentences(text)) {
    if (CONDITIONAL.test(sentence)) continue;
    for (const pattern of patterns) {
      const state = pattern.exec(sentence)?.[1];
      if (state) {
        const npcName = new RegExp(`\\b(?:${words.join("|")})\\b`, "i");
        const explained = sentence
          .split(/[,;:]|\b(?:while|whereas)\b/i)
          .some((clause) => npcName.test(clause) && EXPLAINED.test(clause));
        return { state, explained };
      }
    }
  }
  return undefined;
}

/** The first unexplained jump from free to confined, following the scenes in order. */
function npcGap(
  adventure: OneShotAdventure,
  npc: OneShotNpc,
): OneShotGap | undefined {
  const words = nameWords(npc.name);
  if (!words.length) return undefined;
  let freeIn: OneShotScene | undefined;
  for (const scene of adventure.scenes) {
    const confined = confinement(scene, words);
    if (!confined) {
      if (scene.npcIds.includes(npc.id)) freeIn = scene;
    } else if (freeIn && !confined.explained) {
      return {
        area: "npc",
        id: npc.id,
        message: `${npc.name} is present and free in "${freeIn.title}" but ${confined.state.toLowerCase()} in "${scene.title}". Say in that scene how it happened, or make them two different people.`,
      };
    } else {
      freeIn = undefined;
    }
  }
  return undefined;
}

export function checkNpcContinuity(adventure: OneShotAdventure): OneShotGap[] {
  return adventure.npcs
    .map((npc) => npcGap(adventure, npc))
    .filter((gap): gap is OneShotGap => !!gap);
}
