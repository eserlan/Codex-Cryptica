import { defineParams } from "@sveltejs/kit/params";
import { HUB_THEME_SLUGS } from "./lib/content/hub-themes.ts";
import { GENERATOR_SLUGS } from "./lib/components/seo/generator-slugs.ts";

/**
 * Every generator slug the route serves.
 *
 * Exported so the discovery intent registry's governed-route list is derived
 * from the same source the router uses, rather than a copy that silently stops
 * matching when a generator is added.
 */
export { GENERATOR_SLUGS } from "./lib/components/seo/generator-slugs.ts";

export const VALID_HUB_THEMES = new Set<string>(HUB_THEME_SLUGS);

const validSlugs = new Set<string>(GENERATOR_SLUGS);

export const matchGenerator_slug = (param: string) => validSlugs.has(param);
export const matchTheme_hub = (param: string) => VALID_HUB_THEMES.has(param);

export const params = defineParams({
  generator_slug: (param: string): string | undefined =>
    matchGenerator_slug(param) ? param : undefined,
  theme_hub: (param: string): string | undefined =>
    matchTheme_hub(param) ? param : undefined,
});
