import { loadBlogIndex } from "$lib/content/blog-content";
import { buildAbsoluteUrl } from "$lib/seo/site";
import type { PageLoad } from "./$types";

export const prerender = true;
export const ssr = true;

export const load: PageLoad = async () => {
  const articles = await loadBlogIndex();
  return {
    articles,
    canonicalUrl: buildAbsoluteUrl("/blog"),
  };
};
