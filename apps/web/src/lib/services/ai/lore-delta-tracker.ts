/**
 * Lore delta tracking for the Gemini Interactions API flow.
 *
 * When oracle chat runs through the proxy with server-side conversation state
 * (`previous_interaction_id`), lore is delivered as user `input` turns that
 * Gemini retains as history. We therefore only need to (re)send lore that the
 * server hasn't seen yet. This tracker remembers, per conversation, a content
 * hash of every lore record already sent, and partitions the current turn's
 * candidate records into what must be sent versus what can be stripped.
 *
 * State is intentionally in-memory: on reload the conversation restarts, the
 * interaction id is dropped, and lore re-syncs on the first turn. See
 * docs/adr/018-oracle-server-side-conversation-state.md.
 */

/** A single lore record retrieved for a turn. */
export interface LoreEntry {
  /** Entity id, or a synthetic id such as `__style__`. */
  id: string;
  /** The text block to send to the model (may include a stable header). */
  snippet: string;
  /**
   * Hash of the *stable body only* (lore + content + connections), excluding
   * volatile markers like `[ACTIVE FILE]`, so toggling the active file does not
   * force a needless resend.
   */
  hash: string;
}

export interface LorePartition {
  /** Records the server has not seen, or whose body changed since last sent. */
  newOrChanged: LoreEntry[];
  /** Records already present server-side with an identical body. */
  unchanged: LoreEntry[];
}

/**
 * Fast, synchronous, non-cryptographic 53-bit string hash (cyrb53).
 * Adequate for change detection of lore bodies.
 */
export function loreHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export class LoreDeltaTracker {
  /** entityId -> last-sent body hash. */
  private sentLore = new Map<string, string>();

  /** True before any lore has been committed (i.e. a fresh conversation). */
  get isEmpty(): boolean {
    return this.sentLore.size === 0;
  }

  /**
   * Split the current turn's records into those that must be (re)sent and those
   * the server already holds unchanged. Does not mutate tracker state — call
   * {@link commit} after the send succeeds.
   */
  partition(entries: LoreEntry[]): LorePartition {
    const newOrChanged: LoreEntry[] = [];
    const unchanged: LoreEntry[] = [];
    for (const entry of entries) {
      const known = this.sentLore.get(entry.id);
      if (known === entry.hash) {
        unchanged.push(entry);
      } else {
        newOrChanged.push(entry);
      }
    }
    return { newOrChanged, unchanged };
  }

  /** Record that these entries are now present server-side. */
  commit(entries: LoreEntry[]): void {
    for (const entry of entries) {
      this.sentLore.set(entry.id, entry.hash);
    }
  }

  /**
   * Forget a single record so it is re-sent next turn. Used when a vault event
   * signals the entity changed, as a proactive complement to body hashing.
   * Returns true if the record was being tracked.
   */
  evict(id: string): boolean {
    return this.sentLore.delete(id);
  }

  /** Forget everything (new conversation, or interaction id expired/rejected). */
  reset(): void {
    this.sentLore.clear();
  }
}
