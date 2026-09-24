import type {
  PublicLabelResult,
  SearchablePublicContent,
} from "./labels/aggregate";

export const EXPLORE_SEARCH_LIMIT = 30;

interface IndexedItem {
  result: PublicLabelResult;
  title: string;
  rest: string;
}

export type ExploreSearchIndex = IndexedItem[];

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, " ");

const tokenise = (query: string) =>
  normalise(query)
    .split(/[^a-z0-9&']+/)
    .filter(Boolean);

export function buildExploreSearchIndex(
  content: SearchablePublicContent[],
): ExploreSearchIndex {
  return content.map(({ keywords, ...result }) => ({
    result,
    title: normalise(result.title),
    rest: normalise([result.summary, ...keywords].join(" ")),
  }));
}

/**
 * Every query word must appear somewhere in an item. Items whose title holds
 * every word rank above items matched only through summary, labels or aliases.
 */
export function searchExplore(
  index: ExploreSearchIndex,
  query: string,
  limit = EXPLORE_SEARCH_LIMIT,
): PublicLabelResult[] {
  const tokens = tokenise(query);
  if (tokens.length === 0) return [];

  const titleHits: PublicLabelResult[] = [];
  const otherHits: PublicLabelResult[] = [];

  for (const item of index) {
    if (tokens.every((token) => item.title.includes(token))) {
      titleHits.push(item.result);
    } else if (
      tokens.every(
        (token) => item.title.includes(token) || item.rest.includes(token),
      )
    ) {
      otherHits.push(item.result);
    }
  }

  return [...titleHits, ...otherHits].slice(0, limit);
}
