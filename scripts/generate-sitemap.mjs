import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { solutions } from "../apps/web/src/lib/config/seo-pages.ts";
import { comparisons } from "../apps/web/src/lib/config/seo-comparisons.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const blogDir = join(repoRoot, "apps/web/src/lib/content/blog");
const outputFile = join(repoRoot, "apps/web/static/sitemap.xml");

const defaultOrigin = "https://codexcryptica.com";
const origin = (process.env.VITE_PUBLIC_APP_URL || defaultOrigin)
  .trim()
  .replace(/\/+$/, "");

const escapeXml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const staticRoutes = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", changefreq: "weekly", priority: "0.9" },
  { path: "/features", changefreq: "monthly", priority: "0.8" },
  { path: "/tools", changefreq: "weekly", priority: "0.9" },
  { path: "/free-rpg-campaign-manager", changefreq: "monthly", priority: "0.9" },
  { path: "/worldbuilding-tool", changefreq: "monthly", priority: "0.8" },
  { path: "/ai-rpg-campaign-manager", changefreq: "monthly", priority: "0.8" },
  { path: "/tools/dnd-npc-generator", changefreq: "monthly", priority: "0.8" },
  { path: "/tools/faction-generator", changefreq: "monthly", priority: "0.8" },
  { path: "/tools/quest-hook-generator", changefreq: "monthly", priority: "0.8" },
  { path: "/tools/fantasy-name-generator", changefreq: "monthly", priority: "0.8" },
  { path: "/llms.txt", changefreq: "weekly", priority: "0.7" },
  { path: "/llms-full.txt", changefreq: "weekly", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.5" },
];

const buildUrl = (path) => `${origin}${path.startsWith("/") ? path : `/${path}`}`;

const parseDateFromFrontmatter = (raw) => {
  const match = raw.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (!match) return null;

  const publishedAt = match[1].match(/^publishedAt:\s*(.+)$/m)?.[1]?.trim();
  if (!publishedAt) return null;

  const date = new Date(publishedAt);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const listBlogEntries = async () => {
  const files = (await readdir(blogDir)).filter((file) => file.endsWith(".md"));
  const entries = [];

  for (const file of files) {
    const fullPath = join(blogDir, file);
    const raw = await readFile(fullPath, "utf8");
    const slug = file.replace(/\.md$/i, "");
    const lastmod = parseDateFromFrontmatter(raw);
    const stats = await stat(fullPath);

    entries.push({
      loc: buildUrl(`/blog/${slug}`),
      changefreq: "monthly",
      priority: "0.8",
      lastmod: lastmod || stats.mtime.toISOString(),
    });
  }

  return entries.sort(
    (a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime(),
  );
};

const buildXml = (entries) => {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
  </url>`,
    )
    .join("\n");

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

  // Generator pages
  const generatorRoutes = ["npc", "settlement", "magic-item", "faction"].map(
    (slug) => ({
      path: `/generators/${slug}`,
      changefreq: "monthly",
      priority: "0.8",
    }),
  );

  const allStatic = [
    ...staticRoutes,
    ...solutionRoutes,
    ...comparisonRoutes,
    ...generatorRoutes,
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allStatic
  .map(
    (route) => `  <url>
    <loc>${escapeXml(buildUrl(route.path))}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
  )
  .concat(urls ? [urls] : [])
  .join("\n")}
</urlset>
`;
};

async function main() {
  const entries = await listBlogEntries();
  const xml = buildXml(entries);

  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, xml, "utf8");
}

main().catch((error) => {
  console.error("[generate-sitemap] Failed to generate sitemap:", error);
  process.exitCode = 1;
});
