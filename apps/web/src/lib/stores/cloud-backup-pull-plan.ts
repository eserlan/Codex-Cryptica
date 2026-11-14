import {
  buildFeedMergeSides,
  equalContent,
  mergeEntities,
  type MergeEntity,
  type MergeSide,
} from "@codex/cloud-backup-sync";
import type { MergeNotice, PulledChanges } from "./cloud-backup-types";

export interface PullPlan {
  changes: PulledChanges;
  /** Null when the merge changed nothing locally. */
  notice: MergeNotice | null;
}

/**
 * Merges a feed into the local entities and works out what to write. Only a
 * merged entity that differs from the local one is written, so a pull that
 * brings nothing new writes nothing.
 */
export function planPull(input: {
  entities: readonly MergeEntity[];
  tombstoneIds: readonly string[];
  mine: MergeSide;
  base: MergeSide;
  resync: boolean;
  newId: () => string;
}): PullPlan {
  const { mine } = input;
  const result = mergeEntities(
    buildFeedMergeSides({
      entities: input.entities,
      tombstones: input.tombstoneIds.map((id) => ({ id })),
      mine,
      base: input.base,
      resync: input.resync,
    }),
    { copyAuthorName: "this device", newId: input.newId },
  );
  const creates: MergeEntity[] = [];
  const updates: MergeEntity[] = [];
  for (const [id, merged] of Object.entries(result.entities)) {
    const local = mine[id];
    if (!local) creates.push(merged);
    else if (!equalContent(local, merged)) updates.push(merged);
  }
  const deletes = result.deletes.filter((id) => mine[id]);
  const changed = new Set([...updates, ...creates].map((entity) => entity.id));
  for (const id of deletes) changed.add(id);
  const copies = result.summary.copies.map(
    ({ originalId }) => mine[originalId]?.title ?? originalId,
  );
  return {
    changes: { updates, creates: [...creates, ...result.copies], deletes },
    notice:
      changed.size > 0 || copies.length > 0
        ? { merged: changed.size, copies }
        : null,
  };
}
