# Blog Deployment

The blog now supports a separate content-only deployment path.

## What ships where

- Local source of truth: `apps/web/src/lib/content/blog/*.md`
- Published content branch: `blog-content`
- Runtime content base URL: `VITE_BLOG_CONTENT_BASE_URL`

## How it works

The blog routes load from the published blog content first, then fall back to the bundled markdown in the web app.

At runtime, the app expects blog files at:

```text
${VITE_BLOG_CONTENT_BASE_URL}/<slug>.md
${VITE_BLOG_CONTENT_BASE_URL}/index.json
```

If `VITE_BLOG_CONTENT_BASE_URL` is not set, the app uses the local markdown bundled into the web build.

## Publishing blog content only

Write articles to `apps/web/src/lib/content/blog/` and push to the `blog` branch. The workflow in `.github/workflows/deploy-blog-content.yml` triggers on any push to `blog` that touches a blog `.md` file. It copies:

- each blog `.md` file
- a generated `index.json`

into the `blog/` directory on the `blog-content` branch.

The blog publish job disables local git hooks, so it does not run the repo-wide lint/test pipeline when it commits the generated branch.

### Why a dedicated blog branch

The `blog` branch is a permanent branch off `main` that only ever contains blog content changes. This avoids merge conflicts from stacking features on `staging` — blog articles deploy immediately without waiting for a feature release.

To publish a new article:

1. Commit the `.md` file to the `blog` branch and push.
2. The workflow publishes it to `blog-content` within ~30 seconds.
3. Merge `blog` into `main` and `staging` at your convenience to keep them in sync.

## Existing app deploys

The normal web deploy in `.github/workflows/deploy.yml` triggers on pushes to `staging` and ignores blog file changes, so blog publishing never kicks off a full site deploy.

The app points the blog loader at the published content via:

```text
https://raw.githubusercontent.com/<owner>/<repo>/blog-content/blog
```

If you change the branch name or host, update both the workflow and `VITE_BLOG_CONTENT_BASE_URL` together.

## Sitemap and indexing

The production build also generates `apps/web/static/sitemap.xml` from the blog index during `prebuild`. That keeps the sitemap aligned with newly published posts on the next app deploy without requiring a separate sitemap workflow.

Staging builds set `noindex, nofollow`, so `staging.codexcryptica.com` stays out of search results while still giving you a public preview URL.
