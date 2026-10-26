import { error } from "@sveltejs/kit";
import { HELP_ARTICLES } from "$lib/config/help-content";
import type { PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = async ({ params }) => {
  const article = HELP_ARTICLES.find((a) => a.id === params.slug);

  if (!article) {
    throw error(404, "Documentation protocol not found.");
  }

  return {
    article,
  };
};

export function entries() {
  return HELP_ARTICLES.map((article) => ({
    slug: article.id,
  }));
}
