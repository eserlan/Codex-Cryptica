/**
 * Lore delta tracking + interaction input building for the Gemini Interactions
 * API flow. Pure, framework-agnostic logic (library-first): no Svelte runes, no
 * DOM, no event bus — safe to bundle into the oracle Web Worker.
 *
 * When oracle chat runs through the proxy with server-side conversation state
 * (`previous_interaction_id`), lore is delivered as user `input` turns that
 * Gemini retains as history. We therefore only (re)send lore the server hasn't
 * seen. See docs/adr/018-oracle-server-side-conversation-state.md.
 */

/** A single lore record retrieved for a turn. Canonical shape lives in schema. */
import type { LoreContextEntry as LoreEntry } from "schema";
export type { LoreEntry };

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
export function entityContentHash(str: string): string {
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

const TITLE_RE = /^---\s*(?:\[ACTIVE FILE\]\s*)?File:\s*(.+?)\s*---/m;

/** Best-effort extraction of a record's title from its snippet header. */
function titleOf(entry: LoreEntry): string | null {
  if (entry.id === "__style__") return null;
  const m = TITLE_RE.exec(entry.snippet);
  return m ? m[1] : null;
}

/**
 * Build the `input` for an interaction turn: the user query, the new/changed
 * lore snippets, and a lightweight relevance hint naming unchanged-but-relevant
 * records (whose bodies the server already holds).
 */
export function buildInteractionInput(
  query: string,
  partition: LorePartition,
): string {
  const blocks: string[] = [];

  if (partition.newOrChanged.length > 0) {
    blocks.push(
      "[VAULT LORE CONTEXT]\n" +
        partition.newOrChanged.map((e) => e.snippet).join("\n\n"),
    );
  }

  const hintTitles = partition.unchanged
    .map(titleOf)
    .filter((t): t is string => !!t);
  if (hintTitles.length > 0) {
    blocks.push(
      `[RELEVANT EARLIER RECORDS] ${hintTitles.join(", ")} (retained from prior turns).`,
    );
  }

  blocks.push(`[USER QUERY]\n${query}`);
  return blocks.join("\n\n");
}
