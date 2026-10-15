/**
 * Structured state for the One-Shot Adventure Builder. The facts the checks
 * keep guessing from prose (when the clock moves, who is where, what decides
 * an ending, which theory a clue backs) are stored as data. Code can then
 * count, compare and complete them exactly, and the model writes the prose
 * around them.
 */

import { list, rec, str, strs } from "./one-shot-json";
import {
  ONE_SHOT_CLOCK_MOMENTS,
  ONE_SHOT_STATES,
  ONE_SHOT_THREAD_KINDS,
} from "./one-shot-types";
import type {
  OneShotAdventure,
  OneShotClock,
  OneShotClockMoment,
  OneShotDecision,
  OneShotEnding,
  OneShotRoute,
  OneShotScene,
  OneShotState,
  OneShotTheory,
  OneShotThreadKind,
  OneShotWhereabout,
} from "./one-shot-types";

const oneOf = <T extends string>(all: readonly T[], value: unknown) =>
  all.find((x) => x === str(value).toLowerCase());

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** States where a person or object cannot act or be found until freed. */
const CONFINED: readonly OneShotState[] = ["trapped", "captive", "missing"];
export const isConfined = (state: OneShotState) => CONFINED.includes(state);

// ── Clock ────────────────────────────────────────────────────────────────

export function parseSchedule(raw: unknown): OneShotClockMoment[] | undefined {
  const moments = list(raw)
    .map((m) => oneOf(ONE_SHOT_CLOCK_MOMENTS, m))
    .filter((m): m is OneShotClockMoment => !!m);
  // Each moment counts once; only fixed story moments may repeat.
  const once = moments.filter(
    (m, i) => m === "timed" || moments.indexOf(m) === i,
  );
  const unique = once.some((m) => m === "scene-end")
    ? once.filter((m) => m !== "scene-end-after-opening")
    : once;
  return unique.length ? unique : undefined;
}

export function parseStartsAt(raw: unknown): number | undefined {
  const n = Math.floor(Number(raw));
  return n >= 2 && n <= 6 ? n : undefined;
}

const MOMENT_TEXT: Record<OneShotClockMoment, string> = {
  start: "when the adventure begins",
  "scene-end": "at the end of each essential scene",
  "scene-end-after-opening":
    "at the end of each essential scene after the opening",
  "finale-start": "when the party reaches the finale",
  "finale-middle": "halfway through the finale",
  timed: "at each fixed moment in the story",
};

/** The `advances` sentence for a schedule, so the text never disagrees with it. */
export function scheduleSentence(clock: OneShotClock): string {
  const parts = (clock.schedule ?? []).map((m) => MOMENT_TEXT[m]);
  const when = parts.length
    ? `${parts.slice(0, -1).join(", ")}${parts.length > 1 ? ", and " : ""}${parts.at(-1)}`
    : "";
  const late = clock.startsAt
    ? ` The threat began before play, so it starts on tick ${clock.startsAt}.`
    : "";
  return [
    when && `It advances ${when}, whatever the party does.${late}`,
    clock.pushes,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Counts the scheduled advances before and during the finale. */
export function scheduledAdvances(
  scenes: OneShotScene[],
  clock: OneShotClock,
): { before: string[]; during: string[] } {
  const schedule = clock.schedule ?? [];
  const sceneEnds = scenes.filter((s) => s.essential && s.kind !== "climax");
  const before: string[] = [
    ...Array<string>(Math.max(0, (clock.startsAt ?? 1) - 1)).fill(
      "already ticked when play begins",
    ),
  ];
  for (const moment of schedule) {
    if (moment === "start") before.push("the start of the adventure");
    if (moment === "timed") before.push("a fixed moment in the story");
    if (moment === "finale-start") before.push("reaching the finale");
    if (moment === "scene-end" || moment === "scene-end-after-opening") {
      before.push(
        ...sceneEnds
          .filter((s) => moment === "scene-end" || s.kind !== "opening")
          .map((s) => `the end of "${s.title}"`),
      );
    }
  }
  const during = schedule
    .filter((m) => m === "finale-middle")
    .map(() => "halfway through the finale");
  return { before, during };
}

/**
 * Make the clock agree with its schedule: if the cautious route would use up
 * every tick, drop the moments that bite the finale first, then the start.
 * The `advances` text is then written from what is left.
 */
export function normaliseClock(
  clock: OneShotClock,
  scenes: OneShotScene[],
): OneShotClock {
  if (!clock.schedule?.length) return clock;
  const trimmed = { ...clock, schedule: [...clock.schedule] };
  const total = () => {
    const { before, during } = scheduledAdvances(scenes, trimmed);
    return before.length + during.length;
  };
  for (const drop of ["finale-middle", "finale-start", "start"] as const) {
    while (total() >= trimmed.ticks.length && trimmed.schedule.includes(drop)) {
      trimmed.schedule.splice(trimmed.schedule.lastIndexOf(drop), 1);
    }
  }
  return { ...trimmed, advances: scheduleSentence(trimmed) };
}

// ── Who is where ─────────────────────────────────────────────────────────

export function parseWhereabouts(
  raw: unknown,
): OneShotWhereabout[] | undefined {
  const found = list(raw).flatMap((item) => {
    const w = rec(item);
    const who = str(w.who);
    const state = oneOf(ONE_SHOT_STATES, w.state);
    if (!who || !state) return [];
    const kind: OneShotWhereabout["kind"] =
      str(w.kind) === "object" ? "object" : "npc";
    return [
      {
        who,
        kind,
        state,
        where: str(w.where) || undefined,
        how: str(w.how) || undefined,
      },
    ];
  });
  return found.length ? found : undefined;
}

export function parseRoutes(raw: unknown): OneShotRoute[] | undefined {
  const found = list(raw)
    .map((item) => rec(item))
    .map((r) => ({ to: str(r.to), risk: str(r.risk), find: str(r.find) }))
    .filter((r) => r.to && r.risk && r.find);
  return found.length ? found : undefined;
}

/** Whereabouts of unknown NPCs, repeats and routes not in `next` are dropped. */
function normaliseScene(
  scene: OneShotScene,
  npcIds: Set<string>,
): OneShotScene {
  const seen = new Set<string>();
  const whereabouts = (scene.whereabouts ?? [])
    .filter((w) => w.kind === "object" || npcIds.has(w.who))
    .reverse()
    .filter((w) => !seen.has(w.who) && !!seen.add(w.who))
    .reverse();
  const routes = (scene.routes ?? []).filter(
    (r, i, all) =>
      scene.next.includes(r.to) && all.findIndex((o) => o.to === r.to) === i,
  );
  return {
    ...scene,
    whereabouts: whereabouts.length ? whereabouts : undefined,
    routes: routes.length ? routes : undefined,
  };
}

export interface PlacedEntry extends OneShotWhereabout {
  name: string;
  /** Carried over from an earlier scene rather than stated in this one. */
  carried: boolean;
}

/**
 * Who is where, scene by scene. A state holds until a later scene changes it,
 * so the table is complete even where the plan only recorded the changes.
 */
export function whereaboutsTimeline(
  adventure: OneShotAdventure,
): { scene: OneShotScene; entries: PlacedEntry[] }[] {
  const names = new Map(adventure.npcs.map((n) => [n.id, n.name]));
  const current = new Map<string, OneShotWhereabout>();
  return adventure.scenes.map((scene) => {
    const stated = new Map((scene.whereabouts ?? []).map((w) => [w.who, w]));
    for (const w of stated.values()) current.set(w.who, w);
    const carried = [...current.values()].filter(
      (w) =>
        !stated.has(w.who) &&
        (scene.npcIds.includes(w.who) ||
          isConfined(w.state) ||
          w.kind === "object"),
    );
    const present = scene.npcIds
      .filter((id) => !current.has(id) && names.has(id))
      .map((id) => ({ who: id, kind: "npc" as const, state: "free" as const }));
    const entries = [...stated.values(), ...carried, ...present].map((w) => ({
      ...w,
      name: names.get(w.who) ?? w.who,
      carried: !stated.has(w.who),
    }));
    return { scene, entries };
  });
}

// ── Endings and decisions ────────────────────────────────────────────────

export function parseDecisions(raw: unknown): OneShotDecision[] | undefined {
  const ids = new Set<string>();
  const found = list(raw)
    .map((d, i) => {
      const r = rec(d);
      return {
        id: str(r.id, `decision-${i + 1}`),
        question: str(r.question),
        when: parseRequires(r.when),
      };
    })
    .filter((d) => {
      if (!d.question || ids.has(d.id)) return false;
      ids.add(d.id);
      return true;
    })
    .slice(0, 4);
  // A decision can only depend on one asked earlier.
  const earlier = new Set<string>();
  const ordered = found.map((d) => {
    const when = Object.fromEntries(
      Object.entries(d.when ?? {}).filter(([id]) => earlier.has(id)),
    );
    earlier.add(d.id);
    return { ...d, when: Object.keys(when).length ? when : undefined };
  });
  return ordered.length ? ordered : undefined;
}

export function parseRequires(
  raw: unknown,
): Record<string, boolean> | undefined {
  const entries = Object.entries(rec(raw)).filter(
    (e): e is [string, boolean] => typeof e[1] === "boolean",
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/** Endings may only name decisions that exist. */
function normaliseEndings(
  endings: OneShotEnding[],
  decisions: OneShotDecision[] | undefined,
): OneShotEnding[] {
  const known = new Set((decisions ?? []).map((d) => d.id));
  return endings.map((e) => {
    const requires = Object.fromEntries(
      Object.entries(e.requires ?? {}).filter(([id]) => known.has(id)),
    );
    return {
      ...e,
      requires: Object.keys(requires).length ? requires : undefined,
    };
  });
}

// ── Theories and clues ───────────────────────────────────────────────────

export function parseTheories(raw: unknown): OneShotTheory[] | undefined {
  const ids = new Set<string>();
  const found = list(raw)
    .map((t, i) => {
      const r = rec(t);
      const name = str(r.name);
      return {
        id: str(r.id, slug(name) || `theory-${i + 1}`),
        name,
        summary: str(r.summary),
        isTrue: r.isTrue === true,
        obvious: r.obvious === true ? true : undefined,
      };
    })
    .filter((t) => {
      if (!t.name || ids.has(t.id)) return false;
      ids.add(t.id);
      return true;
    });
  return found.length ? found : undefined;
}

/** Clue verdicts may only name theories that exist. */
export function parseVerdicts(
  raw: unknown,
  theories: OneShotTheory[] | undefined,
): string[] | undefined {
  const known = new Set((theories ?? []).map((t) => t.id));
  const ids = strs(raw).filter((id) => known.has(id));
  return ids.length ? [...new Set(ids)] : undefined;
}

// ── Threads ──────────────────────────────────────────────────────────────

export function parseThreadKind(raw: unknown): OneShotThreadKind | undefined {
  return oneOf(ONE_SHOT_THREAD_KINDS, raw);
}

// ── Everything together ──────────────────────────────────────────────────

/** Bring the structured parts into line with each other and with the cast. */
export function normaliseState(adventure: OneShotAdventure): OneShotAdventure {
  const npcIds = new Set(adventure.npcs.map((n) => n.id));
  return {
    ...adventure,
    scenes: adventure.scenes.map((s) => normaliseScene(s, npcIds)),
    endings: normaliseEndings(adventure.endings, adventure.decisions),
    clock: adventure.clock && normaliseClock(adventure.clock, adventure.scenes),
  };
}
