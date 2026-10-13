/**
 * Answer copy is plain text, but some authored strings cite their sources with
 * markdown-style links: `[Basic Rules](https://www.dndbeyond.com/...)`. Svelte
 * text interpolation would print those verbatim, so the page splits each
 * string into text and link segments and renders the links as anchors.
 *
 * Only absolute http(s) URLs and root-relative site paths become links; any
 * other bracketed text stays as written, so no `javascript:` URL can slip in.
 */
export type InlineSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string; external: boolean };

// A site path is a single "/" — "//host" and "/\host" are protocol-relative
// URLs to another origin, so they must not pass as internal links.
const LINK_PATTERN = /\[([^\]\n]+)\]\(((?:https?:\/\/|\/(?![/\\]))[^)\s]+)\)/g;

export function parseInlineLinks(source: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let cursor = 0;

  for (const match of source.matchAll(LINK_PATTERN)) {
    const [whole, text, href] = match;
    const start = match.index ?? 0;
    if (start > cursor) {
      segments.push({ kind: "text", text: source.slice(cursor, start) });
    }
    segments.push({
      kind: "link",
      text,
      href,
      external: !href.startsWith("/"),
    });
    cursor = start + whole.length;
  }

  if (cursor < source.length) {
    segments.push({ kind: "text", text: source.slice(cursor) });
  }
  return segments;
}
