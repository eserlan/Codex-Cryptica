# Quickstart: Deploying to GitHub Pages

## Prerequisites
1. GitHub Repository secret `VITE_GOOGLE_CLIENT_ID` must be configured in **Settings > Secrets and variables > Actions**.
2. GitHub Pages must be set to deploy from "GitHub Actions" in **Settings > Pages > Build and deployment > Source**.

## Deployment Flow
1. Push changes to the `main` branch.
2. The `Deploy to GitHub Pages` action will trigger automatically.
3. Build artifacts are generated and pushed to the static hosting environment.

## Manual Testing
1. Navigate to `https://codexcryptica.com/`.
2. Verify assets (icons, styles) load correctly.
3. Refresh the page on a sub-page to verify SPA fallback works (404.html).

