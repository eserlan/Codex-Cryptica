import { serialize } from "./draft";
import type { Mention } from "./types";

export type MentionSegment =
  | { kind: "text"; text: string }
  | {
      kind: "mention";
      entityId: string;
      displayName: string;
      start: number;
      end: number;
    };

/**
 * Splits stored message text into plain and mention parts, for rendering.
 * Mentions whose text no longer matches are shown as plain text, so an edited
 * or tampered record cannot render a link to the wrong place.
 */
export function segmentText(
  text: string,
  mentions: Mention[],
): MentionSegment[] {
  const valid = serialize(mentions, text);
  const segments: MentionSegment[] = [];
  let cursor = 0;

  for (const mention of valid) {
    if (mention.start > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, mention.start) });
    }
    segments.push({
      kind: "mention",
      entityId: mention.entityId,
      displayName: mention.displayName,
      start: mention.start,
      end: mention.end,
    });
    cursor = mention.end;
  }

  if (cursor < text.length) {
    segments.push({ kind: "text", text: text.slice(cursor) });
  }
  return segments;
}
