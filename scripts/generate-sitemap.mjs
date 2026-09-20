import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { solutions } from "../apps/web/src/lib/config/seo-pages.ts";
import { comparisons } from "../apps/web/src/lib/config/seo-comparisons.ts";
import { getAllLandingPageSlugs } from "../apps/web/src/lib/content/for/registry.ts";
import {
  getAllAnswers,
  answerPath,
} from "../apps/web/src/lib/content/answers/registry.ts";
import {
  getAllExamples,
  examplePath,
} from "../apps/web/src/lib/content/examples/registry.ts";
import { GENERATOR_SLUGS } from "../apps/web/src/params/generator_slug.ts";
import {
  STATIC_SITEMAP_ROUTES,
  configPageRoutes,
  contentRoute,
  renderSitemapDocument,
  renderSitemapUrl,
} from "../apps/web/src/lib/seo/sitemap-routes.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const blogDir = join(repoRoot, "apps/web/src/lib/content/blog");
const outputFile = join(repoRoot, "apps/web/static/sitemap.xml");

const defaultOrigin = "https://codexcryptica.com";
const origin = (process.env.VITE_PUBLIC_APP_URL || defaultOrigin)
  .trim()
  .replace(/\/+$/, "");

const buildUrl = (path) =>
  `${origin}${path.startsWith("/") ? path : `/${path}`}`;

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

const buildXml = async (entries) => {
  const blogRows = entries.map(renderSitemapUrl);

  // Generator pages — derived from GENERATOR_SLUGS so this stops drifting
  // from the route matcher's own slug list (see #2850).
  const generatorRoutes = GENERATOR_SLUGS.map((slug) =>
    contentRoute(`/generators/${slug}`),
  );

  // Registry-backed pages (/for, /answers, /examples). A registry that fails to
  // load is skipped with a warning so the rest of the sitemap still builds.
  const fromRegistry = (label, read) => {
    try {
      return read();
    } catch (e) {
      console.warn(`[generate-sitemap] Could not read ${label} registry:`, e);
      return [];
    }
  };
  const landingPageRoutes = fromRegistry("landing page", () =>
    getAllLandingPageSlugs().map((slug) => ({
      ...contentRoute(`/for/${slug}`),
      changefreq: "weekly",
    })),
  );
  const answerRoutes = fromRegistry("answer", () =>
    getAllAnswers().map((answer) => contentRoute(answerPath(answer))),
  );
  const exampleRoutes = fromRegistry("example", () =>
    getAllExamples().map((example) => contentRoute(examplePath(example))),
  );

  const allStatic = [
    ...STATIC_SITEMAP_ROUTES,
    ...configPageRoutes({ solutions, comparisons }),
    ...generatorRoutes,
    ...landingPageRoutes,
    ...answerRoutes,
    ...exampleRoutes,
  ];

  const staticRows = allStatic.map((route) =>
    renderSitemapUrl({ ...route, loc: buildUrl(route.path) }),
  );

  return renderSitemapDocument([...staticRows, ...blogRows]);
};

async function main() {
  const entries = await listBlogEntries();
  const xml = await buildXml(entries);

  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, xml, "utf8");
}

main().catch((error) => {
  console.error("[generate-sitemap] Failed to generate sitemap:", error);
  process.exitCode = 1;
});
