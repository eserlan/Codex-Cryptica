import { load } from "js-yaml";

export interface HelpArticle {
  id: string;
  title: string;
  tags: string[];
  content: string;
  rank?: number;
}

export interface HelpArticleWithRank extends HelpArticle {
  rank?: number;
}

export function parseHelpArticle(
  path: string,
  rawContent: string,
): HelpArticleWithRank | null {
  // Regex to extract frontmatter block (YAML) and content
  // Matches --- at start, followed by yaml block, then ---, then content
  const frontmatterRegex =
    /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;
  const match = rawContent.match(frontmatterRegex);

  if (!match) {
    console.warn(`Missing frontmatter in help article: ${path}`);
    return null;
  }

  const [_, yaml, content] = match;

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
      content: content ? content.trim() : "",
    };
  } catch (e) {
    console.warn(`Failed to parse frontmatter for ${path}:`, e);
    return null;
  }
}

export function loadHelpArticles(): HelpArticleWithRank[] {
  // @ts-expect-error - import.meta.glob is a Vite feature
  const modules = import.meta.glob("./help/*.md", {
    eager: true,
    query: "?raw",
    import: "default",
  });

  const articles: HelpArticleWithRank[] = [];
  const loadedIds = new Set<string>();

  const paths = Object.keys(modules).sort();

  for (const path of paths) {
    const rawContent = modules[path] as string;
    const article = parseHelpArticle(path, rawContent);

    if (article) {
      if (loadedIds.has(article.id)) {
        console.warn(
          `Duplicate help article ID found: ${article.id}. Overwriting with content from ${path}.`,
        );
        const index = articles.findIndex((a) => a.id === article.id);
        if (index !== -1) {
          articles.splice(index, 1);
        }
      }

      loadedIds.add(article.id);
      articles.push(article);
    }
  }

  return articles.sort((a, b) => {
    const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;

    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.title.localeCompare(b.title);
  });
}
