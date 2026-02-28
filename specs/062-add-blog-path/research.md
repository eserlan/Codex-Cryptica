# Research: Blog Path and First Article

## Decision: Content Structure

**Rationale**: Use Markdown files with YAML frontmatter stored in `apps/web/src/lib/content/blog/`. This follows the existing pattern for `HelpArticle` and allows for easy addition of new articles. Articles will be loaded using Vite's `import.meta.glob`.
**Alternatives considered**: Static JSON (too rigid for long-form content), Static Svelte components (overkill for simple articles, harder to manage as a collection).

## Decision: SEO & Static Pre-rendering

**Rationale**: SvelteKit's static adapter already handles pre-rendering for `(marketing)` routes. We will use a `+page.ts` with `export const prerender = true;` in the `[slug]` route to ensure all articles are indexed by search engines. Metadata (title, description, keywords) will be passed from the article frontmatter to `<svelte:head>`.
**Alternatives considered**: Dynamic SSR (not necessary for static content, slower).

## Decision: Markdown Parsing

**Rationale**: Use the existing `marked` dependency. We can create a `BlogArticle` component that renders the parsed HTML with consistent styling (Tailwind 4).
**Alternatives considered**: `svelte-markdown` (another good option, but `marked` is already in the project).

## Decision: Routing Structure

**Rationale**:

- `apps/web/src/routes/(marketing)/blog/+page.svelte` for the index.
- `apps/web/src/routes/(marketing)/blog/[slug]/+page.svelte` for individual articles.
  This keeps blog pages consistent with the rest of the marketing site.
