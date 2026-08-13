# Research & Architecture Decisions: Genre & System Landing Pages

## 1. SvelteKit Prerendering & Dynamic Route Slugs

### Question

How do we ensure all dynamically registered `/for/[slug]` pages are prerendered statically at build time and included in `sitemap.xml`?

### Decision

Export `export const entries: PrerenderEntryGenerator` in `apps/web/src/routes/(marketing)/for/[slug]/+page.ts`.

### Rationale

In SvelteKit static adapter (`@sveltejs/adapter-static`), dynamic routes (`[slug]`) with `export const prerender = true` need to know the list of valid parameters at build time. By exporting an `entries()` function that returns `getAllLandingPageSlugs().map(slug => ({ slug }))`, SvelteKit crawls and prerenders every registered page during `bun run build`. The existing sitemap generation script inspects prerendered HTML output or routes to build `sitemap.xml`.

### Code Pattern

```ts
import { error } from "@sveltejs/kit";
import type { PageLoad, EntryGenerator } from "./$types";
import {
  getLandingPage,
  getAllLandingPageSlugs,
} from "$lib/content/for/registry";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return getAllLandingPageSlugs().map((slug) => ({ slug }));
};

export const load: PageLoad = ({ params }) => {
  const page = getLandingPage(params.slug);
  if (!page) {
    throw error(404, `Landing page for "${params.slug}" not found`);
  }
  return { page };
};
```

---

## 2. Shared Shell Section Sequence & Layout Component Hierarchy

### Question

What are the 5 standard sections of the landing page shell, and how do optional components collapse cleanly?

### Decision

The shell component (`+page.svelte`) renders 5 sequential sections:

1. **Hero Section**: Eyebrow badge (`kind`), Title (`hero.title`), Tagline (`hero.tagline`), and Problem Statement paragraph (`hero.problemStatement`).
2. **Tailored Use Cases**: Grid of 3–5 cards (`useCases`) showing specific campaign management workflows.
3. **Example Campaign / World Structure (Graph Preview)**: Optional card rendering an interactive or visual node connection sequence (e.g. `Prince → Sheriff → Primogen → Coteries → Havens`). Rendered if `exampleGraph` is provided.
4. **Useful Tools & Generators**: Section displaying direct link cards (`recommendedTools`) to existing Codex Cryptica generators and features.
5. **Call to Action (CTA) & Disclaimer**: Primary CTA button (`cta`), followed by a subtle non-affiliation trademark disclaimer if `disclaimer` is defined.

---

## 3. SEO & Open Graph Metadata Contract

### Question

How does the shell handle SEO titles, descriptions, and canonical URLs per landing page?

### Decision

The shell passes `page.seo` metadata directly to `<svelte:head>` or the shared marketing `<SeoMeta>` component.

- `<title>`: `page.seo.title` (e.g. "Vampire: The Masquerade Campaign Management | Codex Cryptica")
- `<meta name="description">`: `page.seo.description`
- `<link rel="canonical">`: `https://codexcryptica.com/for/${page.slug}`
- `<meta property="og:title">`: `page.seo.title`
- `<meta property="og:description">`: `page.seo.description`
