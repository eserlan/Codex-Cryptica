import type { RandomSource, TableEntry } from "./types";
import { weightsOf } from "./selection";

/**
 * Weighted ↔ ranged conversion (FR-004a).
 *
 * Both directions are total and lossless: a weight becomes a range width and
 * back again, so a user can flip a table's mode without losing the shape of
 * its distribution.
 */

export function toRanged(source: RandomSource): RandomSource {
  if (source.selection?.mode === "ranged") return source;

  const entries = source.entries ?? [];
  const weights = weightsOf(entries);
  let cursor = 1;
  const converted: TableEntry[] = entries.map((entry, i) => {
    const width = weights[i];
    const range = { min: cursor, max: cursor + width - 1 };
    cursor += width;
    const { weight: _weight, ...rest } = entry;
    return { ...rest, range };
  });

  const sides = weights.reduce((a, b) => a + b, 0);
  return {
    ...source,
    selection: { mode: "ranged", die: { sides: Math.max(sides, 1) } },
    entries: converted,
  };
}

export function toWeighted(source: RandomSource): RandomSource {
  if (source.selection?.mode !== "ranged") return source;

  const converted: TableEntry[] = (source.entries ?? []).map((entry) => {
    const width = entry.range ? entry.range.max - entry.range.min + 1 : 1;
    const { range: _range, ...rest } = entry;
    return { ...rest, weight: Math.max(width, 1) };
  });

  return { ...source, selection: { mode: "weighted" }, entries: converted };
}
