import type { Entity } from "schema";
import { sanitizeId } from "$lib/utils/markdown";

/**
 * Everything `entityId` could be nested under: every entity except itself and
 * its own descendants, since nesting a branch inside itself would close the
 * hierarchy into a loop.
 *
 * Ids are compared through `sanitizeId` on both sides, the same way
 * `entityTree` walks the hierarchy — a vault imported with mixed-case ids
 * stores a normalized `parent` but keeps the id it came with.
 *
 * One pass to map children, then one walk down from the subject: O(n), rather
 * than re-walking the ancestor chain once per candidate.
 */
export function buildParentCandidates(
  entityId: string,
  allEntities: Entity[],
): Entity[] {
  const subjectId = sanitizeId(entityId);

  const childrenOf = new Map<string, string[]>();
  for (const entity of allEntities) {
    if (!entity.parent) continue;
    const parentId = sanitizeId(entity.parent);
    const siblings = childrenOf.get(parentId);
    if (siblings) siblings.push(sanitizeId(entity.id));
    else childrenOf.set(parentId, [sanitizeId(entity.id)]);
  }

  const blocked = new Set<string>([subjectId]);
  const queue: string[] = [subjectId];
  while (queue.length > 0) {
    for (const child of childrenOf.get(queue.pop()!) ?? []) {
      // `blocked` doubles as the visited set, so a hierarchy that already
      // contains a loop is walked once instead of spinning forever.
      if (blocked.has(child)) continue;
      blocked.add(child);
      queue.push(child);
    }
  }

  return allEntities.filter((entity) => !blocked.has(sanitizeId(entity.id)));
}
