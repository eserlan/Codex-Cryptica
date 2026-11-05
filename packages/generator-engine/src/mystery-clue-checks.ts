import { list, record, text, type Obj } from "./mystery-obj";
import type { DraftCheck } from "./staged-runtime";
import {
  findBrokenReferences,
  findCircularItemRoutes,
} from "./mystery-consistency";
import {
  hasText,
  uniqueIds,
  hasCrossGroupIdCollision,
  knownIds,
  hasUniqueIds,
} from "./mystery-stage-validation";

/** A route must connect existing clues and actually support its conclusion. */
function readRoute(
  path: Obj,
  clues: Obj[],
  clueIds: string[],
  revelationId: string,
) {
  const pathClues = list(path.clueIds).map(text);
  const pathItems = pathClues.map((id) =>
    record(clues.find((clue) => text(clue.id) === id)),
  );
  if (
    !pathClues.length ||
    new Set(pathClues).size !== pathClues.length ||
    !pathClues.every((id) => clueIds.includes(id)) ||
    !pathItems.some((clue) =>
      list(clue.supports).map(text).includes(revelationId),
    ) ||
    pathItems.some(
      (clue, index) =>
        index < pathItems.length - 1 &&
        !list(clue.leadsTo)
          .map(text)
          .includes(pathClues[index + 1]),
    )
  ) {
    return null;
  }
  return { clues: pathClues, source: text(pathItems[0].sourceId) };
}

function checkClue(
  clue: Obj,
  index: number,
  allowedSources: Set<string>,
  revelationIds: Set<string>,
  clueIds: string[],
): string[] {
  const hard: string[] = [];
  if (!hasText(clue.observation) || !hasText(clue.doesNotProve))
    hard.push(
      `clue ${index + 1} must state an observation and what it does not prove`,
    );
  if (!allowedSources.has(text(clue.sourceId)))
    hard.push(`clue ${index + 1} has an unknown sourceId`);
  const supports = list(clue.supports).map(text);
  if (!supports.length || supports.some((id) => !revelationIds.has(id)))
    hard.push(`clue ${index + 1} must support a known revelation`);
  if (
    !list(clue.leadsTo).length ||
    list(clue.leadsTo).some(
      (id) =>
        (!allowedSources.has(text(id)) && !clueIds.includes(text(id))) ||
        text(id) === text(clue.id),
    )
  )
    hard.push(
      `clue ${index + 1} must point to a different, known person, place or clue`,
    );
  return hard;
}

/** Whether two routes can be followed without sharing a clue or a starting source. */
function independentPair(routes: { clues: string[]; source: string }[]) {
  return routes.some((a, i) =>
    routes
      .slice(i + 1)
      .some(
        (b) =>
          a.source !== b.source && !a.clues.some((id) => b.clues.includes(id)),
      ),
  );
}

/** Each revelation needs two independent routes, and the item's must be reachable. */
function checkRoutes(
  data: Obj,
  clues: Obj[],
  foundation: Obj,
  cast: Obj,
): string[] {
  const hard: string[] = [];
  const clueIds = uniqueIds(clues);
  const revelationIds = new Set(uniqueIds(list(foundation.revelations)));
  const paths = list(data.independentPaths).map(record);
  const focalRevelations = list(foundation.revelations)
    .map(record)
    .filter(
      (rev) => !["culprit", "motive"].includes(text(rev.kind).toLowerCase()),
    )
    .map((rev) => text(rev.id));
  for (const revelationId of revelationIds) {
    const matching = paths.filter(
      (path) => text(path.revelationId) === revelationId,
    );
    const routes = matching
      .map((path) => readRoute(path, clues, clueIds, revelationId))
      .filter((route) => route !== null);
    if (!independentPair(routes))
      hard.push(
        `${revelationId} needs two independent evidence paths from distinct sources that share no clue`,
      );
    else if (focalRevelations.includes(revelationId))
      hard.push(
        ...findCircularItemRoutes(
          routes.map((route) => route.source),
          text(cast.keyItemLocationId),
        ).map((issue) => `${revelationId}: ${issue}`),
      );
  }
  return hard;
}

export function checkClues(data: Obj, foundation: Obj, cast: Obj): DraftCheck {
  const hard: string[] = [];
  const clues = list(data.clues).map(record);
  if (clues.length < 6)
    hard.push(`at least six clues are required; received ${clues.length}`);
  const clueIds = uniqueIds(clues);
  if (!hasUniqueIds(clueIds)) hard.push("clue ids must be present and unique");
  if (
    hasCrossGroupIdCollision(
      uniqueIds(list(foundation.revelations)),
      uniqueIds(list(cast.suspects)),
      uniqueIds(list(cast.locations)),
      clueIds,
    )
  )
    hard.push(
      "person, place, clue and revelation ids must be unique across groups",
    );
  const allowedSources = new Set([
    ...uniqueIds(list(cast.suspects)),
    ...uniqueIds(list(cast.locations)),
  ]);
  const revelationIds = new Set(uniqueIds(list(foundation.revelations)));
  clues.forEach((clue, index) =>
    hard.push(
      ...checkClue(clue, index, allowedSources, revelationIds, clueIds),
    ),
  );
  hard.push(
    ...findBrokenReferences(
      [
        ...clues.flatMap((clue) => [
          text(clue.observation),
          text(clue.doesNotProve),
        ]),
        ...list(data.independentPaths).map((path) =>
          text(record(path).reasoning),
        ),
      ],
      knownIds(foundation, cast, clueIds),
    ),
  );
  hard.push(
    ...list(data.independentPaths)
      .map(record)
      .filter((path) => !hasText(path.reasoning))
      .map(
        () =>
          "every route needs reasoning explaining how its clues establish the conclusion",
      ),
  );
  hard.push(...checkRoutes(data, clues, foundation, cast));
  const itemPlace = text(cast.keyItemLocationId);
  if (
    itemPlace &&
    !clues.some((clue) => list(clue.leadsTo).map(text).includes(itemPlace))
  )
    hard.push(
      `at least one clue must lead to the key item's location (${itemPlace}) so the party can recover it`,
    );
  return { hard, soft: [] };
}
