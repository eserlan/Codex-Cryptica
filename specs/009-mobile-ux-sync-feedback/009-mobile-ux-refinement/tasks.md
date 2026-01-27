# Tasks: Mobile UX Refinement

- [x] **UI: Header Responsiveness** <!-- id: 1 -->
    - [x] Update `apps/web/src/routes/+layout.svelte` to use a responsive grid/flex layout for the header. <!-- id: 1.1 -->
    - [ ] Implement a mobile-only "actions" menu or overflow for `VaultControls` if necessary. <!-- id: 1.2 -->

- [x] **UI: Cloud Sync Feedback** <!-- id: 2 -->
    - [x] Refine `CloudStatus.svelte` animation (already partially started in uncommitted changes). <!-- id: 2.1 -->
    - [x] Add a subtle "Syncing..." status text or tooltip that is visible on mobile. <!-- id: 2.2 -->
    - [ ] Implement a "Success" flash or toast after manual sync completion. <!-- id: 2.3 -->

- [ ] **UI: Layout & Panels** <!-- id: 3 -->
    - [x] Update `EntityDetailPanel.svelte` to use absolute positioning or a bottom-sheet pattern on small screens. <!-- id: 3.1 -->
    - [ ] Ensure `GraphView` and `MarkdownEditor` resize correctly without breaking the layout. <!-- id: 3.2 -->

- [ ] **Quality Assurance** <!-- id: 4 -->
    - [ ] Verify responsiveness in Chrome DevTools (375px, 768px, 1024px). <!-- id: 4.1 -->
    - [ ] Run Playwright tests for sync feedback. <!-- id: 4.2 -->
    - [ ] Lint & Type Check. <!-- id: 4.3 -->
