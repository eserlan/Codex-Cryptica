# Cloudflare Migration Task List

Goal: move the app and blog delivery onto Cloudflare in a way that keeps blogs easy to publish, easy to crawl, and avoids rebuilding the whole site for every post when possible.

For the recommended order of operations and priorities, see [CLOUDFLARE_MIGRATION_PLAN.md](./CLOUDFLARE_MIGRATION_PLAN.md).

## Phase 1: Decide the hosting shape

- [x] Choose the final Cloudflare hosting model:
  - [x] `codexcryptica.com` on Cloudflare Pages
  - [x] staging on a separate Cloudflare Pages branch or subdomain
  - [x] assets on `assets.codexcryptica.com`
- [x] Confirm whether GitHub Pages will be retired or kept as a fallback.
- [x] Decide whether `blog-content` stays as a published content branch or is removed after the move.

## Phase 2: Move the app host

- [x] Create a Cloudflare Pages project for the web app.
- [x] Configure the production domain on Cloudflare Pages.
- [x] Configure staging or preview deployment URLs.
- [x] Move the build/deploy workflow from GitHub Pages to Cloudflare Pages.
- [x] Remove GitHub Pages specific build steps when the Cloudflare deploy is verified.
- [x] Verify the app still builds with `adapter-static` or switch adapters only if needed.

## Phase 3: Keep blogs indexable

- [x] Keep `/blog` and `/blog/[slug]` prerendered as real HTML pages.
- [x] Verify the prerendered output is present in the Cloudflare build artifact.
- [x] Confirm Google can fetch `/blog` and a sample blog post as `200` HTML.
- [x] Make sure blog canonical URLs point to the final public domain.
- [x] Keep the blog metadata and Open Graph fields intact after the move.

## Phase 4: Separate blog publishing from full app deploys

- [x] Decide how blog content changes should publish:
  - [ ] rebuild only the blog artifact
  - [x] rebuild the full app but keep the blog build fast
  - [x] keep a published `blog-content` branch as the content source
- [x] Ensure blog-only content updates do not require a full manual site rebuild.
- [x] Preserve a lightweight blog publishing workflow for frequent posts.
- [x] Verify blog images continue to resolve from Cloudflare R2.

## Phase 5: Asset and caching cleanup

- [x] Confirm all blog images point at `assets.codexcryptica.com`.
- [x] Keep image optimization URLs (`cdn-cgi/image/...`) where appropriate.
- [ ] Review caching headers for blog pages and blog assets.
- [x] Confirm redirects for old URLs, staging URLs, and any blog path changes.

## Phase 6: Environment and secrets

- [x] Move build-time environment variables to the deploy workflow.
- [x] Set separate production and staging values where needed.
- [x] Confirm Gemini, Discord, and any other deployment secrets are available in the new host.

## Phase 7: Validation

- [x] Test the app home page on the new host.
- [x] Test `/blog` and at least one blog post on the new host.
- [x] Test a newly published blog post end to end.
- [x] Test image loading from R2.
- [x] Run a live Google Search Console inspection on `/blog`.

## Phase 8: Cutover

- [x] Disable GitHub Pages once Cloudflare is serving the site correctly.
- [x] Remove old GitHub Pages deploy workflows.
- [ ] Keep a rollback path for the first few releases.
- [x] Document the final hosting model in `docs/`.

## Success Criteria

- [ ] Blog posts are indexable without a full manual rebuild of the entire site.
- [ ] Blog publishing can happen frequently without blocking app releases.
- [ ] The app serves stable static HTML from Cloudflare.
- [ ] Assets remain on Cloudflare and load correctly in production.
- [ ] The deployment path is simpler than the current GitHub Pages setup.
