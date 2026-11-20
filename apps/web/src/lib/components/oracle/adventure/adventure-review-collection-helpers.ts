import type { AdventureJsonUnresolved } from "@codex/adventure-engine";

export function countUnresolvedByEntityId(
  unresolved: readonly AdventureJsonUnresolved[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of unresolved) {
    if (item.relatedEntityId) {
      map.set(item.relatedEntityId, (map.get(item.relatedEntityId) ?? 0) + 1);
    }
  }
  return map;
}

export function snippetTitle(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return trimmed.length > 72 ? `${trimmed.slice(0, 72).trimEnd()}…` : trimmed;
}
