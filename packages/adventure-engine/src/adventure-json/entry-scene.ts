import type { AdventureJsonV1 } from "./schema";

/** The entry scene is the first scene of the package. */
export function entrySceneId(
  pkg: Pick<AdventureJsonV1, "scenes">,
): string | undefined {
  return pkg.scenes[0]?.id;
}
