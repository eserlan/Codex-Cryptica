import type { BlogIndexItem } from "editor-core";
import { buildAbsoluteUrl } from "./site";

export interface SitemapEntry {
  loc: string;
  changefreq: "weekly" | "monthly" | "yearly";
  priority: string;
  lastmod?: string;
}

const STATIC_ROUTES: Array<
  Pick<SitemapEntry, "changefreq" | "priority"> & { path: string }
> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", changefreq: "weekly", priority: "0.9" },
  { path: "/features", changefreq: "monthly", priority: "0.8" },
  { path: "/terms", changefreq: "yearly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.5" },
];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function buildSitemapEntries(
  articles: BlogIndexItem[],
  origin?: string,
): SitemapEntry[] {
  const staticEntries = STATIC_ROUTES.map((route) => ({
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
  const rows = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>${
      entry.lastmod
        ? `
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`
        : ""
    }
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</urlset>
`;
}
