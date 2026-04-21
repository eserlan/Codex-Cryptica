# Research: Changelog Route Investigation

## Findings

### Marketing Route Structure

- Marketing pages (`blog`, `features`, `privacy`, `terms`) live in `apps/web/src/routes/(marketing)`.
- They are SSR and Prerendered (`ssr: true`, `prerender: true`).
- Each page manages its own header/footer as the `(marketing)` layout is minimal.

### Landing Page Overlay

- The root `/` route in `apps/web/src/routes/(app)/+page.svelte` handles the landing page via an overlay (`.marketing-layer`).
- Visibility is controlled by `uiStore.isLandingPageVisible`.
- This layer currently contains a "View Features Overview" link pointing to `/features`.

### Data Source

- `apps/web/src/lib/content/changelog/releases.json` is the canonical source for all release data.
- The structure is an array of objects: `version`, `title`, `date`, `type`, `highlights`.
