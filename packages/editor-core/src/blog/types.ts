export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  publishedAt: string;
  /**
   * Who stands behind the words. Optional here so existing posts keep parsing;
   * the site supplies its own default for anything that omits it, and a post
   * with a different author sets this explicitly.
   */
  author?: string;
  content: string; // Raw Markdown
}

export interface BlogIndexItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  author?: string;
}
