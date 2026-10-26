import { getAllLandingPages } from "#lib/content/for/registry.js";
import type { PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = () => {
  const pages = getAllLandingPages();
  return { pages };
};
