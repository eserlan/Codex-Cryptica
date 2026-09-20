/**
 * Single source of truth for the static sitemap paths and XML row rendering.
 * Shared by the `/sitemap.xml` route, `scripts/generate-sitemap.mjs` (run with
 * Bun, so this file must stay dependency-free and use no `$lib` aliases) and
 * the `sitemap.ts` helper, so a new public route is added in exactly one place.
 */

export type SitemapChangefreq = "weekly" | "monthly" | "yearly";

export interface SitemapRoute {
  path: string;
  changefreq: SitemapChangefreq;
  priority: string;
}

export const STATIC_SITEMAP_ROUTES: SitemapRoute[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", changefreq: "weekly", priority: "0.9" },
  { path: "/for", changefreq: "weekly", priority: "0.9" },
  { path: "/answers", changefreq: "weekly", priority: "0.8" },
  { path: "/examples", changefreq: "weekly", priority: "0.8" },
  { path: "/explore", changefreq: "monthly", priority: "0.5" },
  { path: "/features", changefreq: "monthly", priority: "0.8" },
  { path: "/tools", changefreq: "weekly", priority: "0.9" },
  { path: "/migrations", changefreq: "weekly", priority: "0.9" },
  { path: "/generators", changefreq: "weekly", priority: "0.9" },
  {
    path: "/free-rpg-campaign-manager",
    changefreq: "monthly",
    priority: "0.9",
  },
  { path: "/worldbuilding-tool", changefreq: "monthly", priority: "0.8" },
  { path: "/ai-rpg-campaign-manager", changefreq: "monthly", priority: "0.8" },
  {
    path: "/responsible-ai-worldbuilding",
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/resources/castle-floorplans",
    changefreq: "monthly",
    priority: "0.6",
  },
  { path: "/topics/heists", changefreq: "weekly", priority: "0.8" },
  { path: "/topics/puzzles", changefreq: "weekly", priority: "0.8" },
  // /tools/dnd-npc-generator and /tools/faction-generator are 301 stubs to
  // /generators/npc and /generators/faction. Static hosting prerenders them as
  // empty meta-refresh pages, so listing them handed discovery crawlers two
  // content-free URLs (#2567). The redirects stay; only the sitemap entries go.
  {
    path: "/tools/vampire-clan-generator",
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/tools/quest-hook-generator",
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/tools/fantasy-name-generator",
    changefreq: "monthly",
    priority: "0.8",
  },
  { path: "/llms.txt", changefreq: "weekly", priority: "0.7" },
  { path: "/llms-full.txt", changefreq: "weekly", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.5" },
];

/** Builds a monthly, priority 0.8 route, the default for generated pages. */
export const contentRoute = (path: string): SitemapRoute => ({
  path,
  changefreq: "monthly",
  priority: "0.8",
});

/** Routes for the solutions and comparison pages, keyed by config slug. */
export const configPageRoutes = (config: {
  solutions: object;
  comparisons: object;
}): SitemapRoute[] => [
  ...Object.keys(config.solutions).map((slug) =>
    contentRoute(`/solutions/${slug}`),
  ),
  ...Object.keys(config.comparisons).map((slug) => contentRoute(`/vs/${slug}`)),
];

export const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export interface SitemapUrlRow {
  loc: string;
  changefreq: SitemapChangefreq;
  priority: string;
  lastmod?: string;
}

export const renderSitemapUrl = (row: SitemapUrlRow) => `  <url>
    <loc>${escapeXml(row.loc)}</loc>
    <changefreq>${row.changefreq}</changefreq>
    <priority>${row.priority}</priority>${
      row.lastmod
        ? `
    <lastmod>${escapeXml(row.lastmod)}</lastmod>`
        : ""
    }
  </url>`;

export const renderSitemapDocument = (
  rows: string[],
) => `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.join("\n")}
</urlset>
`;
