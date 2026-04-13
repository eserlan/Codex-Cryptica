/**
 * front-page-context.ts
 *
 * Builds retrieved world context for AI generation flows.
 *
 * Deduplication strategy: content-level dedup via normalised string comparison.
 * The two retrieval queries can return overlapping text; after gathering all
 * parts we normalise each string (trim + lowercase), then filter out exact
 * duplicates before joining. This is more reliable than a plain `new Set()`
 * over the raw strings because it also deduplicates values that differ only
 * by surrounding whitespace or casing.
 */

import { contextRetrievalService } from "$lib/services/ai/context-retrieval.service";

/** Minimal interface matching the vault store subset used by context retrieval. */
interface VaultLike {
  allEntities: Array<{ id?: string }>;
  entities: Record<
    string,
    { title?: string; content?: string; chronicle?: string }
  >;
  loadEntityContent?: (id: string) => Promise<void>;
}

export interface RetrievedContextResult {
  content: string;
  /** Non-empty when an error was silently logged for developer awareness. */
  devWarning?: string;
}

/**
 * Build context from retrieval queries plus frontpage entity snippets.
 *
 * Deduplication: after gathering all parts, we normalise (trim + lowercase)
 * and keep only the first occurrence of each unique normalised string.
 */
export async function buildRetrievedWorldContext(
  vault: VaultLike,
  worldName: string,
  themeName: string,
  frontpageEntityId: string | undefined,
  frontpageEntityContext: string,
  isImage = false,
): Promise<RetrievedContextResult> {
  const worldRef = worldName.trim();
  const themeRef = themeName.trim();
  const baseTerms = [worldRef, themeRef].filter(Boolean).join(" ").trim();
  const queries = [
    `${baseTerms} setting world overview premise tone central conflict`,
    `${baseTerms} major players factions antagonists allies plot hooks current threats`,
  ];

  try {
    const retrievedParts = await Promise.all(
      queries.map(async (query) => {
        const retrieved = await contextRetrievalService.retrieveContext(
          query,
          new Set<string>(),
          vault,
          frontpageEntityId,
          isImage,
        );
        return retrieved.content.trim();
      }),
    );

    // Deduplicate by normalised content (trim + lowercase)
    const seen = new Set<string>();
    const uniqueParts: string[] = [];

    for (const part of [...retrievedParts, frontpageEntityContext]) {
      const normalised = part.trim().toLowerCase();
      if (normalised && !seen.has(normalised)) {
        seen.add(normalised);
        uniqueParts.push(part.trim());
      }
    }

    return { content: uniqueParts.join("\n\n") };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Log a dev warning so degradation is observable during development,
    // but return empty context so the AI flow can still proceed (with less context).
    console.warn(
      "[front-page-context] Context retrieval failed; returning empty context.",
      message,
    );
    return {
      content: "",
      devWarning: `Context retrieval failed: ${message}`,
    };
  }
}
