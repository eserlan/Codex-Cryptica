/**
 * Clock simulation for the One-Shot Adventure Builder. A scene-based clock
 * schedule ("at the end of each essential scene") can be counted along the
 * essential route, which shows whether a party that plays carefully still
 * reaches and finishes the finale before the deadline. Schedules tied to the
 * fiction ("each sunset") cannot be counted and are left alone.
 */

import { scheduledAdvances } from "./one-shot-state";
import type { OneShotAdventure } from "./one-shot-types";

const PER_SCENE =
  /\b(?:end|close|conclusion|completion) of (?:each|every) (?:essential )?scene|\b(?:each|every) (?:essential )?scene (?:ends|concludes|closes|is (?:completed|finished|resolved))|\bas (?:each )?(?:essential )?scenes? (?:end|conclude|close)/i;
const SKIPS_OPENING =
  /\b(?:after|except|other than|not counting|apart from) the opening\b/i;
const AT_START =
  /\b(?:at|when) the (?:adventure|session|game) (?:begins|starts|opens)\b|\bat the (?:very )?start\b|\bas the (?:adventure|session) (?:begins|opens)\b/i;
const AT_FINALE =
  /\b(?:reach(?:es)?|arrives? at|enters?|at the start of|as .{0,20}?begins?) the (?:climax|finale|final (?:scene|confrontation))\b/i;
const IN_FINALE =
  /\b(?:halfway|midway|partway) through the (?:climax|finale|final (?:scene|confrontation))\b/i;

const ORDINALS: Record<string, number> = {
  one: 1,
  first: 1,
  two: 2,
  second: 2,
  three: 3,
  third: 3,
  four: 4,
  fourth: 4,
  five: 5,
  fifth: 5,
  six: 6,
  sixth: 6,
};
const START_TICK =
  /\b(?:starts?|begins?|opens?|already)\s+(?:on|at)\s+(?:the\s+)?(?:tick|step)\s+(\d|one|two|three|four|five|six)\b|\b(?:starts?|begins?|opens?|already)\s+(?:on|at)\s+the\s+(second|third|fourth|fifth|sixth)\s+(?:tick|step)\b/i;

export interface ClockSchedule {
  /** Scheduled advances before the finale begins, cautious route. */
  beforeFinale: number;
  /** Scheduled advances while the finale is still being played. */
  inFinale: number;
  /** What each scheduled advance is, in order, for the GM-facing message. */
  steps: string[];
  /**
   * The schedule also follows time in the fiction (each sunset), so the count
   * is only a minimum.
   */
  alsoTimed: boolean;
}

const TIMED =
  /\b(?:hours?|nights?|days?|dawns?|dusks?|sunsets?|sunrises?|nightfall|midnight|noon|watch(?:es)?|tides?|moons?|bells?|chimes?)\b/i;

/**
 * Count the scheduled advances on the shortest cautious route: the essential
 * scenes in order, without failures or rests. The finale's own end is not
 * counted, since the adventure is resolved by then.
 */
export function simulateClock(
  adventure: OneShotAdventure,
): ClockSchedule | undefined {
  const { clock } = adventure;
  if (clock?.schedule?.length) {
    const { before, during } = scheduledAdvances(adventure.scenes, clock);
    return {
      beforeFinale: before.length,
      inFinale: during.length,
      steps: [...before, ...during],
      alsoTimed: clock.schedule.includes("timed"),
    };
  }
  const advances = clock?.advances ?? "";
  const counted = [PER_SCENE, AT_START, AT_FINALE, IN_FINALE].some((re) =>
    re.test(advances),
  );
  if (!counted) return undefined;
  const before = [
    ...startSteps(advances),
    ...sceneSteps(adventure, advances),
    ...(AT_FINALE.test(advances) ? ["reaching the finale"] : []),
  ];
  const during = IN_FINALE.test(advances) ? ["halfway through the finale"] : [];
  return {
    beforeFinale: before.length,
    inFinale: during.length,
    steps: [...before, ...during],
    alsoTimed: TIMED.test(advances),
  };
}

/** Ticks already gone when play begins, and one at the start if scheduled. */
function startSteps(advances: string): string[] {
  const start = START_TICK.exec(advances);
  const word = start ? (start[1] ?? start[2]).toLowerCase() : "";
  const already = start ? (ORDINALS[word] ?? Number(word)) - 1 : 0;
  return [
    ...Array<string>(Math.max(0, already)).fill(
      "already ticked when play begins",
    ),
    ...(AT_START.test(advances) ? ["the start of the adventure"] : []),
  ];
}

/** One tick as each essential scene before the finale ends. */
function sceneSteps(adventure: OneShotAdventure, advances: string): string[] {
  if (!PER_SCENE.test(advances)) return [];
  const skipOpening = SKIPS_OPENING.test(advances);
  return adventure.scenes
    .filter((s) => s.essential && s.kind !== "climax")
    .filter((s) => !(skipOpening && s.kind === "opening"))
    .map((s) => `the end of "${s.title}"`);
}
