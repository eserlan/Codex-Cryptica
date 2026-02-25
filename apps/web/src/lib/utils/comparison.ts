import type { TemporalMetadata } from "schema";

/**
 * Optimized equality check for TemporalMetadata objects.
 * Avoids JSON.stringify allocation overhead in hot loops (e.g., graph sync).
 */
export function isTemporalMetadataEqual(
  a: TemporalMetadata | undefined | null,
  b: TemporalMetadata | undefined | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    // NOTE: If TemporalMetadata schema changes, update this comparison.
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.label === b.label
  );
}
