import type { PerformanceOperationHandle } from "@codex/performance-observability";
import type { LocalEntity } from "./types";
import type { EntityMutationContext } from "./entity-mutation-context";
import type { BulkMutationResult } from "./bulk-results";

export function hasLongFormUpdate(patch: Partial<LocalEntity>): boolean {
  return patch.content !== undefined || patch.lore !== undefined;
}

export function markMutationContentLoaded(
  context: EntityMutationContext,
  id: string,
  entities?: Record<string, LocalEntity>,
): void {
  context.deps.loader.markContentLoaded(id);
  const entity = (entities ?? context.entities)[id];
  if (entity) entity.contentLoaded = true;
}

export function finishBulkMutation(
  span: PerformanceOperationHandle,
  result: BulkMutationResult,
): BulkMutationResult {
  const dimensions = () => ({ changedEntityCount: result.succeededIds.length });
  if (result.failedIds.length > 0 || result.cancelledIds.length > 0) {
    span.fail("unexpected", dimensions);
  } else {
    span.complete(dimensions);
  }
  return result;
}
