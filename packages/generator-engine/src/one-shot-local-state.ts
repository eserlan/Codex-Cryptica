/**
 * The structured state of a locally built one-shot: where people and the
 * object are, what each route out of a scene risks and finds, which decisions
 * decide the ending and which theories the clues back. Built from the same
 * names the prose uses, so the data and the text never disagree.
 */

import type {
  OneShotClue,
  OneShotDecision,
  OneShotScene,
  OneShotTheory,
  OneShotWhereabout,
} from "./one-shot-types";

interface Names {
  villain: string;
  item: string;
}

/** Each way onward says what it risks and what it finds. */
export function addRoutes(scenes: OneShotScene[], names: Names): void {
  for (const scene of scenes) {
    if (scene.next.length < 2) continue;
    scene.routes = scene.next.map((to, i) => {
      const target = scenes.find((s) => s.id === to)!;
      return i === 0
        ? {
            to,
            risk: `The direct way keeps to the main paths, where ${names.villain}'s watchers are most likely to see the party.`,
            find: `Reaches ${target.location} with the trail still warm.`,
          }
        : {
            to,
            risk: `The detour takes the party off the trail while ${names.villain}'s plan keeps moving.`,
            find: `Something useful at ${target.location}: a shortcut, an ally or a clue the main road lacks.`,
          };
    });
  }
}

const present = (
  scene: OneShotScene,
  who: string,
  state: OneShotWhereabout["state"],
): OneShotWhereabout[] =>
  scene.npcIds.includes(who)
    ? [{ who, kind: "npc", state, where: scene.location }]
    : [];

/** The patron and witness stay free, the villain hides and then fights, the item is carried to the finale. */
export function addWhereabouts(scenes: OneShotScene[], names: Names): void {
  const first = scenes[0];
  const last = scenes[scenes.length - 1];
  for (const scene of scenes) {
    const villain = scene === last ? "hostile" : "hiding";
    scene.whereabouts = [
      ...present(scene, "npc-1", "free"),
      ...present(scene, "npc-2", villain),
      ...present(scene, "npc-3", "free"),
    ];
  }
  first.whereabouts!.push({
    who: names.item,
    kind: "object",
    state: "here",
    where: first.location,
  });
  last.whereabouts!.push({
    who: names.item,
    kind: "object",
    state: "here",
    where: last.location,
    how: `${names.villain}'s people carry it there.`,
  });
}

export const localDecisions = (villain: string): OneShotDecision[] => [
  {
    id: "stopped",
    question: `Does the party stop ${villain} before the clock runs out?`,
  },
  {
    id: "clean",
    question: `Does the party keep the key evidence and refuse ${villain}'s offers?`,
  },
];

/** The obvious explanation is wrong; three clues back the true one. */
export function mysteryTheories(
  clues: OneShotClue[],
  names: Names,
): OneShotTheory[] {
  const theories: OneShotTheory[] = [
    {
      id: "theory-1",
      name: "A simple misfortune",
      summary: `${names.item} was lost by accident and nobody is to blame.`,
      isTrue: false,
      obvious: true,
    },
    {
      id: "theory-2",
      name: `${names.villain}'s plan`,
      summary: `${names.villain} took ${names.item} on purpose and is not finished.`,
      isTrue: true,
    },
  ];
  clues.forEach((clue, i) => {
    clue.supports = ["theory-2"];
    if (i < 2) clue.contradicts = ["theory-1"];
  });
  return theories;
}
