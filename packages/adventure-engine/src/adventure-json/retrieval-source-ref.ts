import type { SourceReference } from "./schema";
import type { AdventureJsonExcerpt } from "./retrieval-types";

export function boundSourceRef(
  sourceRef: SourceReference | undefined,
  cap: number,
): SourceReference | undefined {
  if (sourceRef === undefined) return undefined;
  // `chapter`, `section`, `anchor`, and `textQuote` have no schema-level
  // length limit. Bound them before JSON.stringify so oversized metadata
  // cannot stall serialisation. `textQuote` uses `cap / 8` (room for JSON
  // escaping) so it can be clipped in place; the other fields use `cap + 1`
  // so oversized values still exceed the budget and get dropped cleanly.
  const boundedFields = boundLongSourceFields(sourceRef, cap + 1);
  const boundedQuote = boundSourceQuote(sourceRef, Math.floor(cap / 8));
  if (boundedQuote === undefined) return boundedFields ?? sourceRef;
  return { ...(boundedFields ?? sourceRef), textQuote: boundedQuote };
}

function boundLongSourceFields(
  sourceRef: SourceReference,
  limit: number,
): SourceReference | undefined {
  let bounded: SourceReference | undefined;
  for (const key of ["chapter", "section", "anchor"] as const) {
    const value = sourceRef[key];
    if (value === undefined || value.length <= limit) continue;
    bounded ??= { ...sourceRef };
    bounded[key] = value.slice(0, limit);
  }
  return bounded;
}

function boundSourceQuote(
  sourceRef: SourceReference,
  limit: number,
): string | undefined {
  const quote = sourceRef.textQuote;
  return quote !== undefined && quote.length > limit + 1
    ? quote.slice(0, limit + 1)
    : undefined;
}

export function withoutTextQuote(
  sourceRef: SourceReference,
): SourceReference | undefined {
  if (sourceRef.textQuote === undefined) return sourceRef;
  const { textQuote: _textQuote, ...safeSourceRef } = sourceRef;
  void _textQuote;
  return Object.keys(safeSourceRef).length ? safeSourceRef : undefined;
}

export function boundSourceRefQuote(
  excerpt: AdventureJsonExcerpt,
  maxCharacters: number,
): { excerpt: AdventureJsonExcerpt; truncated: boolean } {
  const quote = excerpt.sourceRef?.textQuote;
  const limit = Math.floor(maxCharacters / 8);
  if (quote === undefined || quote.length <= limit) {
    return { excerpt, truncated: false };
  }
  return {
    excerpt: {
      ...excerpt,
      sourceRef: { ...excerpt.sourceRef!, textQuote: quote.slice(0, limit) },
    },
    truncated: true,
  };
}
