import { getAllExamples } from "$lib/content/examples/registry";
import type { PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = () => ({ examples: getAllExamples() });
