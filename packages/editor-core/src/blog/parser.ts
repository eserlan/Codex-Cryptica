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

    if (
      (typeof publishedAt !== "string" && !(publishedAt instanceof Date)) ||
      Number.isNaN(
        publishedAt instanceof Date
          ? publishedAt.getTime()
          : Date.parse(publishedAt),
      )
    ) {
      console.error(
        `Missing or invalid 'publishedAt' in frontmatter for blog article: ${path}`,
      );
      return null;
    }

    const finalPublishedAt =
      publishedAt instanceof Date ? publishedAt.toISOString() : publishedAt;

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
