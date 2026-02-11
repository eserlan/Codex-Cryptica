# Tasks: Scalability Hardening

- [ ] **Infrastructure: IndexedDB Schema** <!-- id: 1 -->
  - [ ] Update `apps/web/src/lib/utils/idb.ts` to include `vault_cache` object store. <!-- id: 1.1 -->
  - [ ] Create `apps/web/src/lib/services/cache.ts` service to wrap IDB operations (get, set, clear). <!-- id: 1.2 -->

- [ ] **Core: Smart Loading Logic** <!-- id: 2 -->
  - [ ] Refactor `VaultStore.loadFiles` to iterate directory entries first (fast). <!-- id: 2.1 -->
  - [ ] Implement `shouldProcessFile` logic: check IDB `lastModified` vs File `lastModified`. <!-- id: 2.2 -->
  - [ ] **Hit Path**: Load from IDB, skip parsing. <!-- id: 2.3 -->
  - [ ] **Miss Path**: Read file, parse, update IDB. <!-- id: 2.4 -->

- [ ] **UX: Progressive Rendering** <!-- id: 3 -->
  - [ ] Update `VaultStore.entities` incrementally per chunk (e.g. every 20 files) instead of at the end. <!-- id: 3.1 -->
  - [ ] Verify Graph View reacts smoothly to incremental additions without layout thrashing (leveraging previous optimization). <!-- id: 3.2 -->

- [ ] **Feature: Rebuild Index** <!-- id: 4 -->
  - [ ] Add "Rebuild Index" button to `VaultControls.svelte` or Settings. <!-- id: 4.1 -->
  - [ ] Implement `VaultStore.rebuildIndex()` which clears IDB and re-runs load. <!-- id: 4.2 -->

- [ ] **Quality Assurance** <!-- id: 5 -->
  - [ ] **Offline Functionality Verification**: Ensure caching works without network (Constitution VIII). <!-- id: 5.1 -->
  - [ ] Performance Test: Load a vault, reload page, verify 2nd load is faster. <!-- id: 5.2 -->
  - [ ] Verify `npm run lint` and `npm run test` pass. <!-- id: 5.3 -->
