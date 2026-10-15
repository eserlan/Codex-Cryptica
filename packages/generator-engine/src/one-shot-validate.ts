import type {
  OneShotAdventure,
  OneShotIssue,
  OneShotScene,
} from "./one-shot-types";

const STEP = 5;

/** Buffer is about a tenth of the session, never under 10 minutes. */
export function bufferFor(durationMinutes: number): number {
  return Math.max(10, Math.round((durationMinutes * 0.1) / STEP) * STEP);
}

/**
 * Split `available` minutes across scenes by weight, in 5-minute steps. Any
 * rounding remainder lands on the climax so the finale is never squeezed.
 */
export function allocateMinutes(
  weights: number[],
  available: number,
  climaxIndex = weights.length - 1,
): number[] {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const minutes = weights.map((w) =>
    Math.max(STEP, Math.floor((available * w) / total / STEP) * STEP),
  );
  const drift = available - minutes.reduce((a, b) => a + b, 0);
  minutes[climaxIndex] = Math.max(STEP, minutes[climaxIndex] + drift);
  return minutes;
}

/** Optional scenes may take at most this share of scene time. */
export const OPTIONAL_SHARE = 0.2;

/**
 * Allocate minutes as allocateMinutes does, but cap optional scenes at
 * OPTIONAL_SHARE of the time so skipping them still leaves a session that
 * fills the slot. Freed time goes back to essential scenes by weight.
 */
export function allocateWithCore(
  weights: number[],
  essential: boolean[],
  available: number,
  climaxIndex = weights.length - 1,
): number[] {
  const minutes = allocateMinutes(weights, available, climaxIndex);
  const optional = minutes.filter((_, i) => !essential[i]);
  const optionalTotal = optional.reduce((a, b) => a + b, 0);
  const cap = Math.floor((available * OPTIONAL_SHARE) / STEP) * STEP;
  if (optionalTotal <= cap || !essential.some(Boolean)) return minutes;
  const capped = minutes.map((m, i) =>
    essential[i]
      ? m
      : Math.max(STEP, Math.floor((m * cap) / optionalTotal / STEP) * STEP),
  );
  const essentialIdx = minutes.map((_, i) => i).filter((i) => essential[i]);
  const core = allocateMinutes(
    essentialIdx.map((i) => weights[i]),
    available -
      capped.filter((_, i) => !essential[i]).reduce((a, b) => a + b, 0),
    Math.max(0, essentialIdx.indexOf(climaxIndex)),
  );
  essentialIdx.forEach((i, k) => (capped[i] = core[k]));
  return capped;
}

/** Scene minutes when every optional scene is skipped. */
export function coreMinutes(adventure: OneShotAdventure): number {
  return adventure.scenes
    .filter((s) => s.essential)
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function plannedMinutes(adventure: OneShotAdventure): number {
  return adventure.scenes.reduce((sum, s) => sum + s.minutes, 0);
}

/**
 * Rescale scene minutes so scenes plus buffer equal the session length. Used
 * on AI output, whose arithmetic cannot be trusted.
 */
export function normaliseTimeBudget(
  adventure: OneShotAdventure,
): OneShotAdventure {
  const buffer = bufferFor(adventure.durationMinutes);
  const available = adventure.durationMinutes - buffer;
  const climaxIndex = Math.max(
    0,
    adventure.scenes.findIndex((s) => s.kind === "climax"),
  );
  const minutes = allocateWithCore(
    adventure.scenes.map((s) => Math.max(s.minutes, STEP)),
    adventure.scenes.map((s) => s.essential),
    available,
    climaxIndex,
  );
  return {
    ...adventure,
    scenes: adventure.scenes.map((s, i) => ({ ...s, minutes: minutes[i] })),
    timeBudget: { ...adventure.timeBudget, bufferMinutes: buffer },
  };
}

type Check = (adventure: OneShotAdventure) => OneShotIssue[];
const error = (message: string): OneShotIssue => ({
  severity: "error",
  message,
});

const checkBudget: Check = (adventure) => {
  const issues: OneShotIssue[] = [];
  const { bufferMinutes } = adventure.timeBudget;
  const total = plannedMinutes(adventure) + bufferMinutes;
  if (total !== adventure.durationMinutes) {
    issues.push(
      error(
        `Scene times (${plannedMinutes(adventure)} min) plus the ${bufferMinutes} min buffer come to ${total} min, not the ${adventure.durationMinutes} min session.`,
      ),
    );
  }
  if (bufferMinutes <= 0) issues.push(error("There is no time buffer."));
  return issues;
};

const checkShape: Check = ({ scenes, endings }) => {
  const issues: OneShotIssue[] = [];
  if (scenes[0]?.kind !== "opening") {
    issues.push(error("The first scene is not an opening."));
  }
  if (scenes[scenes.length - 1]?.kind !== "climax") {
    issues.push(error("The last scene is not a climax."));
  }
  if (endings.length < 2) {
    issues.push(error("The adventure needs at least two possible endings."));
  }
  return issues;
};

function checkScene(
  scene: OneShotScene,
  ids: { scenes: Set<string>; npcs: Set<string>; clues: Set<string> },
): OneShotIssue[] {
  const t = scene.title;
  return [
    ...scene.next
      .filter((id) => !ids.scenes.has(id))
      .map(() => error(`"${t}" leads to a missing scene.`)),
    ...scene.npcIds
      .filter((id) => !ids.npcs.has(id))
      .map(() => error(`"${t}" uses a missing NPC.`)),
    ...scene.clueIds
      .filter((id) => !ids.clues.has(id))
      .map(() => error(`"${t}" offers a missing clue.`)),
    ...(scene.challenge.failForward.trim()
      ? []
      : [error(`"${t}" has no fail-forward outcome.`)]),
    ...(scene.kind !== "climax" && scene.next.length === 0
      ? [error(`"${t}" leads nowhere.`)]
      : []),
  ];
}

const checkScenes: Check = (adventure) => {
  const ids = {
    scenes: new Set(adventure.scenes.map((s) => s.id)),
    npcs: new Set(adventure.npcs.map((n) => n.id)),
    clues: new Set(adventure.clues.map((c) => c.id)),
  };
  const issues = adventure.scenes.flatMap((scene) => checkScene(scene, ids));
  const climax = adventure.scenes.find((scene) => scene.kind === "climax");
  if (!climax) return issues;

  // A path that can loop forever is not a route to the climax. Require the
  // playable graph to be acyclic and every scene to have a path to the finale.
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const hasCycle = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const scene = adventure.scenes.find((item) => item.id === id);
    const cyclic = scene?.next.some(hasCycle) ?? false;
    visiting.delete(id);
    visited.add(id);
    return cyclic;
  };
  if (adventure.scenes.some((scene) => hasCycle(scene.id))) {
    issues.push(error("The scene paths contain a loop."));
  }

  const reachesClimax = new Set([climax.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const scene of adventure.scenes) {
      if (
        !reachesClimax.has(scene.id) &&
        scene.next.some((id) => reachesClimax.has(id))
      ) {
        reachesClimax.add(scene.id);
        changed = true;
      }
    }
  }
  for (const scene of adventure.scenes) {
    if (!reachesClimax.has(scene.id)) {
      issues.push(error(`"${scene.title}" has no route to the climax.`));
    }
  }
  return issues;
};

const checkClues: Check = (adventure) => {
  const vitalClues = adventure.clues.filter((clue) => clue.essential);
  const issues: OneShotIssue[] = [];
  if (vitalClues.length !== 3) {
    issues.push(error("The adventure needs exactly three vital clues."));
  }
  if (
    new Set(vitalClues.map((clue) => clue.text.trim().toLocaleLowerCase()))
      .size !== vitalClues.length
  ) {
    issues.push(error("The vital clues must be distinct."));
  }
  return [
    ...issues,
    ...vitalClues
      .filter((c) => c.essential)
      .flatMap((clue) => {
        const routeScenes = clue.routes
          .map((r) => adventure.scenes.find((s) => s.id === r.sceneId))
          .filter((s): s is OneShotScene => !!s);
        return [
          ...(new Set(routeScenes.map((s) => s.id)).size < 2
            ? [
                error(
                  `The essential clue "${clue.text}" has fewer than two routes.`,
                ),
              ]
            : []),
          ...(routeScenes.some((s) => s.essential)
            ? []
            : [
                error(
                  `The essential clue "${clue.text}" is only found in skippable scenes.`,
                ),
              ]),
        ];
      }),
  ];
};

/**
 * Check the promises the builder makes: the time adds up, an opening and
 * climax exist, vital clues have more than one route (one of them in a scene
 * that cannot be skipped), failure moves the story on, and there are at least
 * two endings.
 */
export function validateOneShot(adventure: OneShotAdventure): OneShotIssue[] {
  return [checkBudget, checkShape, checkScenes, checkClues].flatMap((check) =>
    check(adventure),
  );
}
