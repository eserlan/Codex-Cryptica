import { load } from "js-yaml";
import {
  parseBlogArticle,
  type BlogArticle,
  type BlogIndexItem,
} from "editor-core";

export interface HelpArticle {
  id: string;
  title: string;
  tags: string[];
  content: string;
  rank?: number;
  hidden?: boolean;
}

export function parseHelpArticle(
  path: string,
  rawContent: string,
): HelpArticle | null {
  // Regex to extract frontmatter block (YAML) and content
  // Matches --- at start, followed by yaml block, then ---, then content
  const frontmatterRegex =
    /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;
  const match = rawContent.match(frontmatterRegex);

  if (!match) {
    console.warn(`Missing frontmatter in help article: ${path}`);
    return null;
  }

  const [_fullMatch, yaml, content] = match;

  try {
    const metadata = load(yaml) as Record<string, any>;

    if (!metadata.id) {
      console.warn(`Missing 'id' in frontmatter for help article: ${path}`);
      return null;
    }

    return {
      id: metadata.id,
      title: metadata.title || "Untitled",
      tags: metadata.tags || [],
      rank: metadata.rank,
      hidden: metadata.hidden === true,
      content: content ? content.trim() : "",
    };
  } catch (e) {
    console.warn(`Failed to parse frontmatter for ${path}:`, e);
    return null;
  }
}

export function processHelpArticles(
  modules: Record<string, any>,
): HelpArticle[] {
  const articleMap = new Map<string, HelpArticle>();
  const paths = Object.keys(modules).sort();

  for (const path of paths) {
    const rawContent = modules[path] as string;
    const article = parseHelpArticle(path, rawContent);

    if (article) {
      if (articleMap.has(article.id)) {
        console.warn(
          `Duplicate help article ID found: ${article.id}. Overwriting with content from ${path}.`,
        );
      }
      articleMap.set(article.id, article);
    }
  }

  return Array.from(articleMap.values())
    .filter((a) => !a.hidden)
    .sort((a, b) => {
      const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;

      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.title.localeCompare(b.title);
    });
}

export function loadHelpArticles(): HelpArticle[] {
  const modules = import.meta.glob("./help/*.md", {
    eager: true,
    query: "?raw",
    import: "default",
  });

  return processHelpArticles(modules);
}

const blogModules = import.meta.glob("./blog/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

let cachedArticles: BlogArticle[] | null = null;

export function loadBlogArticles(): BlogArticle[] {
  if (cachedArticles) return cachedArticles;

  const articles: BlogArticle[] = [];
  const paths = Object.keys(blogModules).sort();

  for (const path of paths) {
    const rawContent = blogModules[path] as string;
    const article = parseBlogArticle(path, rawContent);
    if (article) {
      articles.push(article);
    }
  }

  // Sort by date descending
  cachedArticles = articles.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return cachedArticles;
}

export function getBlogIndex(): BlogIndexItem[] {
  return loadBlogArticles().map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    description: a.description,
    publishedAt: a.publishedAt,
  }));
}

export function getBlogArticle(slug: string): BlogArticle | null {
  return loadBlogArticles().find((a) => a.slug === slug) || null;
}
