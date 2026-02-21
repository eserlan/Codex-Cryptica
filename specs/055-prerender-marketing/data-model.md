# Data Model: Public Route Prerendering

This feature focuses on build-time configuration rather than runtime data structures.

## Entities

### Public Route

Represents a page that can be rendered without user-specific state.

- **Path**: The URI path (e.g., `/features`).
- **Prerender Status**: Enabled at build time.
- **SSR Status**: Enabled to generate HTML body.

### SEO Metadata

Structured data embedded in the HTML head of public routes.

- **Title**: Page-specific title.
- **Description**: Marketing or content summary.
- **Canonical URL**: The primary URL for the page to avoid duplicate content issues.
- **OpenGraph Tags**: For social media rich previews.

### Crawl Configuration

Static files served from the root to guide search engines.

- **robots.txt**: Rules for crawlers.
- **sitemap.xml**: Map of all public routes.
