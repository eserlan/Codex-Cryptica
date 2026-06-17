import {
  solutions,
  comparisons,
  featuresConfig,
  importsConfig,
} from "$lib/config/seo-pages";
import { loadLocalBlogArticles } from "$lib/content/blog-content";
import { VALID_HUB_THEMES } from "../../params/theme_hub";

export const prerender = true;

const origin = "https://codexcryptica.com";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const blogArticles = loadLocalBlogArticles();

  const staticRoutes = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/blog", changefreq: "weekly", priority: "0.9" },
    { path: "/features", changefreq: "monthly", priority: "0.8" },
    { path: "/tools", changefreq: "weekly", priority: "0.9" },
    { path: "/generators", changefreq: "weekly", priority: "0.9" },
    {
      path: "/free-rpg-campaign-manager",
      changefreq: "monthly",
      priority: "0.9",
    },
    { path: "/worldbuilding-tool", changefreq: "monthly", priority: "0.8" },
    {
      path: "/ai-rpg-campaign-manager",
      changefreq: "monthly",
      priority: "0.8",
    },
    {
      path: "/responsible-ai-worldbuilding",
      changefreq: "monthly",
      priority: "0.8",
    },

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

  // Solutions pages
  const solutionRoutes = Object.keys(solutions).map((slug) => ({
    path: `/solutions/${slug}`,
    changefreq: "monthly",
    priority: "0.8",
  }));

  // Comparison pages
  const comparisonRoutes = Object.keys(comparisons).map((slug) => ({
    path: `/vs/${slug}`,
    changefreq: "monthly",
    priority: "0.8",
  }));

  // Feature pages
  const featureRoutes = Object.keys(featuresConfig).map((slug) => ({
    path: `/features/${slug}`,
    changefreq: "monthly",
    priority: "0.8",
  }));

  // Generator pages
  const generatorRoutes = [
    "npc",
    "settlement",
    "magic-item",
    "faction",
    "tavern",
    "social-hub",
    "kingdom",
    "nation",
    "quest",
    "item",
    "vampire-clan",
    "names",
    "fantasy-names",
    "dnd-npc",
    "pantheon-generator",
    "god-generator",
    "random",
  ].map((slug) => ({
    path: `/generators/${slug}`,
    changefreq: "monthly",
    priority: "0.8",
  }));

  // Theme hub pages — derived from VALID_HUB_THEMES to stay in sync with the route matcher
  const themeHubRoutes = [...VALID_HUB_THEMES].map((theme) => ({
    path: `/generators/${theme}`,
    changefreq: "monthly",
    priority: "0.8",
  }));

  // Import pages
  const importRoutes = Object.keys(importsConfig).map((slug) => ({
    path: `/import/${slug}`,
    changefreq: "monthly",
    priority: "0.8",
  }));

  const allStatic = [
    ...staticRoutes,
    ...solutionRoutes,
    ...comparisonRoutes,
    ...featureRoutes,
    ...generatorRoutes,
    ...themeHubRoutes,
    ...importRoutes,
  ];

  const staticUrls = allStatic
    .map(
      (route) => `  <url>
    <loc>${escapeXml(`${origin}${route.path}`)}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
    )
    .join("\n");

  const blogUrls = blogArticles
    .map(
      (article) => `  <url>
    <loc>${escapeXml(`${origin}/blog/${article.slug}`)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <lastmod>${escapeXml(new Date(article.publishedAt).toISOString())}</lastmod>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${blogUrls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "max-age=0, s-maxage=3600",
    },
  });
}
