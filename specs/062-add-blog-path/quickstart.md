# Quickstart: Blog Path and First Article

## Development Setup

1. Create `apps/web/src/lib/content/blog/` directory.
2. Create the first article file: `gm-guide-data-sovereignty.md`.
3. Implement `loadBlogArticles()` in `apps/web/src/lib/content/loader.ts`.
4. Implement routing in `apps/web/src/routes/(marketing)/blog/`.

## Verification

1. Run `npm run dev`.
2. Navigate to `http://localhost:5173/blog` to see the index.
3. Navigate to `http://localhost:5173/blog/gm-guide-data-sovereignty` to see the article.
4. Verify metadata in the head of the page.
