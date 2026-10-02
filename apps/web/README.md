# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
pnpm dlx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv create --template minimal --types ts --no-install ./
```

## Developing

Once you've created a project and installed dependencies with `pnpm install`, start a development server:

```bash
pnpm run dev

# or start the server and open in a new browser tab
pnpm run dev -- --open
```

## Building

To create a production version of your app:

```bash
pnpm run build
```

You can preview the production build with `pnpm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Static Build & Prerendering

This project uses a hybrid SPA/SSG (Static Site Generation) approach:

- **Marketing Routes**: Pages like `/`, `/features`, `/privacy`, and `/terms` are prerendered as static HTML files during the build process. This ensures optimal SEO indexability and fast initial loads.
- **Application Routes**: The main workspace remains an SPA (Single Page Application) using the `fallback: 'index.html'` setting in `adapter-static`, which works cleanly on Cloudflare Pages.

### Prerender Safety

When working on components used in marketing routes, avoid using browser-only globals (`window`, `document`, `localStorage`) at the top level of your scripts. Use the `browser` check from `$app/environment` if necessary:

```typescript
import { browser } from "$app/environment";
if (browser) {
  // Client-only logic
}
```

### Crawl Configuration

Static crawl assets like `robots.txt` and `sitemap.xml` are located in the `static/` directory and should be updated whenever new public routes are added.

## Help & Documentation

Help articles are Markdown files in `src/lib/content/help/`. The same prose is used by the human Help Center and the contextual AI Help knowledge bundle; do not create a separate AI-only copy.

To add a visible article:

1. Create a `.md` file in that directory.
2. Add the shared metadata contract:
   ```yaml
   ---
   id: unique-stable-id
   title: Article Title
   description: Explain what the user can accomplish with this article in one concise sentence.
   tags: [user-language, search-terms]
   rank: 10
   ---
   ```
3. Write task-oriented Markdown using the same names the UI uses.
4. Run the Help tests/bundle validation. Missing metadata, duplicate IDs, and broken feature-registry → Help references fail validation.

### Metadata contract

- `id` — required, stable kebab-case identifier. Do not rename it casually; AI Help and feature-registry references depend on it.
- `title` — required, user-facing title.
- `description` — required for visible articles, at most 240 characters, and should say what the user can accomplish rather than act as marketing copy.
- `tags` — required non-empty array of terms a user might actually use when asking for this help.
- `rank` — optional non-negative integer controlling Help Center ordering. Prefer spaced values so later insertions do not require renumbering.
- `hidden: true` — excludes an article from the user-facing corpus and contextual Help bundle; hidden articles are not subject to the visible-article metadata contract.

### Feature completion contract

For every major user-facing feature, make two explicit decisions in the pull request:

1. **Human/knowledge Help** — existing article remains sufficient, existing article updated, new article added, or deliberately no Help needed with a reason.
2. **Contextual AI Help registry** — existing registry coverage remains sufficient, registry support updated/added, or deliberately deferred/not needed with a reason.

These decisions are separate. A feature can be well documented before it has screen-aware AI Help actions, and not every feature needs registry support immediately.

### Article Sorting (Rank)

Articles are sorted by `rank` ascending, then by `title`. If `rank` is omitted, the article appears after ranked articles.

Run validation with:

```bash
bun run --filter help-engine test
bun run --filter help-engine bundle
```
