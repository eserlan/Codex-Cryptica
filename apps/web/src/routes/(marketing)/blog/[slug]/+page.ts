import { loadBlogArticle } from "$lib/content/blog-content";
import { buildAbsoluteUrl } from "$lib/seo/site";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const prerender = true;
export const ssr = true;

export const load: PageLoad = async ({ params }) => {
  const article = await loadBlogArticle(params.slug);

  if (!article) {
    throw error(404, "Transmission not found in the archive.");
  }

  return {
    article,
    canonicalUrl: buildAbsoluteUrl(`/blog/${params.slug}`),
  };
};
