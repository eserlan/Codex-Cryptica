import type { EntityLike, Mention } from "./types";

/**
 * Finds exact, case-sensitive title occurrences in text the engine did not
 * create a mention for, such as an assistant reply naming a source entity.
 * A title must sit on word boundaries, and a longer title wins where two
 * overlap. Only the given candidates are searched, so nothing is linked unless
 * the caller already chose it as context.
 */
export function linkTitles(text: string, candidates: EntityLike[]): Mention[] {
  const ordered = candidates
    .filter((c) => c.title.trim().length > 0)
    .sort((a, b) => b.title.length - a.title.length);

  const taken: Array<[number, number]> = [];
  const mentions: Mention[] = [];

  for (const candidate of ordered) {
    const title = candidate.title;
    let from = 0;
    while (from <= text.length) {
      const start = text.indexOf(title, from);
      if (start === -1) break;
      const end = start + title.length;
      from = end;
      if (!isWordBounded(text, start, end)) continue;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      mentions.push({
        entityId: candidate.id,
        displayName: title,
        entityType: candidate.type ?? "",
        start,
        end,
      });
    }
  }

  return mentions.sort((a, b) => a.start - b.start);
}

function isWordBounded(text: string, start: number, end: number): boolean {
  const before = start > 0 ? text[start - 1] : "";
  const after = end < text.length ? text[end] : "";
  return !/[\p{L}\p{N}_]/u.test(before) && !/[\p{L}\p{N}_]/u.test(after);
}
