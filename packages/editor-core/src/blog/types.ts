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
  /**
   * When the post was last meaningfully revised. Absent means never revised,
   * which is different from "revised on the publication date": readers use
   * this to tell current writing from old, so it must not be guessed.
   */
  updatedAt?: string;
  /** Editorial section, e.g. product updates versus GM guidance. */
  topic?: string;
  /**
   * Link-preview image for the post, as an absolute URL. Social crawlers do not
   * negotiate formats, so this points at a plain R2 object rather than through
   * `cdn-cgi/image`. Absent means the site's default card image.
   */
  image?: string;
  /** Alt text for `image`. Ignored unless `image` is set. */
  imageAlt?: string;
  content: string; // Raw Markdown
}

export interface BlogIndexItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  author?: string;
  updatedAt?: string;
  topic?: string;
}
