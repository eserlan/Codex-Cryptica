import { buildAbsoluteUrl } from "$lib/seo/site";
import type { LandingPageConfig } from "./schema";

/**
 * The canonical URL for a `/for` page.
 *
 * Derived from the slug so every landing page emits one, rather than only the
 * packs that remembered to write a URL down by hand — no pack did, so the tag
 * was missing from the whole family. An explicit `seo.canonical` still wins,
 * for the rare page that has to point somewhere other than its own route.
 *
 * Deliberately not in `registry.ts`: that module is loaded by
 * `scripts/discovery-audit.mjs` outside Vite, where `$lib` does not resolve.
 */
export function getLandingPageCanonicalUrl(config: LandingPageConfig): string {
  return config.seo.canonical ?? buildAbsoluteUrl(`/for/${config.slug}`);
}
