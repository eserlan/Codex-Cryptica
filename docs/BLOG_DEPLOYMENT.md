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

The workflow in [`.github/workflows/deploy-blog-content.yml`](/home/espen/proj/Codex-Arcana/.github/workflows/deploy-blog-content.yml) copies:

- each blog `.md` file
- a generated `index.json`

into the `blog/` directory on the `blog-content` branch.

That keeps blog updates decoupled from the full web build and deploy.

## Existing app deploys

The normal web deploy in [`.github/workflows/deploy.yml`](/home/espen/proj/Codex-Arcana/.github/workflows/deploy.yml) still builds the full app, but now points the blog loader at the published blog content branch via:

```text
https://raw.githubusercontent.com/<owner>/<repo>/blog-content/blog
```

If you change the branch name or host, update both the workflow and `VITE_BLOG_CONTENT_BASE_URL` together.

Blog-only pushes to `main` and pushes to the `blog-content` branch are excluded from the normal deploy workflow, so blog publishing can run without kicking off a full site deploy.
