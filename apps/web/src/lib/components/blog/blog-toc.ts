import { marked } from "marked";
import { gfmHeadingId, getHeadingList } from "marked-gfm-heading-id";

export interface TocHeading {
  level: number;
  text: string;
  id: string;
}

marked.use(gfmHeadingId());

/**
 * Extracts table of contents headings (h2 and h3) from markdown content.
 * Generates identical anchor IDs to marked-gfm-heading-id used in ArticleRenderer.
 */
export function extractBlogToc(markdown: string): TocHeading[] {
  if (!markdown) return [];
  // Parse to trigger gfmHeadingId renderer hook
  marked.parse(markdown);
  return getHeadingList()
    .filter((h) => h.level === 2 || h.level === 3)
    .map((h) => ({
      level: h.level,
      text: h.text,
      id: h.id,
    }));
}
