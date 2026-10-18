import { load } from "js-yaml";

export interface HelpArticle {
  id: string;
  title: string;
  labels: string[];
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
      labels:
        Array.isArray(metadata.labels) && metadata.labels.length > 0
          ? metadata.labels
          : Array.isArray(metadata.tags)
            ? metadata.tags
            : [],
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
