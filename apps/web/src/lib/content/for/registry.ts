import { LandingPageConfigSchema, type LandingPageConfig } from "./schema";
import { packs } from "./packs";

/**
 * Returns a single LandingPageConfig matching the requested slug,
 * or undefined if no matching page configuration exists.
 */
export function getLandingPage(
  slug: string,
  customRegistry: Record<string, LandingPageConfig> = packs,
): LandingPageConfig | undefined {
  const config = customRegistry[slug];
  if (config) {
    return LandingPageConfigSchema.parse(config);
  }
  return undefined;
}

/**
 * Returns an array of all registered LandingPageConfig objects.
 */
export function getAllLandingPages(
  customRegistry: Record<string, LandingPageConfig> = packs,
): LandingPageConfig[] {
  return Object.values(customRegistry);
}

/**
 * Returns the landing pages belonging to a theme hub, so a hub page can link
 * back to the system and genre guides it covers.
 */
export function getLandingPagesForHub(
  hub: string,
  customRegistry: Record<string, LandingPageConfig> = packs,
): LandingPageConfig[] {
  return getAllLandingPages(customRegistry).filter((page) => page.hub === hub);
}

/**
 * Returns an array of all valid slug strings (useful for SvelteKit entries() prerendering).
 */
export function getAllLandingPageSlugs(
  customRegistry: Record<string, LandingPageConfig> = packs,
): string[] {
  return Object.keys(customRegistry);
}
