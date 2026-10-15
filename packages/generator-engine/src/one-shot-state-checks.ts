/**
 * Exact checks on the structured parts of a one-shot: who is where, which
 * decisions decide the ending, which theory a clue backs, what each route
 * out of a scene risks, and what each promise is about. These compare data,
 * so unlike the prose checks they do not guess.
 */

import { textOverlap } from "./one-shot-dedupe";
import { isConfined, whereaboutsTimeline } from "./one-shot-state";
import type {
  OneShotAdventure,
  OneShotDecision,
  OneShotEnding,
  OneShotGap,
  OneShotWhereabout,
} from "./one-shot-types";

type GapCheck = (adventure: OneShotAdventure) => OneShotGap[];

const norm = (text?: string) => (text ?? "").toLowerCase().trim();

// ── Who is where ─────────────────────────────────────────────────────────

/** A change that needs a reason: freed or taken, or an object that moved. */
function needsReason(prev: OneShotWhereabout, next: OneShotWhereabout) {
  if (isConfined(prev.state) !== isConfined(next.state)) return true;
  return (
    next.kind === "object" &&
    !!prev.where &&
    !!next.where &&
    norm(prev.where) !== norm(next.where)
  );
}

function change(prev: OneShotWhereabout, next: OneShotWhereabout): string {
  return next.kind === "object" && prev.where !== next.where
    ? `moves from ${prev.where} to ${next.where}`
    : `goes from ${prev.state} to ${next.state}`;
}

export const checkWhereabouts: GapCheck = (adventure) => {
  const gaps: OneShotGap[] = [];
  const current = new Map<string, OneShotWhereabout>();
  const names = new Map(adventure.npcs.map((n) => [n.id, n.name]));
  for (const scene of adventure.scenes) {
    const stated = new Map((scene.whereabouts ?? []).map((w) => [w.who, w]));
    const gap = (who: string, message: string): OneShotGap => ({
      area: "npc",
      id: names.has(who) ? who : undefined,
      message: `${names.get(who) ?? who} ${message}`,
    });
    for (const w of stated.values()) {
      const prev = current.get(w.who);
      if (prev && needsReason(prev, w) && !w.how) {
        gaps.push(
          gap(
            w.who,
            `${change(prev, w)} in "${scene.title}" with no explanation. Say how it happened.`,
          ),
        );
      }
      current.set(w.who, w);
    }
    for (const id of scene.npcIds) {
      const held = current.get(id);
      if (held && isConfined(held.state) && !stated.has(id)) {
        gaps.push(
          gap(
            id,
            `is in "${scene.title}" but is still ${held.state} from an earlier scene. Say how they got free, or leave them out.`,
          ),
        );
      }
    }
  }
  return gaps;
};

// ── Endings ──────────────────────────────────────────────────────────────

/** Every way the party can answer, skipping decisions that are never asked. */
function combinations(decisions: OneShotDecision[]): Record<string, boolean>[] {
  return decisions.reduce<Record<string, boolean>[]>(
    (all, d) =>
      all.flatMap((c) =>
        Object.entries(d.when ?? {}).every(([id, v]) => c[id] === v)
          ? [
              { ...c, [d.id]: true },
              { ...c, [d.id]: false },
            ]
          : [c],
      ),
    [{}],
  );
}

const matches = (e: OneShotEnding, combo: Record<string, boolean>) =>
  Object.entries(e.requires ?? {}).every(([id, value]) => combo[id] === value);

const describe = (combo: Record<string, boolean>) =>
  Object.entries(combo)
    .map(([id, value]) => `${id} ${value ? "yes" : "no"}`)
    .join(", ");

export const checkEndingCoverage: GapCheck = (adventure) => {
  const { endings, decisions } = adventure;
  if (endings.length < 2) return [];
  const gap = (message: string): OneShotGap => ({ area: "solution", message });
  if (!decisions?.length) {
    return [
      gap(
        "Name the 2–4 yes-or-no decisions that decide the ending, and which answers lead to each ending.",
      ),
    ];
  }
  const specific = endings.filter((e) => Object.keys(e.requires ?? {}).length);
  const fallbacks = endings.filter((e) => !specific.includes(e));
  const problems: string[] = [];
  if (fallbacks.length > 1) {
    problems.push(
      `${fallbacks.map((e) => `"${e.title}"`).join(" and ")} depend on no decision, so either could be the result.`,
    );
  }
  for (const combo of combinations(decisions)) {
    const hits = specific.filter((e) => matches(e, combo));
    if (hits.length > 1) {
      problems.push(
        `${hits.map((e) => `"${e.title}"`).join(" and ")} both happen when ${describe(combo)}.`,
      );
    } else if (!hits.length && !fallbacks.length) {
      problems.push(`No ending happens when ${describe(combo)}.`);
    }
  }
  return problems.slice(0, 3).map(gap);
};

// ── Mystery ──────────────────────────────────────────────────────────────

export const checkMystery: GapCheck = (adventure) => {
  const { theories, clues } = adventure;
  const gap = (message: string): OneShotGap => ({ area: "clue", message });
  if (!theories?.length) {
    return adventure.emphasis === "Investigation / mystery"
      ? [
          gap(
            "List at least two competing theories, the obvious one and the true one, and mark which clues support or rule out each.",
          ),
        ]
      : [];
  }
  const truths = theories.filter((t) => t.isTrue);
  const obvious =
    theories.find((t) => t.obvious) ?? theories.find((t) => !t.isTrue);
  const backing = (id: string) =>
    clues.filter((c) => c.supports?.includes(id)).length;
  return [
    ...(theories.length < 2
      ? [gap("Give the players at least two theories to choose between.")]
      : []),
    ...(truths.length === 1
      ? []
      : [gap("Exactly one theory must be the true one.")]),
    ...theories
      .filter(
        (t) =>
          !clues.some(
            (c) => c.supports?.includes(t.id) || c.contradicts?.includes(t.id),
          ),
      )
      .map((t) => gap(`No clue supports or rules out "${t.name}".`)),
    ...(obvious && !clues.some((c) => c.contradicts?.includes(obvious.id))
      ? [
          gap(
            `Nothing in the clues overturns the obvious theory, "${obvious.name}". Make at least one clue rule it out or change it.`,
          ),
        ]
      : []),
    ...(truths.length === 1 && backing(truths[0].id) < 2
      ? [gap(`Give "${truths[0].name}" at least two clues that support it.`)]
      : []),
  ];
};

// ── Routes ───────────────────────────────────────────────────────────────

export const checkRouteTradeoffs: GapCheck = (adventure) => {
  if (adventure.emphasis !== "Exploration") return [];
  const title = (id: string) =>
    adventure.scenes.find((s) => s.id === id)?.title ?? id;
  return adventure.scenes.flatMap((scene) => {
    const next = [...new Set(scene.next)];
    if (next.length < 2 || scene.kind === "climax") return [];
    const routes = scene.routes ?? [];
    const missing = next.filter((id) => !routes.some((r) => r.to === id));
    const gap = (message: string): OneShotGap => ({
      area: "scene",
      id: scene.id,
      message: `"${scene.title}": ${message}`,
    });
    if (missing.length) {
      return [
        gap(
          `say what each way onward risks and finds (missing ${missing.map(title).join(", ")}).`,
        ),
      ];
    }
    const same = routes.some((a, i) =>
      routes
        .slice(i + 1)
        .some(
          (b) =>
            textOverlap(a.risk, b.risk) >= 0.6 ||
            textOverlap(a.find, b.find) >= 0.6,
        ),
    );
    return same
      ? [
          gap(
            "its routes risk or find almost the same thing. Make them differ.",
          ),
        ]
      : [];
  });
};

// ── Promises ─────────────────────────────────────────────────────────────

export const checkThreadSubjects: GapCheck = (adventure) => {
  const timeline = whereaboutsTimeline(adventure);
  const confinedNpcs = new Set(
    timeline.flatMap((t) =>
      t.entries
        .filter((e) => e.kind === "npc" && isConfined(e.state))
        .map((e) => e.who),
    ),
  );
  const tracked = adventure.scenes.some((s) => s.whereabouts?.length);
  return (adventure.threads ?? [])
    .filter((t) => t.kind === "rescue")
    .flatMap((t): OneShotGap[] => {
      const person = adventure.npcs.find((n) => n.id === t.about);
      if (!person) {
        return [
          {
            area: "briefing",
            message: `"${t.setup}" is a rescue, but does not say who is to be rescued. Name them by NPC id.`,
          },
        ];
      }
      return tracked && !confinedNpcs.has(person.id)
        ? [
            {
              area: "briefing",
              message: `${person.name} is to be rescued, but no scene shows them trapped, captive or missing.`,
            },
          ]
        : [];
    });
};
