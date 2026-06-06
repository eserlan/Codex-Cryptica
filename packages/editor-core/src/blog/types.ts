export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  publishedAt: string;
  content: string; // Raw Markdown
  cta?: { heading: string; subheading: string };
}

export interface BlogIndexItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
}
