import { error } from "@sveltejs/kit";
import {
  getLandingPage,
  getAllLandingPageSlugs,
} from "$lib/content/for/registry";
import type { PageLoad, EntryGenerator } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const slugs = getAllLandingPageSlugs();
  return slugs.map((slug) => ({ slug }));
};

export const load: PageLoad = ({ params }) => {
  const config = getLandingPage(params.slug);

  if (!config) {
    throw error(404, { message: "Landing page not found" });
  }

  return { config };
};
