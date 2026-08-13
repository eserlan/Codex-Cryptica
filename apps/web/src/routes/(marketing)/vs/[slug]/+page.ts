import { error } from "@sveltejs/kit";
import { comparisons } from "$lib/config/seo-comparisons";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = ({ params }) => {
  const data = comparisons[params.slug];
  if (!data) {
    error(404, "Comparison page not found");
  }
  return {
    comparison: data,
  };
};

export const entries: EntryGenerator = () => {
  return Object.keys(comparisons).map((slug) => ({ slug }));
};
