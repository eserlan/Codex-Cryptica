import { error } from "@sveltejs/kit";
import {
  getExample,
  getAllExampleSlugs,
  getRelatedExamples,
  getConnectedExample,
} from "$lib/content/examples/registry";
import type { PageLoad, EntryGenerator } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () =>
  getAllExampleSlugs().map((slug) => ({ slug }));

export const load: PageLoad = ({ params }) => {
  const example = getExample(params.slug);

  if (!example) {
    throw error(404, { message: "Example not found" });
  }

  return {
    example,
    related: getRelatedExamples(example),
    connected: getConnectedExample(example),
  };
};
