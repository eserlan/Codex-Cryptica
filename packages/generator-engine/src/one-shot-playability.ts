/**
 * GM playability review for the One-Shot Adventure Builder. Structural
 * validation (one-shot-validate.ts) checks that the adventure holds together;
 * this checks that a GM could run it from the page without inventing a
 * critical fact, solution or motivation. Each gap names the part to repair.
 */

import type {
  OneShotAdventure,
  OneShotGap,
  OneShotScene,
} from "./one-shot-types";

type GapCheck = (adventure: OneShotAdventure) => OneShotGap[];

/**
 * "The correct passages", "the true name" and similar point at a fact
 * without stating it. Text that quotes or lists the fact after a colon is
 * taken as stated.
 */
const VAGUE =
  /\bthe (?:(?:correct|right|proper|true|secret|missing|hidden|stolen|sacred|royal|old|two|three|four|five)\s+){1,3}(?:names?|words?|passages?|answers?|order|sequence|phrase|verses?|symbols?|runes?)\b/i;

const CONCRETE_VALUE_AFTER_COLON =
  /^\s*:\s*(?:"[^"\n]+"|'[^'\n]+'|`[^`\n]+`|[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*(?:\s*,\s*[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*)*\s+(?:and|or)\s+[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*(?:[.!?]|$))/;

export function isVague(text: string | undefined): boolean {
  if (!text?.trim()) return true;
  const match = VAGUE.exec(text);
  if (!match) return false;
  const followingText = text.slice(match.index + match[0].length);
  return !CONCRETE_VALUE_AFTER_COLON.test(followingText);
}

const checkBriefing: GapCheck = ({ briefing }) => [
  ...(briefing.trigger?.trim()
    ? []
    : [
        {
          area: "briefing" as const,
          message:
            "Say what set this off now. Players will ask why it is happening today.",
        },
      ]),
  ...((briefing.questions?.filter((q) => q.answer.trim()).length ?? 0) < 3
    ? [
        {
          area: "briefing" as const,
          message:
            "Answer the questions players will obviously ask, such as why now, why us and why the patron doesn't handle it.",
        },
      ]
    : []),
];

const earlySceneIds = (adventure: OneShotAdventure) =>
  new Set(
    adventure.scenes
      .filter((s) => s.essential && s.kind !== "climax")
      .map((s) => s.id),
  );

const checkSolution: GapCheck = (adventure) => {
  const { solution } = adventure;
  if (!solution?.requirements.length || !solution.steps.length) {
    return [
      {
        area: "solution",
        message:
          "Spell out how the finale is resolved: what it needs, where each part is found and the steps the party takes.",
      },
    ];
  }
  const early = earlySceneIds(adventure);
  return [
    ...solution.requirements.flatMap((r) => [
      ...(isVague(r.detail)
        ? [
            {
              area: "solution" as const,
              message: `"${r.what}" is mentioned but never given. State the actual names, words or objects.`,
            },
          ]
        : []),
      ...(r.sceneIds.some((id) => early.has(id))
        ? []
        : [
            {
              area: "solution" as const,
              message: `"${r.what}" can't be found before the finale.`,
            },
          ]),
    ]),
    ...(solution.alternatives.length
      ? []
      : [
          {
            area: "solution" as const,
            message: "Give at least one other way to resolve the finale.",
          },
        ]),
    ...(solution.mistakes.length
      ? []
      : [
          {
            area: "solution" as const,
            message:
              "Say what happens when the party gets part of the solution wrong.",
          },
        ]),
  ];
};

const checkClock: GapCheck = ({ clock }) =>
  clock && clock.ticks.length >= 3 && clock.advances.trim() && clock.slow.trim()
    ? []
    : [
        {
          area: "clock",
          message:
            "Give the threat a countdown: what advances it, what each step does and how the party can slow it.",
        },
      ];

function sceneGaps(scene: OneShotScene): OneShotGap[] {
  if (!scene.essential) return [];
  const gap = (message: string): OneShotGap => ({
    area: "scene",
    id: scene.id,
    message: `"${scene.title}": ${message}`,
  });
  return [
    ...(isVague(scene.challenge.success)
      ? [gap("say what the party must actually do or say to succeed.")]
      : []),
    ...(scene.challenge.otherApproaches?.length
      ? []
      : [gap("say how force, lies, magic or an unexpected plan play out.")]),
  ];
}

const checkScenes: GapCheck = (adventure) =>
  adventure.scenes.flatMap(sceneGaps);

/** Vital facts must surface in a scene that cannot be skipped, before the finale. */
const checkClueTiming: GapCheck = (adventure) => {
  const essentialEarly = new Set(
    adventure.scenes
      .filter((s) => s.essential && s.kind !== "climax")
      .map((s) => s.id),
  );
  return adventure.clues
    .filter(
      (c) =>
        c.essential && !c.routes.some((r) => essentialEarly.has(r.sceneId)),
    )
    .map((c) => ({
      area: "clue" as const,
      id: c.id,
      message: `"${c.label ?? c.text}" is only found in optional scenes or the finale. Players who skip ahead learn it as they must act on it.`,
    }));
};

/** An NPC set up in the opening who never returns is a dropped thread. */
const checkDroppedNpcs: GapCheck = (adventure) => {
  const later = adventure.scenes.filter((s) => s.kind !== "opening");
  const elsewhere = JSON.stringify([
    adventure.endings,
    adventure.solution ?? null,
    adventure.clues,
  ]);
  return adventure.npcs
    .filter(
      (n) =>
        adventure.scenes[0]?.npcIds.includes(n.id) &&
        !later.some((s) => s.npcIds.includes(n.id)) &&
        !elsewhere.includes(n.name),
    )
    .map((n) => ({
      area: "npc" as const,
      id: n.id,
      message: `${n.name} is introduced in the opening and then disappears. Give them a later scene or a payoff.`,
    }));
};

/** Everything a GM would otherwise have to invent at the table. */
export function checkPlayability(adventure: OneShotAdventure): OneShotGap[] {
  return [
    checkBriefing,
    checkSolution,
    checkClock,
    checkScenes,
    checkClueTiming,
    checkDroppedNpcs,
  ].flatMap((check) => check(adventure));
}
