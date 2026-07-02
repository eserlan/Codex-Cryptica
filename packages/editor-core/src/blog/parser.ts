import { load } from "js-yaml";
import type { BlogArticle } from "./types";

export function parseBlogArticle(
  path: string,
  rawContent: string,
): BlogArticle | null {
  // Robust regex for frontmatter extraction
  // Matches --- [whitespace] [newline] [yaml] [newline] --- [whitespace] [newline] [content]
  const match = rawContent.match(
    /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*([\s\S]*)$/,
  );

  if (!match) {
    console.error(`Missing frontmatter in blog article: ${path}`);
    return null;
  }

  const yaml = match[1];
  const content = match[2].trim();

  try {
    const metadata = load(yaml) as any;

    if (!metadata || typeof metadata !== "object") {
      console.error(`Invalid frontmatter in blog article: ${path}`);
      return null;
    }

    if (!metadata.id || !metadata.slug) {
      console.error(
        `Missing 'id' or 'slug' in frontmatter for blog article: ${path}`,
      );
      return null;
    }

    const { title, description, keywords, publishedAt } = metadata;

    if (typeof title !== "string" || title.trim() === "") {
      console.error(
        `Missing or invalid 'title' in frontmatter for blog article: ${path}`,
      );
      return null;
    }

    if (typeof description !== "string" || description.trim() === "") {
      console.error(
        `Missing or invalid 'description' in frontmatter for blog article: ${path}`,
      );
      return null;
    }

    if (
      !Array.isArray(keywords) ||
      keywords.length === 0 ||
      !keywords.every((k) => typeof k === "string" && k.trim() !== "")
    ) {
      console.error(
        `Missing or invalid 'keywords' in frontmatter for blog article: ${path}`,
      );
      return null;
    }

    if (typeof publishedAt !== "string" && !(publishedAt instanceof Date)) {
      console.error(
        `Missing or invalid 'publishedAt' in frontmatter for blog article: ${path}`,
      );
      return null;
    }

    // Normalize explicitly instead of relying on the YAML parser having
    // already coerced this into a Date (js-yaml's implicit timestamp
    // resolution isn't something to depend on staying consistent across
    // versions/environments) -- always parse and re-serialize ourselves.
    const publishedAtDate = new Date(publishedAt as string | Date);
    if (Number.isNaN(publishedAtDate.getTime())) {
      console.error(
        `Missing or invalid 'publishedAt' in frontmatter for blog article: ${path}`,
      );
      return null;
    }

    const finalPublishedAt = publishedAtDate.toISOString();

    return {
      id: String(metadata.id),
      slug: String(metadata.slug),
      title,
      description,
      keywords,
      publishedAt: finalPublishedAt,
      content,
    };
  } catch (e) {
    console.error(`Failed to parse frontmatter for ${path}:`, e);
    return null;
  }
}
