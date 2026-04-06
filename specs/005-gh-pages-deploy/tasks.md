# Tasks: GitHub Pages Deployment

**Feature**: GitHub Pages Deployment (`005-gh-pages-deploy`)
**Status**: Implemented

## Dependencies

- [x] **Phase 1 (Setup)**: Blocks all.
- [x] **Phase 2 (Foundational)**: Blocks Phase 3 and Phase 4.
- [x] **Phase 3 (US1)**: Prerequisite for verifying Phase 4.
- [x] **Phase 4 (US2)**: Final integration of automation.

## Phase 1: Setup

**Goal**: Prepare the development environment with necessary dependencies.

- [x] T001 Install `@sveltejs/adapter-static` in `apps/web/package.json`
- [x] T002 Remove `@sveltejs/adapter-auto` from `apps/web/package.json`

## Phase 2: Foundational (Build Configuration)

**Goal**: Configure SvelteKit for static Single Page Application (SPA) output.

- [x] T003 Update `apps/web/svelte.config.js` to use `adapter-static` with `fallback: 'index.html'`
- [x] T004 [P] Update `apps/web/svelte.config.js` to set `paths.base` to `'/Codex-Arcana'`
- [x] T005 [P] Create `apps/web/src/routes/+layout.ts` with `export const prerender = false;` and `export const ssr = false;` to force SPA mode
- [x] T006 Verify local build integrity by running `npm run build` in `apps/web/` and inspecting the `build/` directory

## Phase 3: Web Access (User Story 1 - P1) 🎯 MVP

**Goal**: Ensure the app can be reached and navigated via a subdirectory URL.

- [x] T007 [US1] Update asset references in `apps/web/src/routes/+error.svelte` to use base path
- [x] T008 [US1] Ensure the `CodexArcana` folder re-discovery logic in `apps/web/src/lib/cloud-bridge/google-drive/adapter.ts` handles the base path correctly (Verified: uses popup/redirect and GAPI which is path-agnostic)
- [x] T009 [US1] Manually verify build artifacts (Verified index.html and 404.html presence)

## Phase 4: Automated Delivery (User Story 2 - P2)

**Goal**: Automate deployment via GitHub Actions.

- [x] T010 [US2] Create `.github/workflows/deploy.yml` with build and deployment steps for GitHub Pages
- [x] T011 [US2] Configure `VITE_GOOGLE_CLIENT_ID` in GitHub Repository Secrets (User action required)
- [x] T012 [US2] Update the workflow permissions to allow writing to the repository (Included in deploy.yml)

## Phase 5: Polish & Cross-Cutting Concerns

**Goal**: Final validation and optimization.

- [x] T013 Verify that the `404.html` fallback is created (Added to build script in package.json)
- [x] T014 Ensure `VITE_GOOGLE_CLIENT_ID` is correctly picked up by the production build (Added to workflow)
- [x] T015 Document the repository settings required in `specs/005-gh-pages-deploy/quickstart.md`
- [ ] T016 **Offline Functionality Verification**: (Pending live deploy)
- [ ] T017 Verify Success Criterion SC-001: (Pending live deploy)
- [ ] T018 Verify Success Criterion SC-003: (Pending live deploy)

## Implementation Strategy

1. **Local Configuration First**: Switch to `adapter-static` and verify that a local build generates a functional SPA.
2. **Path Handling**: Fix the base path issues locally before attempting a cloud deploy.
3. **CI/CD Integration**: Once local builds are perfect, implement the GitHub Action.
4. **Secrets Setup**: Remind the user to add the `VITE_GOOGLE_CLIENT_ID` to GitHub Secrets.
