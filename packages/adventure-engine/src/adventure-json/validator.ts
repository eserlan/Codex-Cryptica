import type { ZodIssue } from "zod";
import { entrySceneId } from "./entry-scene";
import { UNKNOWN_SCENE_PROGRESSION } from "./unresolved-codes";
import {
  ADVENTURE_JSON_V1_FORMAT_VERSION,
  AdventureJsonV1Schema,
  type AdventureJsonV1,
  type AdventureJsonScene,
} from "./schema";

export type AdventureJsonValidationErrorCode =
  | "INVALID_FORMAT_VERSION"
  | "INVALID_VISIBILITY"
  | "SCHEMA_VALIDATION_ERROR"
  | "DUPLICATE_ID"
  | "UNRESOLVED_REFERENCE"
  | "SELF_REFERENCE"
  | "HIERARCHY_CYCLE"
  | "DEAD_END_CYCLE"
  | "UNREACHABLE_SCENE"
  | "DUPLICATE_SCENE_PROGRESSION";

export interface AdventureJsonValidationError {
  code: AdventureJsonValidationErrorCode;
  message: string;
  path?: string;
  entityId?: string;
}

export type AdventureJsonValidationResult =
  | { ok: true; value: AdventureJsonV1 }
  | { ok: false; errors: AdventureJsonValidationError[] };

type EntityCollectionName =
  | "locations"
  | "actors"
  | "factions"
  | "scenes"
  | "encounters"
  | "clues"
  | "rumours"
  | "items"
  | "secrets"
  | "endings"
  | "unresolved";

const ENTITY_COLLECTIONS: readonly EntityCollectionName[] = [
  "locations",
  "actors",
  "factions",
  "scenes",
  "encounters",
  "clues",
  "rumours",
  "items",
  "secrets",
  "endings",
  "unresolved",
];

function formatPath(path: PropertyKey[]): string | undefined {
  if (path.length === 0) return undefined;
  return path
    .map((segment, index) => {
      if (typeof segment === "number") {
        return `[${segment}]`;
      }
      const key = String(segment);
      return index === 0 ? key : `.${key}`;
    })
    .join("");
}

function getSecretEntityId(data: unknown, index: number): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const secrets = (data as Record<string, unknown>).secrets;
  if (!Array.isArray(secrets)) return undefined;
  const item = secrets[index];
  if (!item || typeof item !== "object") return undefined;
  const id = (item as Record<string, unknown>).id;
  return typeof id === "string" ? id : undefined;
}

function mapZodIssue(
  issue: ZodIssue,
  rawData: unknown,
): AdventureJsonValidationError {
  const pathStr = formatPath(issue.path);

  if (pathStr === "formatVersion") {
    return {
      code: "INVALID_FORMAT_VERSION",
      message: `Unsupported or missing formatVersion; expected "${ADVENTURE_JSON_V1_FORMAT_VERSION}".`,
      path: pathStr,
    };
  }

  const secretVisibilityMatch = pathStr?.match(
    /^secrets\[(\d+)\]\.visibility$/,
  );
  if (secretVisibilityMatch) {
    return {
      code: "INVALID_VISIBILITY",
      message: 'Secrets must have visibility set to "gm-only".',
      path: pathStr,
      entityId: getSecretEntityId(rawData, Number(secretVisibilityMatch[1])),
    };
  }

  if (/^unresolved\[\d+\]\.epistemicStatus$/.test(pathStr ?? "")) {
    return {
      code: "SCHEMA_VALIDATION_ERROR",
      message:
        'For an unresolved item, choose "ambiguous" when the source is unclear or contradictory, or "unresolved" when the source does not answer it.',
      path: pathStr,
    };
  }

  return {
    code: "SCHEMA_VALIDATION_ERROR",
    message: issue.message,
    path: pathStr,
  };
}

function validateUniqueIds(
  pkg: AdventureJsonV1,
  errors: AdventureJsonValidationError[],
): Set<string> {
  const seen = new Map<string, string>();
  const allIds = new Set<string>();

  for (const collection of ENTITY_COLLECTIONS) {
    const items = pkg[collection];
    for (let i = 0; i < items.length; i += 1) {
      const entity = items[i]!;
      const path = `${collection}[${i}].id`;
      const existingPath = seen.get(entity.id);
      if (existingPath !== undefined) {
        errors.push({
          code: "DUPLICATE_ID",
          message: `Duplicate entity ID "${entity.id}" (already defined at ${existingPath}).`,
          path,
          entityId: entity.id,
        });
      } else {
        seen.set(entity.id, path);
        allIds.add(entity.id);
      }
    }
  }

  return allIds;
}

function checkReference(
  errors: AdventureJsonValidationError[],
  ownerId: string,
  targetId: string | undefined,
  allowedIds: Set<string>,
  targetLabel: string,
  path: string,
): void {
  if (targetId === undefined) return;
  if (targetId === ownerId) {
    errors.push({
      code: "SELF_REFERENCE",
      message: `Entity "${ownerId}" cannot reference itself via ${path}.`,
      path,
      entityId: ownerId,
    });
    return;
  }
  if (!allowedIds.has(targetId)) {
    errors.push({
      code: "UNRESOLVED_REFERENCE",
      message: `Entity "${ownerId}" references unknown ${targetLabel} "${targetId}".`,
      path,
      entityId: ownerId,
    });
  }
}

function validateReferences(
  pkg: AdventureJsonV1,
  allIds: Set<string>,
  errors: AdventureJsonValidationError[],
): void {
  const locationIds = new Set(pkg.locations.map((l) => l.id));
  const actorIds = new Set(pkg.actors.map((a) => a.id));
  const factionIds = new Set(pkg.factions.map((f) => f.id));
  const sceneIds = new Set(pkg.scenes.map((s) => s.id));

  pkg.locations.forEach((loc, i) => {
    checkReference(
      errors,
      loc.id,
      loc.parentLocationId,
      locationIds,
      "location",
      `locations[${i}].parentLocationId`,
    );
    loc.connections?.forEach((conn, j) => {
      checkReference(
        errors,
        loc.id,
        conn.targetLocationId,
        locationIds,
        "location",
        `locations[${i}].connections[${j}].targetLocationId`,
      );
    });
  });

  pkg.actors.forEach((actor, i) => {
    checkReference(
      errors,
      actor.id,
      actor.factionId,
      factionIds,
      "faction",
      `actors[${i}].factionId`,
    );
    checkReference(
      errors,
      actor.id,
      actor.locationId,
      locationIds,
      "location",
      `actors[${i}].locationId`,
    );
  });

  pkg.scenes.forEach((scene, i) => {
    checkReference(
      errors,
      scene.id,
      scene.locationId,
      locationIds,
      "location",
      `scenes[${i}].locationId`,
    );
    scene.branches?.forEach((branch, j) => {
      checkReference(
        errors,
        scene.id,
        branch.targetSceneId,
        sceneIds,
        "scene",
        `scenes[${i}].branches[${j}].targetSceneId`,
      );
    });
  });

  pkg.encounters.forEach((enc, i) => {
    checkReference(
      errors,
      enc.id,
      enc.sceneId,
      sceneIds,
      "scene",
      `encounters[${i}].sceneId`,
    );
    checkReference(
      errors,
      enc.id,
      enc.locationId,
      locationIds,
      "location",
      `encounters[${i}].locationId`,
    );
    enc.actorIds?.forEach((actorId, j) => {
      checkReference(
        errors,
        enc.id,
        actorId,
        actorIds,
        "actor",
        `encounters[${i}].actorIds[${j}]`,
      );
    });
  });

  pkg.clues.forEach((clue, i) => {
    checkReference(
      errors,
      clue.id,
      clue.leadTargetId,
      allIds,
      "entity",
      `clues[${i}].leadTargetId`,
    );
    checkReference(
      errors,
      clue.id,
      clue.placedLocationId,
      locationIds,
      "location",
      `clues[${i}].placedLocationId`,
    );
    checkReference(
      errors,
      clue.id,
      clue.placedActorId,
      actorIds,
      "actor",
      `clues[${i}].placedActorId`,
    );
    checkReference(
      errors,
      clue.id,
      clue.placedSceneId,
      sceneIds,
      "scene",
      `clues[${i}].placedSceneId`,
    );
    checkReference(
      errors,
      clue.id,
      clue.alternativeSourceId,
      allIds,
      "entity",
      `clues[${i}].alternativeSourceId`,
    );
  });

  pkg.rumours.forEach((rumour, i) => {
    checkReference(
      errors,
      rumour.id,
      rumour.sourceActorId,
      actorIds,
      "actor",
      `rumours[${i}].sourceActorId`,
    );
    checkReference(
      errors,
      rumour.id,
      rumour.sourceLocationId,
      locationIds,
      "location",
      `rumours[${i}].sourceLocationId`,
    );
    checkReference(
      errors,
      rumour.id,
      rumour.targetEntityId,
      allIds,
      "entity",
      `rumours[${i}].targetEntityId`,
    );
  });

  pkg.items.forEach((item, i) => {
    checkReference(
      errors,
      item.id,
      item.locationId,
      locationIds,
      "location",
      `items[${i}].locationId`,
    );
    checkReference(
      errors,
      item.id,
      item.actorId,
      actorIds,
      "actor",
      `items[${i}].actorId`,
    );
  });

  pkg.secrets.forEach((secret, i) => {
    secret.relatedEntityIds?.forEach((targetId, j) => {
      checkReference(
        errors,
        secret.id,
        targetId,
        allIds,
        "entity",
        `secrets[${i}].relatedEntityIds[${j}]`,
      );
    });
  });

  pkg.unresolved.forEach((item, i) => {
    checkReference(
      errors,
      item.id,
      item.relatedEntityId,
      allIds,
      "entity",
      `unresolved[${i}].relatedEntityId`,
    );
  });
}

function traceLocationParentChain(
  startId: string,
  parentOf: Map<string, string>,
  indexOf: Map<string, number>,
  globallyVisited: Set<string>,
  errors: AdventureJsonValidationError[],
): void {
  const pathIndex = new Map<string, number>();
  const chain: string[] = [];
  let current: string | undefined = startId;

  while (current !== undefined && !globallyVisited.has(current)) {
    const cycleStart = pathIndex.get(current);
    if (cycleStart !== undefined) {
      const cycleIds = chain.slice(cycleStart);
      const entryId = cycleIds[0]!;
      errors.push({
        code: "HIERARCHY_CYCLE",
        message: `Circular location parent hierarchy detected: ${[...cycleIds, entryId].join(" -> ")}.`,
        path: `locations[${indexOf.get(entryId) ?? 0}].parentLocationId`,
        entityId: entryId,
      });
      break;
    }

    pathIndex.set(current, chain.length);
    chain.push(current);
    const next = parentOf.get(current);
    current = next !== undefined && indexOf.has(next) ? next : undefined;
  }

  for (const id of chain) {
    globallyVisited.add(id);
  }
}

function validateLocationHierarchyCycles(
  pkg: AdventureJsonV1,
  errors: AdventureJsonValidationError[],
): void {
  const parentOf = new Map<string, string>();
  const indexOf = new Map<string, number>();

  pkg.locations.forEach((loc, i) => {
    if (!indexOf.has(loc.id)) {
      indexOf.set(loc.id, i);
    }
    if (loc.parentLocationId !== undefined && loc.parentLocationId !== loc.id) {
      parentOf.set(loc.id, loc.parentLocationId);
    }
  });

  const globallyVisited = new Set<string>();
  for (const loc of pkg.locations) {
    if (!globallyVisited.has(loc.id)) {
      traceLocationParentChain(
        loc.id,
        parentOf,
        indexOf,
        globallyVisited,
        errors,
      );
    }
  }
}

function validateSceneReachability(
  scenes: AdventureJsonScene[],
  sceneMap: Map<string, AdventureJsonScene>,
  unresolved: AdventureJsonV1["unresolved"],
  errors: AdventureJsonValidationError[],
): void {
  if (scenes.length <= 1) return;

  const progressionUnknown = new Set<string>();
  unresolved.forEach((item, index) => {
    if (item.code !== UNKNOWN_SCENE_PROGRESSION || !item.relatedEntityId) {
      return;
    }

    if (progressionUnknown.has(item.relatedEntityId)) {
      errors.push({
        code: "DUPLICATE_SCENE_PROGRESSION",
        message: `More than one UNKNOWN_SCENE_PROGRESSION entry names scene "${item.relatedEntityId}".`,
        path: `unresolved[${index}]`,
        entityId: item.id,
      });
      return;
    }

    progressionUnknown.add(item.relatedEntityId);
  });
  const entryId = entrySceneId({ scenes })!;
  const reachable = new Set<string>([entryId]);
  const queue: string[] = [entryId];
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const currentId = queue[queueIndex++]!;
    const scene = sceneMap.get(currentId);
    for (const branch of scene?.branches ?? []) {
      if (
        sceneMap.has(branch.targetSceneId) &&
        !reachable.has(branch.targetSceneId)
      ) {
        reachable.add(branch.targetSceneId);
        queue.push(branch.targetSceneId);
      }
    }
  }

  scenes.forEach((scene, i) => {
    if (
      i > 0 &&
      !reachable.has(scene.id) &&
      !progressionUnknown.has(scene.id) &&
      // Deprecated legacy exemption, kept so existing v1 packages stay valid.
      scene.epistemicStatus !== "ambiguous"
    ) {
      errors.push({
        code: "UNREACHABLE_SCENE",
        message: `Scene "${scene.id}" is unreachable from entry scene "${entryId}".`,
        path: `scenes[${i}]`,
        entityId: scene.id,
      });
    }
  });
}

function propagateExitReachability(
  canExit: Set<string>,
  reverseAllAdj: Map<string, string[]>,
): void {
  const exitQueue = [...canExit];
  let queueIndex = 0;
  while (queueIndex < exitQueue.length) {
    const target = exitQueue[queueIndex++]!;
    for (const source of reverseAllAdj.get(target) ?? []) {
      if (!canExit.has(source)) {
        canExit.add(source);
        exitQueue.push(source);
      }
    }
  }
}

function buildMandatorySceneGraph(
  scenes: AdventureJsonScene[],
  sceneMap: Map<string, AdventureJsonScene>,
): {
  mandatoryAdj: Map<string, string[]>;
  canExit: Set<string>;
} {
  const mandatoryAdj = new Map<string, string[]>();
  const reverseAllAdj = new Map<string, string[]>();
  const canExit = new Set<string>();

  for (const scene of scenes) {
    const validBranches = (scene.branches ?? []).filter(
      (b) => sceneMap.has(b.targetSceneId) && b.targetSceneId !== scene.id,
    );
    const mandatory = validBranches
      .filter((b) => b.optional !== true)
      .map((b) => b.targetSceneId);

    mandatoryAdj.set(scene.id, mandatory);
    if (mandatory.length === 0) {
      canExit.add(scene.id);
    }

    for (const branch of validBranches) {
      const rev = reverseAllAdj.get(branch.targetSceneId) ?? [];
      rev.push(scene.id);
      reverseAllAdj.set(branch.targetSceneId, rev);
    }
  }

  propagateExitReachability(canExit, reverseAllAdj);
  return { mandatoryAdj, canExit };
}

function reportMandatoryCycle(
  nextId: string,
  stack: string[],
  stackIndex: Map<string, number>,
  sceneIndex: Map<string, number>,
  errors: AdventureJsonValidationError[],
): void {
  const cycleStart = stackIndex.get(nextId)!;
  const cycleIds = stack.slice(cycleStart);
  const entryId = cycleIds[0]!;
  errors.push({
    code: "DEAD_END_CYCLE",
    message: `Mandatory scene transition cycle with no exit path detected: ${[...cycleIds, entryId].join(" -> ")}.`,
    path: `scenes[${sceneIndex.get(entryId) ?? 0}].branches`,
    entityId: entryId,
  });
}

function traverseMandatorySceneCycles(
  startId: string,
  mandatoryAdj: Map<string, string[]>,
  canExit: Set<string>,
  visited: Set<string>,
  sceneIndex: Map<string, number>,
  errors: AdventureJsonValidationError[],
): void {
  const onStack = new Set<string>([startId]);
  const stack = [startId];
  const stackIndex = new Map<string, number>([[startId, 0]]);
  const frames: Array<{ sceneId: string; nextIndex: number }> = [];
  visited.add(startId);
  frames.push({ sceneId: startId, nextIndex: 0 });

  while (frames.length > 0) {
    const frame = frames[frames.length - 1]!;
    const nextIds = mandatoryAdj.get(frame.sceneId) ?? [];
    if (frame.nextIndex >= nextIds.length) {
      frames.pop();
      stack.pop();
      onStack.delete(frame.sceneId);
      stackIndex.delete(frame.sceneId);
      continue;
    }

    const nextId = nextIds[frame.nextIndex++]!;
    if (canExit.has(nextId)) continue;
    if (!visited.has(nextId)) {
      visited.add(nextId);
      onStack.add(nextId);
      stackIndex.set(nextId, stack.length);
      stack.push(nextId);
      frames.push({ sceneId: nextId, nextIndex: 0 });
    } else if (onStack.has(nextId)) {
      reportMandatoryCycle(nextId, stack, stackIndex, sceneIndex, errors);
    }
  }
}

function validateMandatorySceneCycles(
  scenes: AdventureJsonScene[],
  sceneMap: Map<string, AdventureJsonScene>,
  sceneIndex: Map<string, number>,
  errors: AdventureJsonValidationError[],
): void {
  const { mandatoryAdj, canExit } = buildMandatorySceneGraph(scenes, sceneMap);
  const visited = new Set<string>();

  for (const scene of scenes) {
    if (!canExit.has(scene.id) && !visited.has(scene.id)) {
      traverseMandatorySceneCycles(
        scene.id,
        mandatoryAdj,
        canExit,
        visited,
        sceneIndex,
        errors,
      );
    }
  }
}

function validateSceneGraph(
  pkg: AdventureJsonV1,
  errors: AdventureJsonValidationError[],
): void {
  if (pkg.scenes.length === 0) return;

  const sceneMap = new Map<string, AdventureJsonScene>();
  const sceneIndex = new Map<string, number>();
  pkg.scenes.forEach((scene, i) => {
    if (!sceneMap.has(scene.id)) {
      sceneMap.set(scene.id, scene);
      sceneIndex.set(scene.id, i);
    }
  });

  validateSceneReachability(pkg.scenes, sceneMap, pkg.unresolved, errors);
  validateMandatorySceneCycles(pkg.scenes, sceneMap, sceneIndex, errors);
}

export function validateAdventureJson(
  data: unknown,
): AdventureJsonValidationResult {
  const parsed = AdventureJsonV1Schema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => mapZodIssue(issue, data));
    return { ok: false, errors };
  }

  const pkg = parsed.data;
  const errors: AdventureJsonValidationError[] = [];

  const allIds = validateUniqueIds(pkg, errors);
  validateReferences(pkg, allIds, errors);
  validateLocationHierarchyCycles(pkg, errors);
  validateSceneGraph(pkg, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: pkg };
}
