import type {
  AdventureSourcePackage,
  Provenance,
  SceneRecord,
  SectionAnchor,
} from "../source-package/schema";
import {
  ADVENTURE_JSON_V1_FORMAT_VERSION,
  type AdventureJsonActor,
  type AdventureJsonClue,
  type AdventureJsonEncounter,
  type AdventureJsonEnding,
  type AdventureJsonV1,
  type AdventureJsonScene,
  type AdventureJsonSecret,
  type AdventureJsonUnresolved,
  type EpistemicStatus,
  type SceneTransitionBranch,
  type SourceReference,
  type Visibility,
} from "./schema";

type IdAllocator = (preferred: string) => string;

function mapProvenance(provenance: Provenance): EpistemicStatus {
  switch (provenance) {
    case "source-grounded":
      return "explicit";
    case "suggested":
      return "inferred";
    case "unresolved":
      return "unresolved";
  }
}

function buildSourceRef(
  section: SectionAnchor | undefined,
  anchorId: string,
): SourceReference {
  return {
    ...(section?.pageNumber !== undefined ? { page: section.pageNumber } : {}),
    ...(section?.pageEnd !== undefined ? { pageEnd: section.pageEnd } : {}),
    ...(section?.title ? { section: section.title } : {}),
    anchor: anchorId,
  };
}

function toSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "adventure"
  );
}

function buildPackageId(sourcePkg: AdventureSourcePackage): string {
  const raw =
    sourcePkg.sourceIdentity.title ?? sourcePkg.sourceIdentity.fileName;
  const slug = toSlug(raw).slice(0, 64);
  if (/^[a-z0-9_-]{3,64}$/i.test(slug)) {
    return slug;
  }
  return `adventure-${sourcePkg.documentHash.slice(0, 12)}`;
}

function makeUniqueIdAllocator(): IdAllocator {
  const used = new Set<string>();
  return (preferred: string): string => {
    const base = preferred.trim() || "entity";
    if (!used.has(base)) {
      used.add(base);
      return base;
    }
    let suffix = 2;
    while (used.has(`${base}-${suffix}`)) {
      suffix += 1;
    }
    const allocated = `${base}-${suffix}`;
    used.add(allocated);
    return allocated;
  };
}

function toVisibility(section: SectionAnchor | undefined): Visibility {
  return section?.gmOnly ? "gm-only" : "player-visible";
}

function summarizeText(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? trimmed;
  return firstLine.length > 240 ? `${firstLine.slice(0, 237)}...` : firstLine;
}

function mapSceneBranches(
  scene: SceneRecord,
  sceneId: string,
  sceneIdBySourceId: Map<string, string>,
): SceneTransitionBranch[] {
  const mapped: SceneTransitionBranch[] = [];
  for (const branch of scene.branches ?? []) {
    const targetSceneId = branch.targetSourceId
      ? sceneIdBySourceId.get(branch.targetSourceId)
      : undefined;
    if (!targetSceneId || targetSceneId === sceneId) continue;
    mapped.push({
      targetSceneId,
      description: branch.description,
      ...(scene.optionalBranch !== undefined
        ? { optional: scene.optionalBranch }
        : {}),
    });
  }
  return mapped;
}

function collectReachableSceneIds(scenes: AdventureJsonScene[]): Set<string> {
  const sceneById = new Map(scenes.map((s) => [s.id, s]));
  const reachable = new Set<string>([scenes[0]!.id]);
  const queue: string[] = [scenes[0]!.id];

  while (queue.length > 0) {
    const scene = sceneById.get(queue.shift()!);
    for (const branch of scene?.branches ?? []) {
      if (!reachable.has(branch.targetSceneId)) {
        reachable.add(branch.targetSceneId);
        queue.push(branch.targetSceneId);
      }
    }
  }

  return reachable;
}

function ensureSceneReachability(scenes: AdventureJsonScene[]): void {
  if (scenes.length <= 1) return;

  const reachable = collectReachableSceneIds(scenes);
  for (let i = 1; i < scenes.length; i += 1) {
    const target = scenes[i]!;
    if (reachable.has(target.id)) continue;
    const prev = scenes[i - 1]!;
    prev.branches = [
      ...(prev.branches ?? []),
      {
        targetSceneId: target.id,
        description: `Continue to ${target.title}`,
        ...(target.optional !== undefined ? { optional: target.optional } : {}),
      },
    ];
    reachable.add(target.id);
  }
}

function convertSingleScene(
  scene: SceneRecord,
  section: SectionAnchor | undefined,
  id: string,
  sceneIdBySourceId: Map<string, string>,
): AdventureJsonScene {
  const branches = mapSceneBranches(scene, id, sceneIdBySourceId);
  const result: AdventureJsonScene = {
    id,
    title: scene.title,
    summary: summarizeText(section?.body ?? "", scene.title),
    visibility: toVisibility(section),
    epistemicStatus: mapProvenance(scene.provenance),
    sourceRef: buildSourceRef(section, scene.sourceId),
  };

  if (section?.readAloud !== undefined) result.readAloud = section.readAloud;
  if (section?.body) result.body = section.body;
  if (scene.conditions.length > 0) result.conditions = scene.conditions;
  if (branches.length > 0) result.branches = branches;
  if (scene.optionalBranch !== undefined)
    result.optional = scene.optionalBranch;

  return result;
}

function convertScenes(
  sourcePkg: AdventureSourcePackage,
  sectionBySourceId: Map<string, SectionAnchor>,
  sceneIdBySourceId: Map<string, string>,
): AdventureJsonScene[] {
  const scenes = sourcePkg.scenes.map((scene) =>
    convertSingleScene(
      scene,
      sectionBySourceId.get(scene.sourceId),
      sceneIdBySourceId.get(scene.sourceId)!,
      sceneIdBySourceId,
    ),
  );

  ensureSceneReachability(scenes);
  return scenes;
}

function convertActors(
  sourcePkg: AdventureSourcePackage,
  sectionBySourceId: Map<string, SectionAnchor>,
  allocateId: IdAllocator,
): AdventureJsonActor[] {
  return sourcePkg.npcs.map((npc) => {
    const section = sectionBySourceId.get(npc.sourceId);
    return {
      id: allocateId(`actor-${toSlug(npc.name)}`),
      name: npc.name,
      summary: summarizeText(section?.body ?? npc.motivation, npc.name),
      ...(section?.body ? { description: section.body } : {}),
      ...(npc.motivation ? { motivation: npc.motivation } : {}),
      visibility: toVisibility(section),
      epistemicStatus: mapProvenance(npc.provenance),
      sourceRef: buildSourceRef(section, npc.sourceId),
    };
  });
}

function convertEncounters(
  sourcePkg: AdventureSourcePackage,
  sectionBySourceId: Map<string, SectionAnchor>,
  sceneIdBySourceId: Map<string, string>,
  allocateId: IdAllocator,
): AdventureJsonEncounter[] {
  return sourcePkg.encounters.map((enc) => {
    const section = sectionBySourceId.get(enc.sourceId);
    const sceneId = sceneIdBySourceId.get(enc.sourceId);
    return {
      id: allocateId(`encounter-${enc.sourceId}`),
      ...(enc.title ? { title: enc.title } : {}),
      ...(sceneId ? { sceneId } : {}),
      description: enc.description,
      ...(enc.conditions && enc.conditions.length > 0
        ? { conditions: enc.conditions }
        : {}),
      alternativeSolutions: enc.alternativeSolutions.map((alt) => ({
        method: alt.method,
        description: alt.description,
        ...(alt.socialBypassOfCombat !== undefined
          ? { socialBypassOfCombat: alt.socialBypassOfCombat }
          : {}),
      })),
      visibility: toVisibility(section),
      epistemicStatus: mapProvenance(enc.provenance),
      sourceRef: buildSourceRef(section, enc.sourceId),
    };
  });
}

function convertClues(
  sourcePkg: AdventureSourcePackage,
  sectionBySourceId: Map<string, SectionAnchor>,
  sceneIdBySourceId: Map<string, string>,
  allocateId: IdAllocator,
): AdventureJsonClue[] {
  return sourcePkg.clues.map((clue, index) => {
    const section = sectionBySourceId.get(clue.primarySourceId);
    const placedSceneId = sceneIdBySourceId.get(clue.primarySourceId);
    const altSceneId = clue.alternativeSourceId
      ? sceneIdBySourceId.get(clue.alternativeSourceId)
      : undefined;
    const id = allocateId(`clue-${index + 1}`);
    return {
      id,
      text: clue.clue,
      ...(placedSceneId ? { placedSceneId } : {}),
      ...(altSceneId && altSceneId !== id
        ? { alternativeSourceId: altSceneId }
        : {}),
      visibility: toVisibility(section),
      epistemicStatus: mapProvenance(clue.provenance),
      sourceRef: buildSourceRef(section, clue.primarySourceId),
    };
  });
}

function convertSecrets(
  sourcePkg: AdventureSourcePackage,
  sectionBySourceId: Map<string, SectionAnchor>,
  sceneIdBySourceId: Map<string, string>,
  allocateId: IdAllocator,
): AdventureJsonSecret[] {
  return sourcePkg.secrets.map((secret) => {
    const section = sectionBySourceId.get(secret.sourceId);
    const relatedSceneId = sceneIdBySourceId.get(secret.sourceId);
    return {
      id: allocateId(secret.id),
      text: secret.text,
      ...(relatedSceneId ? { relatedEntityIds: [relatedSceneId] } : {}),
      visibility: "gm-only",
      epistemicStatus: mapProvenance(secret.provenance),
      sourceRef: buildSourceRef(section, secret.sourceId),
    };
  });
}

function convertEndings(
  sourcePkg: AdventureSourcePackage,
  sectionBySourceId: Map<string, SectionAnchor>,
  allocateId: IdAllocator,
): AdventureJsonEnding[] {
  return sourcePkg.endings.map((ending) => {
    const section = sectionBySourceId.get(ending.sourceId);
    return {
      id: allocateId(ending.id),
      ...(ending.title ? { title: ending.title } : {}),
      description: ending.description,
      epistemicStatus: mapProvenance(ending.provenance),
      sourceRef: buildSourceRef(section, ending.sourceId),
    };
  });
}

function convertUnresolved(
  sourcePkg: AdventureSourcePackage,
  sectionBySourceId: Map<string, SectionAnchor>,
  sceneIdBySourceId: Map<string, string>,
  allocateId: IdAllocator,
): AdventureJsonUnresolved[] {
  return sourcePkg.ambiguities.map((ambiguity) => {
    const section = ambiguity.sourceId
      ? sectionBySourceId.get(ambiguity.sourceId)
      : undefined;
    const relatedSceneId = ambiguity.sourceId
      ? sceneIdBySourceId.get(ambiguity.sourceId)
      : undefined;
    return {
      id: allocateId(ambiguity.id),
      code: ambiguity.code,
      message: ambiguity.message,
      ...(relatedSceneId ? { relatedEntityId: relatedSceneId } : {}),
      ...(ambiguity.context ? { context: ambiguity.context } : {}),
      epistemicStatus: "unresolved",
      ...(ambiguity.sourceId
        ? { sourceRef: buildSourceRef(section, ambiguity.sourceId) }
        : {}),
    };
  });
}

/**
 * Converts an internal `AdventureSourcePackage` into a public `AdventureJsonV1`
 * interchange document, preserving provenance, GM-only visibility, and unresolved
 * ambiguities without inventing missing facts.
 */
export function adventureSourcePackageToAdventureJson(
  sourcePkg: AdventureSourcePackage,
): AdventureJsonV1 {
  const allocateId = makeUniqueIdAllocator();
  const sectionBySourceId = new Map<string, SectionAnchor>(
    sourcePkg.sections.map((section) => [section.sourceId, section]),
  );
  const sceneIdBySourceId = new Map<string, string>(
    sourcePkg.scenes.map((scene) => [
      scene.sourceId,
      allocateId(scene.sourceId),
    ]),
  );

  const title = (
    sourcePkg.sourceIdentity.title ?? sourcePkg.sourceIdentity.fileName
  ).slice(0, 200);
  const overviewSection = sourcePkg.sections[0];
  const firstSceneSection = sourcePkg.scenes[0]
    ? sectionBySourceId.get(sourcePkg.scenes[0].sourceId)
    : undefined;

  return {
    formatVersion: ADVENTURE_JSON_V1_FORMAT_VERSION,
    id: buildPackageId(sourcePkg),
    title,
    version: "1.0.0",
    premise: {
      background:
        overviewSection?.body ||
        `Imported from ${sourcePkg.sourceIdentity.fileName}.`,
      hook:
        firstSceneSection?.body ||
        overviewSection?.body ||
        `Adventure imported from ${sourcePkg.sourceIdentity.fileName}.`,
    },
    source: {
      title,
      documentHash: sourcePkg.documentHash,
    },
    locations: [],
    actors: convertActors(sourcePkg, sectionBySourceId, allocateId),
    factions: [],
    scenes: convertScenes(sourcePkg, sectionBySourceId, sceneIdBySourceId),
    encounters: convertEncounters(
      sourcePkg,
      sectionBySourceId,
      sceneIdBySourceId,
      allocateId,
    ),
    clues: convertClues(
      sourcePkg,
      sectionBySourceId,
      sceneIdBySourceId,
      allocateId,
    ),
    rumours: [],
    items: [],
    secrets: convertSecrets(
      sourcePkg,
      sectionBySourceId,
      sceneIdBySourceId,
      allocateId,
    ),
    endings: convertEndings(sourcePkg, sectionBySourceId, allocateId),
    unresolved: convertUnresolved(
      sourcePkg,
      sectionBySourceId,
      sceneIdBySourceId,
      allocateId,
    ),
  };
}
