import { error } from "@sveltejs/kit";
import { solutions } from "$lib/config/seo-pages";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = ({ params }) => {
  const data = solutions[params.slug];
  if (!data) {
    error(404, "Solution page not found");
  }
  return {
    solution: data,
  };
};

export const entries: EntryGenerator = () => {
  return Object.keys(solutions).map((slug) => ({ slug }));
};
