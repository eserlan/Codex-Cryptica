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
  "about", "after", "again", "also", "among", "could", "describe", "does",
  "explain", "from", "give", "have", "into", "know", "more", "much",
  "please", "show", "some", "tell", "than", "that", "them", "then",
  "there", "these", "they", "this", "those", "their", "what", "when",
  "where", "which", "while", "will", "with", "would", "your", "were",
  "many", "might", "whom", "whose", "just", "the", "and", "was", "are", "for", "who", "how", "why", "had",
]);

const words = (text: string): string[] =>
  text.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];

export function isUnrelatedSuggestedSearch(
  query: string,
  results: readonly { id: string }[],
  vault: Pick<VaultMinimal, "entities">,
): boolean {
  if (!results.length) return false;

  const meaningful = [...new Set(words(query))].filter(
    (word) => !COMMON_QUERY_WORDS.has(word),
  );
  // Unknown one-word subjects, grammatical follow-ups and natural-language
  // creativity prompts need more context; don't auto-reject them.
  if (meaningful.length < 2) return false;

  for (const result of results) {
    const entity = vault.entities[result.id];
    if (!entity) continue;
    const metadata = entity.metadata && typeof entity.metadata === "object"
      ? Object.values(entity.metadata).flat().join(" ")
      : "";
    const candidateWords = new Set(words([
      entity.title,
      ...(entity.aliases || []),
      entity.content,
      entity.lore,
      ...(entity.labels || []),
      ...((entity as typeof entity & { tags?: string[] }).tags || []),
      metadata,
    ].filter(Boolean).join(" ")));
    if (meaningful.some((word) => candidateWords.has(word))) return false;
  }

  return true;
}
