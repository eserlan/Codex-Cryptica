import { list, record, text, type Obj } from "./mystery-obj";

export const hasText = (value: unknown): boolean => text(value).length > 0;
export const missing = (value: Obj, keys: readonly string[]): string[] =>
  keys
    .filter((key) => !hasText(value[key]))
    .map((key) => `"${key}" is missing`);
export const uniqueIds = (items: unknown[]): string[] =>
  items.map((item) => text(record(item).id));
export const hasCrossGroupIdCollision = (...groups: string[][]): boolean => {
  const seen = new Set<string>();
  for (const id of groups.flat()) {
    if (!id) continue;
    if (seen.has(id)) return true;
    seen.add(id);
  }
  return false;
};

/** Every id the case defines so far, for spotting prose that points at nothing. */
export const knownIds = (
  foundation: Obj,
  cast: Obj,
  clueIds: readonly string[] = [],
): string[] => [
  ...uniqueIds(list(foundation.revelations)),
  ...uniqueIds(list(cast.suspects)),
  ...uniqueIds(list(cast.locations)),
  ...clueIds,
];

/** Preserve field order so repair feedback remains stable across stages. */
export function missingFields(
  items: Obj[],
  fields: readonly string[],
  label: string,
): string[] {
  return items.flatMap((item, index) =>
    fields
      .filter((field) => !hasText(item[field]))
      .map((field) => `${label} ${index + 1} has no ${field}`),
  );
}

export const hasUniqueIds = (ids: readonly string[]): boolean =>
  !ids.some((id) => !id) && new Set(ids).size === ids.length;
