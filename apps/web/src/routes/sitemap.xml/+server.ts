import {
  solutions,
  featuresConfig,
  importsConfig,
} from "$lib/config/seo-pages";
import { comparisons } from "$lib/config/seo-comparisons";
import { loadLocalBlogArticles } from "$lib/content/blog-content";
import { VALID_HUB_THEMES } from "../../params/theme_hub";
import { GENERATOR_SLUGS } from "../../params/generator_slug";
import { getAllLandingPageSlugs } from "$lib/content/for/registry";
import { getAllAnswers, answerPath } from "$lib/content/answers/registry";
import { getAllExamples, examplePath } from "$lib/content/examples/registry";
import {
  STATIC_SITEMAP_ROUTES,
  configPageRoutes,
  contentRoute,
  renderSitemapDocument,
  renderSitemapUrl,
} from "$lib/seo/sitemap-routes";

// fallow-ignore-next-line unused-export
export const prerender = true;

const origin = "https://codexcryptica.com";

export async function GET() {
  const blogArticles = loadLocalBlogArticles();

  const allStatic = [
    ...STATIC_SITEMAP_ROUTES,
    ...configPageRoutes({ solutions, comparisons }),
    ...Object.keys(featuresConfig).map((slug) =>
      contentRoute(`/features/${slug}`),
    ),
    // Generator pages — derived from GENERATOR_SLUGS (the route matcher's own
    // slug list) rather than a hand-maintained copy, so a new generator can't
    // silently go missing from the sitemap the way /generators/puzzle did (#2850).
    ...GENERATOR_SLUGS.map((slug) => contentRoute(`/generators/${slug}`)),
    // Theme hub pages — derived from VALID_HUB_THEMES to stay in sync with the route matcher
    ...[...VALID_HUB_THEMES].map((theme) =>
      contentRoute(`/generators/${theme}`),
    ),
    ...Object.keys(importsConfig).map((slug) =>
      contentRoute(`/import/${slug}`),
    ),
    // Landing pages (/for/[slug])
    ...getAllLandingPageSlugs().map((slug) => contentRoute(`/for/${slug}`)),
    // Answer pages (/answers/[slug]). Keyed off answerPath rather than the slug
    // so a page that canonicalises to another URL is never listed under one its
    // own <link rel="canonical"> disowns.
    ...getAllAnswers().map((answer) => contentRoute(answerPath(answer))),
    // Curated example pages (/examples/[slug]), keyed off the canonical path.
    ...getAllExamples().map((example) => contentRoute(examplePath(example))),
  ];

  const staticRows = allStatic.map((route) =>
    renderSitemapUrl({ ...route, loc: `${origin}${route.path}` }),
  );

  const blogRows = blogArticles.map((article) =>
    renderSitemapUrl({
      loc: `${origin}/blog/${article.slug}`,
      changefreq: "monthly",
      priority: "0.8",
      lastmod: new Date(article.publishedAt).toISOString(),
    }),
  );

  return new Response(renderSitemapDocument([...staticRows, ...blogRows]), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "max-age=0, s-maxage=3600",
    },
  });
}
