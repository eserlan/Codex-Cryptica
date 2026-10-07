const MAX_SCENE = 80;

/** The last open map if it still exists, else the first map, else null. */
export function resolveDefaultMap(
  lastMapId: string | null,
  mapIds: readonly string[],
): string | null {
  if (lastMapId !== null && mapIds.includes(lastMapId)) return lastMapId;
  return mapIds[0] ?? null;
}

export function normaliseSceneName(
  input: string,
): { ok: true; name: string } | { ok: false } {
  const name = input.trim().slice(0, MAX_SCENE);
  return name.length === 0 ? { ok: false } : { ok: true, name };
}

/**
 * Empty input repeats the last roll. Returns null when there is nothing
 * to roll.
 */
export function resolveQuickRoll(
  input: string,
  lastRoll: string | null,
): string | null {
  const typed = input.trim();
  if (typed.length > 0) return typed;
  return lastRoll;
}
