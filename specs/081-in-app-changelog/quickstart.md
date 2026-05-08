# Quickstart: In-App & Dedicated Changelog

## Adding Release Data

1. Open `apps/web/src/lib/content/changelog/releases.json`.
2. Add a new `ReleaseEntry` to the top of the array.
3. The system automatically handles:
   - Automatic modal notification for returning users on version bump.
   - Updates to the manual "What's New" modal.
   - Updates to the dedicated `/changelog` public page.

## Manual Access

- **Workspace**: Click **Settings > About > What's New**.
- **Marketing**: Access via `/changelog` route or the "Full Changelog" link on the landing page.

## SEO Management

- Metadata (Title/Description) is managed in `apps/web/src/routes/(marketing)/changelog/+page.svelte`.
- Canonical URLs are generated via `apps/web/src/routes/(marketing)/changelog/+page.ts`.
