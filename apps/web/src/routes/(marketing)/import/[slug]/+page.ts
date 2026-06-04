import { error } from "@sveltejs/kit";
import { importsConfig } from "$lib/config/seo-pages";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = ({ params }) => {
  const data = importsConfig[params.slug];
  if (!data) {
    error(404, "Importer not found");
  }
  return {
    importPage: data,
  };
};

export const entries: EntryGenerator = () => {
  return Object.keys(importsConfig).map((slug) => ({ slug }));
};
