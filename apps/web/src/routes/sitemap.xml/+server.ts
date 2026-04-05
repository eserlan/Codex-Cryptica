import { loadBlogIndex } from "$lib/content/blog-content";
import { buildSitemapEntries, buildSitemapXml } from "$lib/seo/sitemap";
import { getPublicAppUrl } from "$lib/seo/site";

export const prerender = true;

export async function GET() {
  const articles = await loadBlogIndex();
  const sitemap = buildSitemapXml(
    buildSitemapEntries(articles, getPublicAppUrl()),
  );

  return new Response(sitemap, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
    },
  });
}
