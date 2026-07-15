import type { Entity } from "schema";

/**
 * Structural children of `id`, reading both directions:
 * `id parent_of X`, or `X child_of id`. Not filtered by category — cycle
 * detection is about ancestry structure, not display.
 */
function childIdsOf(entities: Record<string, Entity>, id: string): string[] {
  const out = new Set<string>();

  const self = entities[id];
  if (self) {
    for (const c of self.connections ?? []) {
      if (c.type === "parent_of") out.add(c.target);
    }
  }

  for (const [otherId, other] of Object.entries(entities)) {
    for (const c of other.connections ?? []) {
      if (c.type === "child_of" && c.target === id) {
        out.add(otherId);
        break;
      }
    }
  }

  return [...out];
}

/**
 * True if adding "proposedParentId is parent of childId" would create circular
 * ancestry — i.e. the proposed parent is the child itself or already a
 * descendant of the child. Terminates on already-cyclic/malformed input via a
 * visited set. Pure: does not mutate `entities`.
 */
export function wouldCreateCycle(
  entities: Record<string, Entity>,
  childId: string,
  proposedParentId: string,
): boolean {
  if (proposedParentId === childId) return true;

  const visited = new Set<string>();
  const stack: string[] = [childId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const kid of childIdsOf(entities, current)) {
      if (kid === proposedParentId) return true;
      if (!visited.has(kid)) stack.push(kid);
    }
  }

  return false;
}
