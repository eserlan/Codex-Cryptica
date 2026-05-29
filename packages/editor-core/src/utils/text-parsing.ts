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

  // Remove all markdown links [text](url) from the content
  // This ensures we don't extract bold text from inside a link (e.g. [**text**](url))
  // or a link that is bolded (e.g. **[text](url)** will become just **** which won't match our bold extraction).
  const textWithoutLinks = markdown.replace(/\[([^\]]+)\]\([^)]+\)/g, "");

  // Match bold patterns: **text** or __text__
  const boldRegex = /(?:\*\*|__)(.+?)(?:\*\*|__)/g;

  const proposals = new Set<string>();
  let match;

  while ((match = boldRegex.exec(textWithoutLinks)) !== null) {
    const term = match[1].trim();
    if (term.length > 0) {
      proposals.add(term);
    }
  }

  // Filter out existing entities (case insensitive match)
  const existingLower = new Set(
    Array.from(existingEntityTitles).map((t) => t.toLowerCase()),
  );

  return Array.from(proposals).filter(
    (term) => !existingLower.has(term.toLowerCase()),
  );
}
