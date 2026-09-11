# Contract: Landing Page Registry API

## Public Module: `$lib/content/for/registry.ts`

The registry exposes functions for querying configured `/for/[slug]` landing page configurations.

```ts
import type { LandingPageConfig } from "./schema";

/**
 * Returns a single LandingPageConfig matching the requested slug,
 * or undefined if no matching page configuration exists.
 */
export function getLandingPage(
  slug: string,
  customRegistry?: Record<string, LandingPageConfig>,
): LandingPageConfig | undefined;

/**
 * Returns an array of all registered LandingPageConfig objects.
 */
export function getAllLandingPages(
  customRegistry?: Record<string, LandingPageConfig>,
): LandingPageConfig[];

/**
 * Returns an array of all valid slug strings (useful for SvelteKit entries() prerendering).
 */
export function getAllLandingPageSlugs(
  customRegistry?: Record<string, LandingPageConfig>,
): string[];
```
