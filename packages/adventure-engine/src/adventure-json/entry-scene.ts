import type { AdventureJsonScene, AdventureJsonV1 } from "./schema";

/** The entry scene is the first scene of the package. */
export function entrySceneId(
  pkg: Pick<AdventureJsonV1, "scenes">,
): string | undefined {
  return pkg.scenes[0]?.id;
}

/** The entry scene, then every optional scene that no other scene branches to. */
export function startSceneCandidates(
  pkg: Pick<AdventureJsonV1, "scenes">,
): AdventureJsonScene[] {
  const [entry, ...rest] = pkg.scenes;
  if (!entry) return [];
  const targeted = new Set<string>();
  for (const scene of pkg.scenes) {
    for (const branch of scene.branches ?? []) {
      if (branch.targetSceneId !== scene.id) targeted.add(branch.targetSceneId);
    }
  }
  return [
    entry,
    ...rest.filter(
      (scene) => scene.optional === true && !targeted.has(scene.id),
    ),
  ];
}
