import {
  parseBlogArticle,
  type BlogArticle,
  type BlogIndexItem,
} from "editor-core";

const blogModules = import.meta.glob("./blog/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

const getBlogContentBaseUrl = () =>
  import.meta.env.VITE_BLOG_CONTENT_BASE_URL?.trim().replace(/\/+$/, "") || "";

const toIndexItem = (article: BlogArticle): BlogIndexItem => ({
  id: article.id,
  slug: article.slug,
  title: article.title,
  description: article.description,
  publishedAt: article.publishedAt,
});

const loadLocalArticles = (): BlogArticle[] => {
  const articles: BlogArticle[] = [];
  const paths = Object.keys(blogModules).sort();

  for (const path of paths) {
    const rawContent = blogModules[path] as string;
    const article = parseBlogArticle(path, rawContent);
    if (article) articles.push(article);
  }

  return articles.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
};

const fetchRemoteText = async (url: string) => {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
};

const fetchRemoteJson = async <T>(url: string): Promise<T | null> => {
  const text = await fetchRemoteText(url);
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const fetchRemoteIndex = async (
  baseUrl: string,
): Promise<BlogIndexItem[] | null> => {
  const index = await fetchRemoteJson<BlogIndexItem[]>(`${baseUrl}/index.json`);
  if (!Array.isArray(index)) return null;

  const validItems = index.filter(
    (item): item is BlogIndexItem =>
      !!item &&
      typeof item.id === "string" &&
      typeof item.slug === "string" &&
      typeof item.title === "string" &&
      typeof item.description === "string" &&
      typeof item.publishedAt === "string",
  );

  return validItems.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
};

const fetchRemoteArticle = async (
  baseUrl: string,
  slug: string,
): Promise<BlogArticle | null> => {
  const raw = await fetchRemoteText(`${baseUrl}/${slug}.md`);
  if (!raw) return null;
  return parseBlogArticle(`${slug}.md`, raw);
};

export async function loadBlogIndex(): Promise<BlogIndexItem[]> {
  const baseUrl = getBlogContentBaseUrl();
  if (baseUrl) {
    const remoteIndex = await fetchRemoteIndex(baseUrl);
    if (remoteIndex && remoteIndex.length > 0) return remoteIndex;
  }

  return loadLocalArticles().map(toIndexItem);
}

export async function loadBlogArticle(
  slug: string,
): Promise<BlogArticle | null> {
  const baseUrl = getBlogContentBaseUrl();
  if (baseUrl) {
    const remoteArticle = await fetchRemoteArticle(baseUrl, slug);
    if (remoteArticle) return remoteArticle;
  }

  return loadLocalArticles().find((article) => article.slug === slug) || null;
}

export function loadLocalBlogArticles(): BlogArticle[] {
  return loadLocalArticles();
}
