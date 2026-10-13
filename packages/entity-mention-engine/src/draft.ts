import type { EntityLike, Mention, Trigger } from "./types";

/** A mention is valid only while its range still reads `@displayName`. */
function isIntact(text: string, mention: Mention): boolean {
  if (mention.start < 0 || mention.end > text.length) return false;
  if (mention.end <= mention.start) return false;
  return text.slice(mention.start, mention.end) === `@${mention.displayName}`;
}

/**
 * Keeps mentions valid after an edit. Works out the single changed region by
 * comparing the common prefix and suffix. Mentions before it stay put, mentions
 * after it shift by the length change, and any mention touched by the edit is
 * dropped (clarification Q3: an edited token becomes plain text).
 */
export function reconcile(
  prev: string,
  next: string,
  mentions: Mention[],
): Mention[] {
  let prefix = 0;
  const maxPrefix = Math.min(prev.length, next.length);
  while (prefix < maxPrefix && prev[prefix] === next[prefix]) prefix++;

  let suffix = 0;
  const maxSuffix = maxPrefix - prefix;
  while (
    suffix < maxSuffix &&
    prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix++;
  }

  const oldEnd = prev.length - suffix;
  const delta = next.length - prev.length;
  const result: Mention[] = [];

  for (const mention of mentions) {
    let shifted: Mention | null = null;
    if (mention.end <= prefix) {
      shifted = mention;
    } else if (mention.start >= oldEnd) {
      shifted = {
        ...mention,
        start: mention.start + delta,
        end: mention.end + delta,
      };
    }
    if (shifted && isIntact(next, shifted)) result.push(shifted);
  }
  return result;
}

/**
 * Returns only the mentions that are still valid for this text, sorted and
 * without overlaps. Safe to store with a message.
 */
export function serialize(mentions: Mention[], text: string): Mention[] {
  const sorted = [...mentions].sort((a, b) => a.start - b.start);
  const kept: Mention[] = [];
  let lastEnd = -1;
  for (const mention of sorted) {
    if (mention.start < lastEnd) continue;
    if (!isIntact(text, mention)) continue;
    kept.push(mention);
    lastEnd = mention.end;
  }
  return kept;
}

export interface SelectionResult {
  text: string;
  mentions: Mention[];
  caret: number;
}

/**
 * Replaces the active `@query` with the chosen entity's full name, followed by
 * a space, and records the mention. If the trigger no longer matches the text
 * (the user kept typing or the text changed), nothing is applied.
 */
export function applySelection(
  text: string,
  trigger: Trigger,
  entity: EntityLike,
  mentions: Mention[],
): SelectionResult {
  const stale = text.slice(trigger.start, trigger.end) !== `@${trigger.query}`;
  if (stale) return { text, mentions, caret: trigger.end };

  const token = `@${entity.title} `;
  const nextText =
    text.slice(0, trigger.start) + token + text.slice(trigger.end);
  const delta = token.length - (trigger.end - trigger.start);

  const shifted: Mention[] = mentions
    .filter((m) => m.end <= trigger.start || m.start >= trigger.end)
    .map((m) =>
      m.start >= trigger.end
        ? { ...m, start: m.start + delta, end: m.end + delta }
        : m,
    );

  const added: Mention = {
    entityId: entity.id,
    displayName: entity.title,
    entityType: entity.type ?? "",
    start: trigger.start,
    end: trigger.start + token.length - 1,
  };

  return {
    text: nextText,
    mentions: [...shifted, added].sort((a, b) => a.start - b.start),
    caret: trigger.start + token.length,
  };
}
