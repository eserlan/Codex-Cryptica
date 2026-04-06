# Cloudflare Migration Plan

Goal: move the site to Cloudflare in a way that keeps blog pages indexable, keeps blog publishing fast, and avoids forcing a full app rebuild for every post.

## Priority 0: Fix the indexing path first

Do this first. If this step is wrong, everything else is noise.

- [x] Make sure `/blog` and `/blog/[slug]` are prerendered as real HTML pages.
- [x] Confirm the blog archive is not returning `404` in production.
- [x] Verify Google Search Console can fetch and index the blog pages.
- [x] Decide whether the blog should be served from the main app build or from a separate blog deployment target.

Why this comes first:

- Google only indexes what it can actually fetch.
- A content branch alone does not solve indexing.
- If the blog pages are not real HTML, the rest of the migration does not matter yet.

For the exact execution order and files to touch, see [CLOUDFLARE_IMPLEMENTATION_CHECKLIST.md](./CLOUDFLARE_IMPLEMENTATION_CHECKLIST.md).

## Priority 1: Move the app hosting to Cloudflare

Do this once the blog pages are known to be indexable.

- [x] Create the Cloudflare Pages project for the app.
- [x] Point production to `codexcryptica.com`.
- [x] Point staging to a separate Cloudflare-hosted URL.
- [x] Move the current GitHub Pages deployment over to Cloudflare Pages.
- [x] Keep the same static output model unless there is a hard reason to change it.

Why this comes next:

- Cloudflare gives cleaner deployment control.
- You already use Cloudflare for assets and workers.
- This removes the GitHub Pages hosting constraint that is getting in the way.

## Priority 2: Keep blog publishing lightweight

Do this after the app is safely hosted.

- [x] Decide whether `blog-content` remains the blog publishing source.
- [x] Keep blog content generation separate from the full app release cycle.
- [x] Preserve the ability to publish a new blog post without a manual site-wide rebuild.
- [x] Keep blog images on `assets.codexcryptica.com`.

Why this matters:

- You want a high blog creation rate.
- The blog should not be blocked by the rest of the app.
- Cloudflare should make publishing easier, not just move the same bottleneck.

## Priority 3: Clean up the deployment surface

Do this once hosting and publishing are stable.

- [x] Remove GitHub Pages deploy logic when it is no longer needed.
- [x] Simplify or remove old staging path logic.
- [x] Confirm redirects and canonical URLs are correct.
- [ ] Make sure cache headers are sane for blog pages and assets.

Why this comes later:

- You want to avoid churn while the migration is still being proven.
- Premature cleanup makes rollback harder.

## Priority 4: Validate and harden

Do this before declaring the move complete.

- [x] Test the homepage, blog archive, and individual blog posts.
- [x] Validate image loading from Cloudflare.
- [x] Test a fresh blog publish end to end.
- [x] Run live index checks again after deployment.
- [x] Document the final production path in `docs/`.

## Recommended End State

The best end state for your goals is:

- Cloudflare Pages hosts the app
- Cloudflare R2 hosts assets
- blog pages are prerendered HTML
- blog publishing stays lightweight
- the blog is easy to crawl and easy to update

## Not Worth Doing Yet

Avoid spending time on these until the basics are solved:

- building a custom Worker-based blog renderer
- artifact promotion systems
- multi-layer deployment abstractions
- removing the blog content branch before the new flow is proven
