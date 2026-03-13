# Tasks: Pop-out Help Window

## Phase 1: Setup & Foundational

- [ ] T001 Create new standalone route file at `apps/web/src/routes/help/+page.svelte`
- [ ] T002 Update `isPopup` derived state in `apps/web/src/routes/+layout.svelte` to whitelist both `${base}/oracle` and `${base}/help`
- [ ] T003 Verify `helpStore.init()` is called and functional in the new `/help` route

## Phase 2: User Story 1 - Side-by-Side Reference [US1]

- [ ] T004 Create shared `apps/web/src/lib/components/help/HelpHeader.svelte` by extracting search/actions from `HelpTab.svelte`
- [ ] T005 [US1] Add "Pop-out" icon button to `HelpHeader.svelte` (or `HelpTab.svelte`)
- [ ] T006 [P] [US1] Implement `openHelpWindow` method in `apps/web/src/lib/stores/help.svelte.ts` using `window.open`
- [ ] T007 [US1] Add `isStandalone` prop to `HelpTab.svelte` to hide the pop-out button when in standalone mode

## Phase 3: Polish & Verification [US2]

- [ ] T008 [US2] Ensure `/help` standalone route has appropriate padding and background for separate window use (verify theme state inheritance)
- [ ] T009 [US2] Add unit test in `apps/web/src/lib/content/loader.test.ts` or similar to verify help article availability
- [ ] T010 [US2] Verify search functionality works independently in both windows
