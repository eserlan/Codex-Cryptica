import type { BlogIndexItem } from "editor-core";
import { buildAbsoluteUrl } from "./site";
import {
  STATIC_SITEMAP_ROUTES,
  renderSitemapDocument,
  renderSitemapUrl,
} from "./sitemap-routes";

export interface SitemapEntry {
  loc: string;
  changefreq: "weekly" | "monthly" | "yearly";
  priority: string;
  lastmod?: string;
}

export function buildSitemapEntries(
  articles: BlogIndexItem[],
  origin?: string,
): SitemapEntry[] {
  const staticEntries = STATIC_SITEMAP_ROUTES.map((route) => ({
    loc: buildAbsoluteUrl(route.path, origin),
    changefreq: route.changefreq,
    priority: route.priority,
  }));

  const blogEntries = articles.map((article) => ({
    loc: buildAbsoluteUrl(`/blog/${article.slug}`, origin),
    changefreq: "monthly" as const,
    priority: "0.8",
    lastmod: article.publishedAt,
  }));

  return [...staticEntries, ...blogEntries];
}

export function buildSitemapXml(entries: SitemapEntry[]) {
  return renderSitemapDocument(entries.map(renderSitemapUrl));
}
