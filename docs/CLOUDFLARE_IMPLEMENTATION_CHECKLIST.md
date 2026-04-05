# Cloudflare Implementation Checklist

This is the order I would actually follow to move the site to Cloudflare without losing blog indexability or the lightweight blog publishing path.

## 1. Make the blog indexable first

- [x] Keep `/blog` prerendered in SvelteKit.
- [x] Keep `/blog/[slug]` prerendered in SvelteKit.
- [x] Verify the built output contains real HTML for the archive and at least one post.
- [x] Confirm `https://codexcryptica.com/blog` returns `200` HTML in production.
- [x] Confirm one sample post returns `200` HTML in production.

Files involved:

- [`apps/web/src/routes/(marketing)/blog/+page.ts`](</home/espen/proj/Codex-Arcana/apps/web/src/routes/(marketing)/blog/+page.ts>)
- [`apps/web/src/routes/(marketing)/blog/[slug]/+page.ts`](</home/espen/proj/Codex-Arcana/apps/web/src/routes/(marketing)/blog/[slug]/+page.ts>)
- [`apps/web/svelte.config.js`](/home/espen/proj/Codex-Arcana/apps/web/svelte.config.js)

## 2. Decide the hosting target

- [x] Confirm Cloudflare Pages is the final app host.
- [x] Confirm staging should live on Cloudflare too.
- [x] Confirm whether GitHub Pages will be retired.
- [x] Confirm whether `blog-content` stays as a published markdown branch.

Files involved:

- [`docs/CLOUDFLARE_TRANSITION.md`](/home/espen/proj/Codex-Arcana/docs/CLOUDFLARE_TRANSITION.md)
- [`docs/CLOUDFLARE_MIGRATION_PLAN.md`](/home/espen/proj/Codex-Arcana/docs/CLOUDFLARE_MIGRATION_PLAN.md)

## 3. Replace the host deploy workflow

- [x] Remove the GitHub Pages deploy workflow once Cloudflare is confirmed.
- [x] Add a Cloudflare Pages deployment workflow if GitHub Actions is still doing the deploy.
- [x] Remove the GitHub Pages artifact upload/publish steps.
- [x] Move production and staging URLs to Cloudflare Pages or subdomains.

Files involved:

- [`.github/workflows/deploy.yml`](/home/espen/proj/Codex-Arcana/.github/workflows/deploy.yml)
- new workflow file, likely [`.github/workflows/cloudflare-deploy.yml`]

## 4. Keep blog content separate from app deploys

- [x] Keep the `blog-content` workflow if you still want content publishing decoupled.
- [x] Make sure blog-only updates do not require rebuilding the whole app by hand.
- [x] Decide whether the app build reads from `blog-content` at build time or directly from local markdown.
- [x] Keep the blog workflow publishing only markdown plus `index.json`.

Files involved:

- [`.github/workflows/deploy-blog-content.yml`](/home/espen/proj/Codex-Arcana/.github/workflows/deploy-blog-content.yml)
- [`scripts/publish-blog-content.mjs`](/home/espen/proj/Codex-Arcana/scripts/publish-blog-content.mjs)
- [`apps/web/src/lib/content/blog-content.ts`](/home/espen/proj/Codex-Arcana/apps/web/src/lib/content/blog-content.ts)

## 5. Keep assets on Cloudflare

- [x] Leave blog images on R2.
- [x] Keep using `assets.codexcryptica.com`.
- [x] Keep the Cloudflare image optimization URLs where they help.
- [x] Verify old PNGs are removed once the JPG/optimized versions are live.

Files involved:

- blog markdown under [`apps/web/src/lib/content/blog/`](/home/espen/proj/Codex-Arcana/apps/web/src/lib/content/blog/)
- local asset staging under [`blogPics/`](/home/espen/proj/Codex-Arcana/blogPics/)

## 6. Move environment variables

- [x] Set build-time env vars in the deploy workflow.
- [x] Mirror staging and production values where needed.
- [x] Keep secret values out of the repo.
- [x] Verify the blog content base URL is still correct if the published branch remains part of the flow.

Files involved:

- [`apps/web/svelte.config.js`](/home/espen/proj/Codex-Arcana/apps/web/svelte.config.js)
- Cloudflare Pages environment settings

## 7. Validate the production surface

- [x] Check the homepage.
- [x] Check `/blog`.
- [x] Check one blog post.
- [x] Check assets from R2.
- [x] Check redirects and canonicals.
- [x] Run a Search Console inspection again after deploy.

## 8. Cut over and clean up

- [x] Disable GitHub Pages if Cloudflare is now the origin.
- [x] Remove obsolete GitHub Pages deploy steps.
- [x] Update docs to describe the final architecture.
- [ ] Keep a rollback path for the first few deploys.

## Suggested Execution Order

1. Re-enable and verify prerendered blog output.
2. Stand up Cloudflare Pages for the app.
3. Move the deploy workflow.
4. Keep or simplify `blog-content` depending on whether you still want decoupled content publishing.
5. Finish asset and docs cleanup.
