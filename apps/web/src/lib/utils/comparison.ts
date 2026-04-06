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

/**
 * Optimized deep equality check for Entity["metadata"] objects.
 * Avoids JSON.stringify allocation overhead in hot loops (e.g., graph sync).
 */
export function isEntityMetadataEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const aIsObject = typeof a === "object" && a !== null;
  const bIsObject = typeof b === "object" && b !== null;

  if (aIsObject && bIsObject) {
    // Handle Date objects explicitly: Object.keys(new Date()) === [] so two
    // distinct Date instances would otherwise always compare as equal.
    if (a instanceof Date || b instanceof Date) {
      if (!(a instanceof Date) || !(b instanceof Date)) return false;
      return a.getTime() === b.getTime();
    }

    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
        return false;
      for (let i = 0; i < a.length; i++) {
        if (!isEntityMetadataEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) return false;

    for (let i = 0; i < aKeys.length; i++) {
      const key = aKeys[i];
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!isEntityMetadataEqual(a[key], b[key])) return false;
    }

    return true;
  }

  return a === b;
}
