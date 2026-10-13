import type { VaultMinimal } from "schema";

/**
 * Defensive check for FlexSearch's suggested hits. Search scores are fixed
 * *field weights*, not calibrated semantic confidence. Only flag a query
 * when it contains several distinctive words and NONE appear in any returned
 * record. It deliberately does not decide that a merely weak or partial match
 * is wrong; that requires a properly calibrated retrieval evaluation.
 *
 * Check the same fields that the local search index indexes, including lore
 * and metadata. Call after lazy-loading record bodies.
 */
const COMMON_QUERY_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "among",
  "could",
  "describe",
  "does",
  "explain",
  "from",
  "give",
  "have",
  "into",
  "know",
  "more",
  "much",
  "please",
  "show",
  "some",
  "tell",
  "than",
  "that",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "their",
  "what",
  "when",
  "where",
  "which",
  "while",
  "will",
  "with",
  "would",
  "your",
  "were",
  "many",
  "might",
  "whom",
  "whose",
  "just",
  "the",
  "and",
  "was",
  "are",
  "for",
  "who",
  "how",
  "why",
  "had",
]);

const words = (text: string): string[] =>
  text.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];

/** Words that sharing this many leading letters count as the same word form. */
const PREFIX_LENGTH = 4;

/** The query's content words, without question and filler words. */
function distinctiveTerms(query: string): string[] {
  return [...new Set(words(query))].filter(
    (word) => !COMMON_QUERY_WORDS.has(word),
  );
}

/**
 * True when the query names at least two content words, so a lack of
 * evidence is meaningful. One-word prompts and chit-chat return false.
 */
export function hasDistinctiveTerms(query: string): boolean {
  return distinctiveTerms(query).length >= 2;
}

/**
 * Exact words plus their leading letters. FlexSearch matches on word starts,
 * so "dragons" must count as evidence for "dragon" and "guard" for "guards".
 * Short words (three letters) still need an exact match.
 */
function evidenceKeys(text: string): Set<string> {
  const keys = new Set<string>();
  for (const word of words(text)) {
    keys.add(word);
    if (word.length >= PREFIX_LENGTH)
      keys.add(`^${word.slice(0, PREFIX_LENGTH)}`);
  }
  return keys;
}

function hasEvidence(word: string, keys: Set<string>): boolean {
  if (keys.has(word)) return true;
  return (
    word.length >= PREFIX_LENGTH && keys.has(`^${word.slice(0, PREFIX_LENGTH)}`)
  );
}

export function isUnrelatedSuggestedSearch(
  query: string,
  results: readonly { id: string }[],
  vault: Pick<VaultMinimal, "entities">,
): boolean {
  if (!results.length) return false;

  const meaningful = distinctiveTerms(query);
  // Unknown one-word subjects, grammatical follow-ups and natural-language
  // creativity prompts need more context; don't auto-reject them.
  if (meaningful.length < 2) return false;

  for (const result of results) {
    const entity = vault.entities[result.id];
    if (!entity) continue;
    const metadata =
      entity.metadata && typeof entity.metadata === "object"
        ? Object.values(entity.metadata).flat().join(" ")
        : "";
    const keys = evidenceKeys(
      [
        entity.title,
        ...(entity.aliases || []),
        entity.content,
        entity.lore,
        ...(entity.labels || []),
        ...((entity as typeof entity & { tags?: string[] }).tags || []),
        metadata,
      ]
        .filter(Boolean)
        .join(" "),
    );
    if (meaningful.some((word) => hasEvidence(word, keys))) return false;
  }

  return true;
}
