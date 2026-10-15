/**
 * Cross-scene checks for the One-Shot Adventure Builder. Scene-level
 * completeness can hide global problems: an antagonist with no profile, a
 * hook that is never paid off, a clock that contradicts the stakes, or an
 * "Action" one-shot without fights. These checks look at the adventure as a
 * whole.
 */

import type {
  OneShotAdventure,
  OneShotChallenge,
  OneShotGap,
  OneShotNpc,
} from "./one-shot-types";

type GapCheck = (adventure: OneShotAdventure) => OneShotGap[];

export function antagonistOf(
  adventure: OneShotAdventure,
): OneShotNpc | undefined {
  return adventure.npcs.find((n) => n.id === adventure.antagonistId);
}

const checkAntagonist: GapCheck = (adventure) => {
  const villain = antagonistOf(adventure);
  if (!villain) {
    return [
      {
        area: "npc",
        message:
          "The antagonist has no NPC profile. Add them with why they are doing this, how they act when opposed and what would make them stop.",
      },
    ];
  }
  const gap = (message: string): OneShotGap => ({
    area: "npc",
    id: villain.id,
    message: `${villain.name}: ${message}`,
  });
  const climax = adventure.scenes.at(-1);
  return [
    ...(villain.backstory?.trim() ? [] : [gap("say why they are doing this.")]),
    ...(villain.tactics?.trim()
      ? []
      : [gap("say how they act or fight when opposed.")]),
    ...(villain.stopIf?.trim()
      ? []
      : [gap("say what would persuade them to stop.")]),
    ...(climax && !climax.npcIds.includes(villain.id)
      ? [gap("they drive the threat but are not in the finale.")]
      : []),
  ];
};

const checkThreads: GapCheck = (adventure) => {
  const threads = adventure.threads ?? [];
  if (!threads.length) {
    return [
      {
        area: "briefing",
        message:
          "List the promises the hook and opening make (people in danger, rules, histories) and where each pays off.",
      },
    ];
  }
  const later = new Set(
    adventure.scenes.filter((s) => s.kind !== "opening").map((s) => s.id),
  );
  return threads
    .filter((t) => !t.payoff.trim() || !t.sceneIds.some((id) => later.has(id)))
    .map((t) => ({
      area: "briefing" as const,
      message: `"${t.setup}" is set up but never paid off in a later scene.`,
    }));
};

const NUMBER_WORDS: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  thirteen: 13,
};
const COUNTED =
  /\b(two|three|four|five|six|seven|eight|nine|ten|twelve|thirteen|\d{1,2})\s+(?:[a-z]+\s+)?(notes|tolls|strikes|chimes|rings|bells|hours|nights|days|stages|seals|steps|signs|candles|chants|marks)\b/gi;

/**
 * "Three bell notes" in the stakes and a five-step clock contradict each
 * other. Only counts whose unit also names the clock are compared.
 */
function countMismatch(adventure: OneShotAdventure): string | undefined {
  const { clock, briefing } = adventure;
  if (!clock) return undefined;
  const clockWords = `${clock.name} ${clock.advances} ${clock.deadline ?? ""}`;
  const text = [
    briefing.premise,
    briefing.hook,
    briefing.stakes,
    briefing.trigger ?? "",
    clockWords,
  ].join(" ");
  for (const m of text.matchAll(COUNTED)) {
    const n = NUMBER_WORDS[m[1].toLowerCase()] ?? Number(m[1]);
    const unit = m[2].toLowerCase().replace(/s$/, "");
    if (n !== clock.ticks.length && clockWords.toLowerCase().includes(unit)) {
      return `The adventure speaks of ${m[0]}, but the clock has ${clock.ticks.length} steps. Make the count match, or separate the in-world count from the escalation steps.`;
    }
  }
  return undefined;
}

const checkClockConsistency: GapCheck = (adventure) => {
  const { clock } = adventure;
  if (!clock) return [];
  const mismatch = countMismatch(adventure);
  return [
    ...(clock.deadline?.trim()
      ? []
      : [
          {
            area: "clock" as const,
            message:
              "Say what happens when the clock runs out. That should be the only point of no return.",
          },
        ]),
    ...(mismatch ? [{ area: "clock" as const, message: mismatch }] : []),
  ];
};

/** The challenge types that deliver each emphasis. */
const EMPHASIS_TYPES: Record<string, OneShotChallenge["type"][]> = {
  Action: ["combat", "hazard"],
  "Investigation / mystery": ["puzzle", "social", "exploration"],
  Intrigue: ["social"],
  Survival: ["hazard", "exploration", "combat"],
  Exploration: ["exploration", "hazard", "puzzle"],
};

const checkEmphasis: GapCheck = (adventure) => {
  const wanted = EMPHASIS_TYPES[adventure.emphasis];
  if (!wanted) return [];
  const scenes = adventure.scenes.filter((s) => s.kind !== "opening");
  const matching = scenes.filter((s) => wanted.includes(s.challenge.type));
  if (matching.length * 2 >= scenes.length) return [];
  return [
    {
      area: "scene",
      message: `This is a${/^[AEIOU]/.test(adventure.emphasis) ? "n" : ""} ${adventure.emphasis} one-shot, but only ${matching.length} of ${scenes.length} scenes after the opening are ${wanted.join(" or ")} challenges. Rework scenes to deliver it.`,
    },
  ];
};

/** Fights and hazards need opposition the GM can run, not just a description. */
const checkOpposition: GapCheck = (adventure) =>
  adventure.scenes
    .filter(
      (s) =>
        (s.challenge.type === "combat" || s.challenge.type === "hazard") &&
        !s.challenge.opposition?.trim(),
    )
    .map((s) => ({
      area: "scene" as const,
      id: s.id,
      message: `"${s.title}": say who or what opposes the party, how they fight and what changes mid-scene.`,
    }));

export const INTEGRITY_CHECKS: GapCheck[] = [
  checkAntagonist,
  checkThreads,
  checkClockConsistency,
  checkEmphasis,
  checkOpposition,
];
