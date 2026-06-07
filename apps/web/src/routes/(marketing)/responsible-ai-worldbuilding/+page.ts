import { loadBlogIndex } from "$lib/content/blog-content";
import { buildAbsoluteUrl } from "$lib/seo/site";
import type { PageLoad } from "./$types";

export const prerender = true;
export const ssr = true;

export const load: PageLoad = async () => {
  const allArticles = await loadBlogIndex();
  const targetSlugs = [
    "lore-oracle-not-the-author",
    "worldbuilding-tool-without-ai",
    "worldbuilding-ai-needs-your-lore",
    "drafts-are-not-canon",
    "ai-campaign-prep-without-losing-your-voice",
    "ai-slop-is-context-failure",
    "revising-your-lore-with-the-oracle",
  ];

  // Map/find in order of targetSlugs to maintain correct series sequence
  const articles = targetSlugs
    .map((slug) => allArticles.find((a) => a.slug === slug))
    .filter((a): a is NonNullable<typeof a> => !!a);

  return {
    articles,
    canonicalUrl: buildAbsoluteUrl("/responsible-ai-worldbuilding"),
  };
};
