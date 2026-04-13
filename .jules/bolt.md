## 2026-03-07 - [Performance Insight: Array allocation in getters]

**Learning:** The `vault.allEntities` property is actually a getter that returns `Object.values(this.entities)`. Calling it multiple times allocates multiple new arrays.
**Action:** In iterative computations or `$derived` blocks in Svelte 5, explicitly call `Object.values(vault.entities)` once and cache the result locally, or iterate over keys, to avoid redundant memory allocation and GC pressure.

## 2026-03-15 - [Performance Insight: Array allocation and Svelte 5 derived state]

**Learning:** The `vault.allEntities` property is actually a getter that returns `Object.values(this.entities)`. Calling it multiple times allocates multiple new arrays. In Svelte 5 components, combining multiple aggregate calculations into a single `$derived.by` block using a one-pass imperative loop should ONLY be done if they share the exact same reactive dependencies. Combining states with different update frequencies (e.g., static entities vs. active search queries) destroys fine-grained reactivity and causes performance regressions.
**Action:** When optimizing Svelte 5 reactivity, cache the getter once inside each separate `$derived.by` block. Keep fast-changing derived states (like `filteredEntities`) separate from slow-changing ones (like `types`) while still optimizing their internal loops.

## 2026-03-24 - Optimize chained array methods

**Learning:** Chained array methods (like `.filter().map()`) over large object value arrays (`Object.values()`) allocate multiple intermediate arrays and can significantly impact performance, especially when run frequently or on large state. Replacing them with a single imperative loop using cached arrays (like `vault.allEntities`) reduces iterations and GC pressure.
**Action:** Always identify long array method chains on hot paths or large datasets and rewrite them as a single imperative loop where applicable.

## 2026-04-02 - [Performance Insight: Single-pass array partitioning]

**Learning:** Replacing multiple `.filter()` calls on the same array with a single imperative `for...of` loop to partition elements into multiple destination arrays reduces iterations from 2N to N and avoids redundant closures. For a 100-item array, this yielded a ~2.4x speed improvement. Additionally, parallelizing IndexedDB deletions with `Promise.all` instead of sequential `await` in a loop eliminates the N+1 performance bottleneck.
**Action:** Use a single-pass loop when partitioning or filtering the same collection into multiple buckets. Always use `Promise.all` for independent database operations in loops to ensure concurrent execution.

## 2026-04-09 - [Performance Insight: Concurrent IndexedDB Delete]

**Learning:** Deleting records sequentially using an IndexedDB cursor is a known N+1 anti-pattern because awaiting `store.delete()` on each record sequentially is notoriously slow due to the event loop overhead for every single deletion.
**Action:** Replaced the sequential cursor deletion with `index.getAllKeys()`, followed by batched concurrent `Promise.all` deletions.

## 2026-04-12 - [Reduced Comlink IPC Overhead for Search Indexing]

**Learning:** Sequential calls to methods on a Comlink worker from the main thread (like `api.add()`) in a loop serialize many individual postMessage events across the Web Worker boundary. This IPC overhead and any subsequent reactive state notifications (like `notifyChange()`) per document can cause main thread stutter or bloated queueing.
**Action:** Always prefer batch APIs (like `addBatch()`) for bulk operations interacting with Web Workers to minimize IPC serialization overhead and reduce the frequency of internal state change notifications.
