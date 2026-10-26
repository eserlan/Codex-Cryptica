import releases from "#lib/content/changelog/releases.json";
import { buildAbsoluteUrl } from "#lib/seo/site.js";
import type { PageLoad } from "./$types";

export const prerender = true;
export const ssr = true;

export const load: PageLoad = () => {
  return {
    releases,
    canonicalUrl: buildAbsoluteUrl("/changelog"),
  };
};
