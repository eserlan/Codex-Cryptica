import { loadBlogArticle } from "$lib/content/blog-content";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = async ({ params }) => {
  const article = await loadBlogArticle(params.slug);

  if (!article) {
    throw error(404, "Transmission not found in the archive.");
  }

  return {
    article,
  };
};
