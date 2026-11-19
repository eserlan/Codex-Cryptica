import {
  buildFeedMergeSides,
  buildWholeFeedMergeSides,
  equalContent,
  equalWholeContent,
  mergeEntities,
  mergeWholeItems,
  type FeedWholeItem,
  type MergeEntity,
  type MergeSide,
  type WholeSide,
} from "@codex/cloud-backup-sync";
import type {
  MergeNotice,
  PulledChanges,
  PulledWholeChanges,
} from "./cloud-backup-types";

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
  /** Names the local side of a conflict copy; "this device" by default. */
  copyAuthorName?: string;
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
    {
      copyAuthorName: input.copyAuthorName ?? "this device",
      newId: input.newId,
    },
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

/**
 * Merges the feed's maps or canvases into the local ones. An item the feed
 * carries is written even when its content matches, unless every file it
 * names is already here, because a map's fog mask changes without its record.
 */
export function planWholePull(input: {
  items: readonly FeedWholeItem[];
  tombstoneIds: readonly string[];
  mine: WholeSide;
  base: WholeSide;
  mineDirty: ReadonlySet<string>;
  resync: boolean;
  newId: () => string;
  copyAuthorName?: string;
  /** True when every file the item names is already stored on this device. */
  hasFiles: (item: FeedWholeItem) => boolean;
}): { changes: PulledWholeChanges; notice: MergeNotice | null } {
  const { mine } = input;
  const result = mergeWholeItems(
    buildWholeFeedMergeSides({
      items: input.items.map((entry) => entry.item),
      tombstones: input.tombstoneIds.map((id) => ({ id })),
      mine,
      base: input.base,
      mineDirty: input.mineDirty,
      resync: input.resync,
    }),
    {
      copyAuthorName: input.copyAuthorName ?? "this device",
      newId: input.newId,
    },
  );
  const fed = new Map(input.items.map((entry) => [entry.item.id, entry]));
  const writes: PulledWholeChanges["writes"] = [];
  const changed = new Set<string>();
  for (const [id, merged] of Object.entries(result.items)) {
    const entry = fed.get(id);
    const local = mine[id];
    const differs = !local || !equalWholeContent(local, merged);
    if (differs) changed.add(id);
    // Only what the feed brought is written; a kept local item is left alone.
    if (entry && entry.item === merged && (differs || !input.hasFiles(entry))) {
      writes.push({ item: merged, assets: entry.assets });
    }
  }
  const deletes = result.deletes.filter((id) => mine[id]);
  for (const id of deletes) changed.add(id);
  const copies = result.copies.map((copy, index) => ({
    copy,
    fromId: result.summary.copies[index].originalId,
  }));
  const names = result.summary.copies.map(
    ({ originalId }) => mine[originalId]?.name ?? originalId,
  );
  return {
    changes: { copies, writes, deletes },
    notice:
      changed.size > 0 || names.length > 0
        ? { merged: changed.size, copies: names }
        : null,
  };
}
