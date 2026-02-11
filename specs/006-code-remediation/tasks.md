# Tasks: Code Remediation

- [ ] **Type Definitions** <!-- id: 1 -->
  - [ ] Create `apps/web/src/types/file-system.d.ts` with complete File System Access API interfaces. <!-- id: 1.1 -->
  - [ ] Update `apps/web/src/lib/stores/vault.svelte.ts` to remove `@ts-expect-error` and use the new types. <!-- id: 1.2 -->

- [ ] **Persistence Layer** <!-- id: 2 -->
  - [ ] Create `apps/web/src/lib/utils/queue.ts` implementing a `SequentialTaskQueue`. <!-- id: 2.1 -->
  - [ ] Refactor `VaultStore.scheduleSave` to use the queue instead of `setTimeout`. <!-- id: 2.2 -->
  - [ ] Add unit tests for the queue to ensure order and error handling. <!-- id: 2.3 -->

- [ ] **Graph Optimization** <!-- id: 3 -->
  - [ ] Extract `SCIFI_GREEN_STYLE` to `apps/web/src/lib/themes/graph-theme.ts`. <!-- id: 3.1 -->
  - [ ] Refactor `GraphView.svelte` effect to distinguish between data updates and layout triggers. <!-- id: 3.2 -->
  - [ ] Implement a logic check: Only run `layout.run()` if `newElements.length > 0` or `removedElements.length > 0`. <!-- id: 3.3 -->
  - [ ] **Regression Verification**: Test "Connect Mode" (node linking) manually to ensure no regressions. <!-- id: 3.4 -->
  - [ ] **Regression Verification**: Test "Search/Filters" to ensure graph updates correctly. <!-- id: 3.5 -->

- [ ] **Constitution & Quality Checks** <!-- id: 5 -->
  - [ ] **Offline Functionality Verification**: Confirm all features work without network access (Constitution VIII). <!-- id: 5.1 -->
  - [ ] Verify `npm run lint` passes for the web workspace. <!-- id: 5.2 -->
  - [ ] Verify `npm run test` passes for the web workspace. <!-- id: 5.3 -->

- [ ] **Documentation** <!-- id: 6 -->
  - [ ] Update `GEMINI.md` with the new changes. <!-- id: 6.1 -->
