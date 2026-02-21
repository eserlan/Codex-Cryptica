# Research: Public Route Prerendering

Research into SvelteKit prerendering configurations and safety for marketing routes.

## Prerendering Configuration

### Decision

Update `svelte.config.js` to explicitly include the target routes in `prerender.entries` and override the layout defaults in the specific routes.

### Rationale

Explicitly listing entries ensures that SvelteKit knows exactly which pages to generate, even if they aren't linked from the root in a way that the crawler can follow at build time. Overriding `ssr` and `prerender` at the route level allows us to maintain the SPA behavior for the main workspace routes (which require `localStorage` and `indexedDB`) while getting the benefits of static HTML for marketing pages.

### Alternatives Considered

- **Global Prerendering**: Rejected because the main application logic depends heavily on browser-only APIs (`OPFS`, `IndexedDB`, `localStorage`) and cannot render meaningfully on the server.
- **Manual HTML Files**: Rejected because it creates a maintenance burden and loses the benefit of shared Svelte components/styles.

## SEO Metadata & Crawl Configuration

### Decision

Add `robots.txt` and `sitemap.xml` to `apps/web/static/`.

### Rationale

Standard search engine requirement. `robots.txt` should point to the sitemap, and the sitemap should list all prerendered pages.

### Sitemap Content

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://codexcryptica.com/</loc><changefreq>weekly</changefreq></url>
  <url><loc>https://codexcryptica.com/features</loc><changefreq>monthly</changefreq></url>
  <url><loc>https://codexcryptica.com/terms</loc><changefreq>yearly</changefreq></url>
  <url><loc>https://codexcryptica.com/privacy</loc><changefreq>yearly</changefreq></url>
</urlset>
```

## Prerender Safety (Browser Globals)

### Findings

The target marketing routes (`/`, `/features`, `/terms`, `/privacy`) do not currently use browser-only globals at the top level. `LegalDocument.svelte` (used by `/terms` and `/privacy`) uses `onMount` for data fetching, which is safe for SSR (it will just be empty during the static build unless moved to a `load` function).

### Recommendation

Move the fetching logic in `LegalDocument.svelte` to a `load` function in the respective `+page.ts` files to ensure the content is actually present in the prerendered HTML.
