import { load } from "js-yaml";
import type { BlogArticle } from "./types.js";

export function parseBlogArticle(
  path: string,
  rawContent: string,
): BlogArticle | null {
  // Regex to extract frontmatter block (YAML) and content
  const frontmatterRegex =
    /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;
  const match = rawContent.match(frontmatterRegex);

  if (!match) {
    console.warn(`Missing frontmatter in blog article: ${path}`);
    return null;
  }

  const [_fullMatch, yaml, content] = match;

  try {
    const metadata = load(yaml) as Record<string, any>;

    if (!metadata.id || !metadata.slug) {
      console.warn(
        `Missing 'id' or 'slug' in frontmatter for blog article: ${path}`,
      );
      return null;
    }

    return {
      id: metadata.id,
      slug: metadata.slug,
      title: metadata.title || "Untitled",
      description: metadata.description || "",
      keywords: metadata.keywords || [],
      publishedAt: metadata.publishedAt || "2026-02-28T00:00:00Z",
      content: content ? content.trim() : "",
    };
  } catch (e) {
    console.warn(`Failed to parse frontmatter for ${path}:`, e);
    return null;
  }
}
