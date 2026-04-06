# Quickstart: Public Route Prerendering

How to verify and work with prerendered marketing routes.

## Verification

### Local Build Test

To verify that routes are correctly prerendered, run the production build:

```bash
npm run build --workspace=web
```

Check the `apps/web/build` directory. You should see:

- `index.html` (The root `/`)
- `features.html` (or `features/index.html`)
- `privacy.html`
- `terms.html`

### HTML Content Check

Use `curl` to check if the HTML body contains content without JavaScript:

```bash
# After building and starting a preview server
curl http://localhost:4173/features | grep "Core Features"
```

## Adding New Prerendered Routes

1.  Create the route in `apps/web/src/routes/[new-route]`.
2.  Add a `+page.ts` file with:
    ```typescript
    export const prerender = true;
    export const ssr = true;
    ```
3.  Add the route to the `prerender.entries` array in `apps/web/svelte.config.js`.
4.  Add the route to `apps/web/static/sitemap.xml`.

## Handling Browser Globals

If you need to use `window` or `document` in a component that will be prerendered, guard it:

```typescript
import { browser } from "$app/environment";

if (browser) {
  // Safe to use window/document here
}
```

Alternatively, use `onMount`, which only runs on the client. Note that content generated _only_ in `onMount` will not appear in the prerendered HTML.
