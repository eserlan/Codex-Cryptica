# Implementation Plan: Staging Environment

## 1. SvelteKit Configuration

- Modify `apps/web/svelte.config.js` to respect `process.env.BASE_PATH`.
- Default `base` path remains an empty string for production.

## 2. CI/CD Workflow (GitHub Actions)

- Update `.github/workflows/deploy.yml`:

  - **Triggers**: Push to `main`, `feat/*`, `fix/*`.

  - **Build 1 (Prod)**: Checkout `main`, build to `dist/`.

  - **Build 2 (Staging)**: Checkout triggered branch, build to `dist/staging/` with `VITE_STAGING=true`.

  - **Artifact**: Upload combined `dist/`.

  - **404 Handling**: Ensure both `dist/404.html` and `dist/staging/404.html` exist for SPA support on GitHub Pages.

## 3. UI Gating

- Update `apps/web/src/routes/+layout.svelte`.
- Add logic to render `<DebugConsole />` if `import.meta.env.VITE_STAGING === 'true'`.

## 4. Verification

- Confirm production URL loads at `/`.
- Confirm staging URL loads at `/staging`.
- Confirm `Debug Log` button is visible at `/staging` but hidden at `/`.
