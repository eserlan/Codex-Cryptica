/**
 * Extracts bolded terms from markdown content that are not already enclosed within links.
 *
 * Supports both **bold** and __bold__ syntax.
 * If a text is inside a markdown link (e.g. [**text**](url) or **[text](url)**), it will be ignored.
 *
 * @param markdown The raw markdown content
 * @param existingEntityTitles A set of existing entity titles for exclusion filtering
 * @returns Array of unique proposed entity titles
 */
export function extractProposals(
  markdown: string,
  existingEntityTitles: Set<string> = new Set(),
): string[] {
  if (!markdown) return [];

  // Find all text that is already used as a link label: [text](url)
  const linkRegex = /\[([^\]]+)\]\([^)]+\)/g;
  let linkMatch;
  const linkedTerms = new Set<string>();
  while ((linkMatch = linkRegex.exec(markdown)) !== null) {
    const term = linkMatch[1]
      .replace(/\*\*|__/g, "")
      .trim()
      .toLowerCase();
    if (term.length > 0) {
      linkedTerms.add(term);
    }
  }

  // Remove all markdown links [text](url) from the content
  // This ensures we don't extract bold text from inside a link (e.g. [**text**](url))
  // or a link that is bolded (e.g. **[text](url)** will become just **** which won't match our bold extraction).
  const textWithoutLinks = markdown.replace(linkRegex, "");

  // Match bold patterns: **text** or __text__
  const boldRegex = /(?:\*\*|__)(.+?)(?:\*\*|__)/g;

  const proposals = new Set<string>();
  const seenLower = new Set<string>();
  let match;

  while ((match = boldRegex.exec(textWithoutLinks)) !== null) {
    const term = match[1].trim();
    if (term.length > 0) {
      const lower = term.toLowerCase();
      if (!seenLower.has(lower)) {
        seenLower.add(lower);
        proposals.add(term);
      }
    }
  }

  // Filter out existing entities and any terms that are already linked in the document (case insensitive match)
  const existingLower = new Set([
    ...Array.from(existingEntityTitles).map((t) => t.toLowerCase()),
    ...Array.from(linkedTerms),
  ]);

  return Array.from(proposals).filter(
    (term) => !existingLower.has(term.toLowerCase()),
  );
}
