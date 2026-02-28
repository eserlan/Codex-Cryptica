import { getBlogArticle } from "$lib/content/loader";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = async ({ params }) => {
  const article = getBlogArticle(params.slug);

  if (!article) {
    throw error(404, "Transmission not found in the archive.");
  }

  return {
    article,
  };
};
