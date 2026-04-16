# Tasks: In-App & Dedicated Changelog

## Phase 1: Route Setup

- [x] T101 Create `apps/web/src/routes/(marketing)/changelog/+page.ts` for SSR/Prerender config and data loading.
- [x] T102 Create `apps/web/src/routes/(marketing)/changelog/+page.svelte` with "The Chronology" layout.

## Phase 2: Navigation Integration

- [ ] T201 Add "View Full Changelog" link to the Marketing Layer in `apps/web/src/routes/(app)/+page.svelte`.
- [ ] T202 Add a link to the `/changelog` page in the `SettingsModal.svelte` "About" section.

## Phase 3: SEO & Polish

- [ ] T301 Verify meta tags and canonical URL on the `/changelog` page.
- [ ] T302 Ensure responsive behavior across mobile and desktop for the new chronology view.

## Phase 4: Verification

- [ ] T401 Add Playwright E2E test to verify navigation to `/changelog` and existence of anchor links.
- [ ] T402 Verify `npm test` passes for related components.
