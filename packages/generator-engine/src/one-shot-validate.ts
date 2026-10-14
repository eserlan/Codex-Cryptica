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
  const minutes = allocateMinutes(
    adventure.scenes.map((s) => Math.max(s.minutes, STEP)),
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
const warning = (message: string): OneShotIssue => ({
  severity: "warning",
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
  return adventure.scenes.flatMap((scene) => checkScene(scene, ids));
};

const checkClues: Check = (adventure) =>
  adventure.clues
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
              warning(
                `The essential clue "${clue.text}" is only found in skippable scenes.`,
              ),
            ]),
      ];
    });

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
