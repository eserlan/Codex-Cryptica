import { AppliedSpeciesSchema } from "schema";
import type { ImportPlan, ShelfEntry } from "./types";

/** Cross-vault IDs are not identity. Only a co-imported source provides a new link. */
export function remapSpeciesSource(
  metadata: Record<string, unknown>,
  plan: ImportPlan,
  entry: ShelfEntry,
): void {
  const parsed = AppliedSpeciesSchema.safeParse(metadata.appliedSpecies);
  if (!parsed.success) return;
  const snapshot = parsed.data;
  const localId = snapshot.source.localEntityId;
  const sources = localId
    ? plan.entries.filter(
        (candidate) =>
          candidate.sourceVaultId === entry.sourceVaultId &&
          candidate.sourceEntityId === localId,
      )
    : [];
  metadata.appliedSpecies = {
    ...snapshot,
    source: {
      ...snapshot.source,
      localEntityId:
        sources.length === 1
          ? plan.mintedIds[sources[0].id]
          : entry.sourceVaultId === plan.targetVaultId
            ? localId
            : null,
    },
  };
}
