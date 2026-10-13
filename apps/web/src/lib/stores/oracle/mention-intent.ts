import {
  collectPinnedIds,
  resolve,
  type MentionSource,
  type ResolvedMention,
} from "entity-mention-engine";
import type { MessageMention } from "@codex/oracle-engine";

export interface PreparedMentions {
  /** Mentions that resolved to a visible entity, safe to store on the message. */
  mentions: MessageMention[];
  /** Unique resolved entity ids to pin into retrieval. */
  pinnedEntityIds: string[];
}

/**
 * Re-checks every mention against the Vault at send time. Draft mentions and
 * typed `@name` text are both resolved here, so a pasted id for a hidden or
 * other-Vault entity is never trusted (#4052). Ambiguous and unmatched results
 * are not attached.
 */
export function prepareMentions(
  content: string,
  draft: MessageMention[],
  source: MentionSource,
): PreparedMentions {
  const results = resolve(content, draft, source);
  const mentions: MessageMention[] = [];
  for (const r of results) {
    if (r.status !== "resolved" || !r.entityId) continue;
    mentions.push({
      entityId: r.entityId,
      displayName: r.displayName,
      entityType: r.entityType ?? "",
      start: r.start ?? 0,
      end: r.end ?? 0,
    });
  }
  return { mentions, pinnedEntityIds: collectPinnedIds(results) };
}

export interface MentionSendPlan {
  /** An untracked `@name` with several candidates. Sending waits for a choice. */
  ambiguous?: ResolvedMention;
  /** An untracked `@name` that matched nothing. It is sent as written. */
  unmatched?: ResolvedMention;
}

/** Works out what the composer must ask before sending a plain question. */
export function planMentionSend(
  query: string,
  draft: MessageMention[],
  source: MentionSource,
): MentionSendPlan {
  const results = resolve(query, draft, source);
  return {
    ambiguous: results.find((r) => r.status === "ambiguous"),
    unmatched: results.find((r) => r.status === "unmatched"),
  };
}
