# Tasks: SEO & Performance Optimization

## Phase 1: Automated Auditing Setup

- [x] T001 Install `unlighthouse` and `start-server-and-test` as devDependencies in `apps/web/package.json`
- [x] T002 Create `apps/web/unlighthouse.config.ts` with target thresholds (SEO > 90, Accessibility > 90)
- [x] T003 Add `audit` and `build:audit` scripts to `apps/web/package.json` for manual and CI usage
- [x] T004 Exclude private and test-only routes from the scanner in `unlighthouse.config.ts`
- [x] T005 [P] Run initial audit baseline and verify configuration works

## Phase 2: Global SEO Metadata

- [x] T006 Implement dynamic `<title>` and `<meta name="description">` tags in `apps/web/src/routes/+layout.svelte`
- [x] T007 Add Open Graph (`og:title`, `og:description`, `og:type`) tags for social media previews
- [x] T008 Add Twitter Card metadata (`twitter:card`, `twitter:site`) to the root layout
- [x] T009 [US3] Create `apps/web/src/routes/features/+page.svelte` to index application capabilities statically
- [x] T009a Create `apps/web/static/robots.txt` allowing all crawlers, including `Google-Extended`
- [x] T009b Create `apps/web/static/sitemap.xml` listing all public routes
- [x] T009c Add `<link rel="sitemap">` to `apps/web/src/routes/+layout.svelte`

## Phase 3: Marketing Landing Page (User Story 2)

- [x] T010 Implement `skipWelcomeScreen` state in `apps/web/src/lib/stores/ui.svelte.ts` with `localStorage` persistence
- [x] T011 Create high-performance marketing content for the root route `apps/web/src/routes/+page.svelte`
- [x] T012 Consolidate landing page actions into a single primary "Enter Workspace" call-to-action.
- [x] T013 Update `apps/web/src/routes/+layout.svelte` to conditionally show the Landing Page based on UI state
- [x] T014 [US2] Verify landing page bypass logic for returning users with `skipWelcomeScreen` enabled

## Phase 4: UI Refinement & Integration

- [x] T015 Add "Skip Welcome Screen" toggle to the Aesthetics tab in `apps/web/src/lib/components/settings/SettingsModal.svelte`
- [x] T016 Implement "Hide welcome screen on startup" checkbox directly on the landing page UI
- [x] T017 Refactor `uiStore` state names for better clarity (`showLandingPage` -> `skipWelcomeScreen`)
- [x] T018 Resolve security risks by serving PDF workers from local origin in `apps/web/package.json` and code

## Phase 5: Verification & Success Criteria

- [x] T019 [SC-001/SC-002] Run final `npm run build:audit` and confirm all scores meet or exceed budget
- [x] T020 [SC-003] Use browser devtools to verify TTI < 1.5s and LCP < 1.2s on landing page
- [x] T021 [SC-004] Manually verify that `/features` is correctly indexed by simulated crawler agents
- [x] T022 [CON-VII] Create 'apps/web/src/lib/content/help/landing-page.md' to document the new protocols.

## Dependencies

- Phase 1 must be completed first to establish the audit baseline.
- Phase 2 and Phase 3 can be developed in parallel once Phase 1 is in place.
- Phase 4 and Phase 5 are final polish and verification steps.

## Implementation Strategy

- **Audit-First**: Always use the audit report to guide performance and accessibility improvements.
- **Progressive Enhancement**: Ensure the marketing content remains readable even if JS fails to load.
- **User Choice**: Prioritize the power user experience by making the landing page easy to bypass forever.
