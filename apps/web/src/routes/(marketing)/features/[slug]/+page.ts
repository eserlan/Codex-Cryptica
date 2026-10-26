import { error } from "@sveltejs/kit";
import { featuresConfig } from "$lib/config/seo-pages";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = ({ params }) => {
  const data = featuresConfig[params.slug];
  if (!data) {
    throw error(404, "Feature page not found");
  }
  return {
    feature: data,
  };
};

export const entries: EntryGenerator = () => {
  return Object.keys(featuresConfig).map((slug) => ({ slug }));
};
