# Quickstart: Implement llms.txt standard

## Verification Steps

### 1. Manual Inspection

- Open `apps/web/static/llms.txt` and verify Markdown structure.
- Open `apps/web/static/llms-full.txt` and ensure it contains concatenated content from core packages.

### 2. Local Server Test

1. Run the local dev server: `npm run dev --workspace=web`
2. Visit `http://localhost:5173/llms.txt` and `http://localhost:5173/llms-full.txt`.
3. Verify the Content-Type header is `text/plain`.

### 3. SEO/Discoverability Check

1. Open the homepage in a browser.
2. View Page Source (`Ctrl+U`).
3. Search for `<link rel="llms"`.

### 4. Crawler Accessibility

1. Visit `http://localhost:5173/robots.txt`.
2. Ensure there is no `Disallow: /llms.txt` and ideally an explicit `Allow: /llms.txt`.

## Automated Validation

Run the E2E test suite:

```bash
npm run test:e2e -- tests/seo.spec.ts
```

_(A new test case should be added to `seo.spec.ts` to verify these files exist and are correctly linked)_
