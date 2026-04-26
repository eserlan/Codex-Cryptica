1. **Optimize array allocation in `SYNC_CHUNK_READY` event handlers.**
   - In `apps/web/src/lib/services/search.ts`, replace `event.newOrChangedIds.map(id => event.entities[id]).filter(Boolean)` with an imperative `for` loop to avoid allocating two intermediate arrays.
   - In `apps/web/src/lib/stores/vault/search-store.svelte.ts`, replace the identical `.map().filter(Boolean)` with an imperative `for` loop that pushes directly to a `promises` array.
2. **Optimize `Object.values().map()` in `CACHE_LOADED` event handler.**
   - In `apps/web/src/lib/stores/vault/search-store.svelte.ts`, replace `Object.values(event.entities).map(e => this.indexEntity(e))` with a `for...in` loop to avoid allocating intermediate arrays for values and promises.
3. **Run tests and linters.**
   - Ensure the app still functions correctly and no tests are broken.
4. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
5. **Submit PR.**
   - Title: `⚡ Bolt: Optimize array allocations during search indexing events`
