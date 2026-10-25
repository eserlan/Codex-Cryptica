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

import { simulateClock } from "./one-shot-clock";
import { checkNpcContinuity } from "./one-shot-continuity";
import { textOverlap } from "./one-shot-dedupe";
import { checkResources } from "./one-shot-resources";
import { checkClockCount, checkEnvironment } from "./one-shot-mechanics";
import {
  checkEndingCoverage,
  checkMystery,
  checkRouteTradeoffs,
  checkThreadSubjects,
  checkWhereabouts,
} from "./one-shot-state-checks";

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
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};
const COUNTED =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|\d{1,2})\s+(?:[a-z]+\s+)?(notes|tolls|strikes|chimes|rings|bells|hours|nights|days|stages|seals|steps|signs|candles|chants|marks)\b/gi;

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

/**
 * A clock that only moves when the party takes risks lets cautious players
 * explore forever. It needs something that advances it on a schedule.
 */
const SCHEDULED =
  /\b(each|every|end of|after|at|by)\b[^.;]*?\b(scenes?|hours?|nights?|days?|dawns?|dusks?|sunsets?|sunrises?|nightfall|midnight|noon|watch(es)?|milestones?|acts?|tides?|rounds?|turns?|bells?|chimes?|moons?)\b/i;

/**
 * A counted schedule must leave the finale playable: a cautious party reaches
 * it and can finish it with a tick to spare. Leaving more than two ticks
 * unused means the pressure never builds.
 */
function scheduleGaps(adventure: OneShotAdventure): OneShotGap[] | undefined {
  const ticks = adventure.clock!.ticks.length;
  const schedule = simulateClock(adventure);
  if (!schedule) return undefined;
  const total = schedule.beforeFinale + schedule.inFinale;
  const route = schedule.steps.join(", ");
  const times = `${total} time${total === 1 ? "" : "s"}`;
  if (total >= ticks) {
    const when =
      schedule.beforeFinale >= ticks
        ? "before the finale even starts"
        : "before the party can finish the finale";
    return [
      {
        area: "clock",
        message: `On a cautious route the clock reaches its last tick ${when}: it advances ${times} on schedule (${route}) and has ${ticks} ticks. Let the finale start with at least one tick to spare, so only failure or delay sets off the deadline: add ticks or take scheduled moments out.`,
      },
    ];
  }
  if (!schedule.alsoTimed && ticks - total > 2) {
    return [
      {
        area: "clock",
        message: `The schedule only advances the clock ${times} on a cautious route (${route || "never"}), but it has ${ticks} ticks, so the pressure never builds. Add scheduled moments or reduce the clock to match.`,
      },
    ];
  }
  return [];
}

const checkClockSchedule: GapCheck = (adventure) => {
  const { clock } = adventure;
  if (!clock) return [];
  const counted = scheduleGaps(adventure);
  if (counted) return counted;
  if (SCHEDULED.test(clock.advances)) return [];
  return [
    {
      area: "clock",
      message:
        "The clock only moves when the party takes risks, so cautious play stops it. Add a schedule that advances it regardless (the end of each essential scene, or fixed moments such as each sunset), and keep risky choices as an extra push.",
    },
  ];
};

/** Act timings in prose must agree with the scene budget. */
const ACT_MINUTES =
  /\b(?:act|part)\s+(?:one|two|three|four|five|i{1,3}|iv|v|[1-5])\b[^.;\n]*?\b(\d{1,3})\s*(?:minutes|mins?)\b/gi;

const checkPacing: GapCheck = (adventure) => {
  const b = adventure.briefing;
  const prose = [b.premise, b.prep, b.hook, b.objective, b.stakes].join("\n");
  const acts: number[] = [];
  // ⚡ Bolt Optimization: Replace [...matchAll].map() with an imperative loop to avoid intermediate allocations
  for (const match of prose.matchAll(ACT_MINUTES)) {
    acts.push(Number(match[1]));
  }
  if (acts.length < 2) return [];
  const stated = acts.reduce((a, n) => a + n, 0);
  const scenes = adventure.scenes.reduce((a, s) => a + s.minutes, 0);
  if (stated === scenes) return [];
  return [
    {
      area: "briefing",
      message: `The briefing's act timings add up to ${stated} minutes, but the scenes add up to ${scenes}. Take times from the scene budget only, or remove the act timings.`,
    },
  ];
};

/**
 * An Exploration one-shot needs a choice of route and somewhere optional to
 * go, or it is a corridor with scenery.
 */
const checkExplorationRoutes: GapCheck = (adventure) => {
  if (adventure.emphasis !== "Exploration" || adventure.scenes.length < 4) {
    return [];
  }
  const branches = adventure.scenes.some(
    (s) => s.kind !== "climax" && new Set(s.next).size >= 2,
  );
  const optional = adventure.scenes.some((s) => !s.essential);
  return [
    ...(branches
      ? []
      : [
          {
            area: "scene" as const,
            message:
              "This is an Exploration one-shot, but every scene leads straight to the next. Give at least one scene two routes onward with different risks and finds.",
          },
        ]),
    ...(optional
      ? []
      : [
          {
            area: "scene" as const,
            message:
              "This is an Exploration one-shot with no optional location. Add one that holds a reward, a shortcut or useful information.",
          },
        ]),
  ];
};

/** A rescue or promise the party cannot resolve during play. */
const AFTER_PLAY =
  /\b(after the (adventure|session|one-shot|game)|next session|in a (sequel|later adventure)|post-game|epilogue only)\b/i;

const checkLateCommitments: GapCheck = (adventure) =>
  (adventure.threads ?? [])
    .filter((t) => AFTER_PLAY.test(t.payoff))
    .map((t) => ({
      area: "briefing" as const,
      message: `"${t.setup}" only pays off after the adventure. Give the party a chance to resolve it during play, at a cost.`,
    }));

/** Two endings reached the same way leave the GM to decide between them. */
const checkEndings: GapCheck = (adventure) => {
  const gaps: OneShotGap[] = [];
  const endings = adventure.endings.filter((e) => e.condition.trim());
  for (let i = 0; i < endings.length; i++) {
    for (let j = i + 1; j < endings.length; j++) {
      const [a, b] = [endings[i], endings[j]];
      if (textOverlap(a.condition, b.condition) >= 0.6) {
        gaps.push({
          area: "solution",
          message: `"${a.title}" and "${b.title}" are reached in almost the same way. Say exactly what the party does differently to reach each.`,
        });
      } else if (
        a.consequence.trim() &&
        textOverlap(a.consequence, b.consequence) >= 0.6
      ) {
        gaps.push({
          area: "solution",
          message: `"${a.title}" and "${b.title}" end almost the same way. Say what each one changes afterwards, and for a partial ending what was won and what remains.`,
        });
      }
    }
  }
  return gaps;
};

export const INTEGRITY_CHECKS: GapCheck[] = [
  checkAntagonist,
  checkNpcContinuity,
  checkWhereabouts,
  checkThreads,
  checkThreadSubjects,
  checkMystery,
  checkEndingCoverage,
  checkResources,
  checkRouteTradeoffs,
  checkLateCommitments,
  checkClockConsistency,
  checkClockSchedule,
  checkClockCount,
  checkEnvironment,
  checkEmphasis,
  checkOpposition,
  checkExplorationRoutes,
  checkEndings,
  checkPacing,
];
