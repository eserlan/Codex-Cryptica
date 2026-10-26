import type { LocalEntity } from "$lib/stores/vault/types";

type PositionUpdates = Record<string, Partial<LocalEntity>>;

/**
 * Whether an entity already has a saved graph position. Mirrors the
 * transformer's rule for using saved coordinates: finite `x` and `y`.
 */
export function hasSavedPosition(entity: unknown): boolean {
  const coords = (
    entity as { metadata?: { coordinates?: { x?: unknown; y?: unknown } } }
  )?.metadata?.coordinates;
  return (
    typeof coords?.x === "number" &&
    typeof coords?.y === "number" &&
    Number.isFinite(coords.x) &&
    Number.isFinite(coords.y)
  );
}

/**
 * The subset of a layout's position updates for entities with no saved
 * position yet.
 *
 * Saving these is always safe: it fills in positions the vault never had, so
 * the next load can reuse them instead of solving the layout again. Without
 * it, a vault shown in focus view never kept its layout and re-ran a full
 * randomised solve — and landed differently — on every load. Entities that
 * already have a position keep it, so a partial or randomised solve never
 * overwrites a layout the user arranged.
 */
export function unsavedPositionUpdates(
  updates: PositionUpdates,
  getEntity: (id: string) => unknown,
): PositionUpdates {
  const unsaved: PositionUpdates = {};
  for (const [id, update] of Object.entries(updates)) {
    const entity = getEntity(id);
    if (entity && !hasSavedPosition(entity)) unsaved[id] = update;
  }
  return unsaved;
}
