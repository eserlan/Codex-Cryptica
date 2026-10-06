## 2025-02-17 - Eliminate Chained Array Operations in Derived Stores

**Learning:** In Svelte 5, using chained array methods like `.filter().map()` inside `$derived` or `$derived.by` blocks is a common performance bottleneck because these blocks re-evaluate on every dependency change. Chained methods require multiple iterations over the data and allocate intermediate arrays, increasing garbage collection (GC) pressure—especially noticeable when processing large collections like `allEntities` or calendar entries.
**Action:** Always replace chained array methods with a single imperative loop (`for...of`) that pushes results into a pre-allocated or newly created array. This reduces memory allocations and ensures single-pass processing during reactive updates.

## 2024-07-26 - [Avoid Object.values() when mapping large data sets]

**Learning:** Using `Object.values(entities)` allocates an intermediate array, which can cause unnecessary GC pressure and slowdowns when called frequently or on large entity sets.
**Action:** Replace `Object.values()` iterations with an imperative `for...in` loop over the object keys, retrieving the value directly inside the loop.

## 2025-02-18 - Optimize array allocations in EntityIndexMaintainer

**Learning:** In Svelte 5 derived state and lifecycle rebuilds (like `rebuildIndexes`), replacing chained `.filter()` or intermediate `Object.values()` allocations with a single imperative loop over keys drastically reduces unnecessary garbage collection overhead on large maps, such as standard dictionaries of all entities.
**Action:** When extracting multiple derived arrays from a dictionary, avoid allocating intermediate arrays by looping via `for...in` and pushing items natively using `hasOwnProperty`.

## 2026-10-30 - Replace [...matchAll] with lazy iterator to avoid intermediate array allocation

**Learning:** When using `[...string.matchAll(regex)]` to extract multiple matches from a string (such as HTML or markdown parsing), it eagerly forces the Javascript engine to allocate an intermediate array to hold all the match objects. In hot paths or large files (like parsing large HTML sitemaps or markdown), this creates unnecessary garbage collection pressure and memory usage, particularly if the values are simply iterated over or counted.
**Action:** Replace `[...string.matchAll(regex)]` and `Array.from(string.matchAll(regex))` with an imperative `for...of` loop over the raw iterator (e.g. `for (const match of string.matchAll(regex)) { ... }`) to process the matches lazily, significantly reducing intermediate array allocations.

## 2025-02-18 - Replace Object.values with imperative loop over keys when importing buffer indices

**Learning:** When importing indexed datasets (such as a serialized flexsearch index) that may be segmented and stored as JSON payloads, extracting the byte arrays via `Object.values(buffer)` forces heavy intermediate array allocation. In large indexes, this creates unnecessary garbage collection overhead before wrapping it into `Uint8Array`.
**Action:** Replace `Object.values(buffer ?? {})` inside large parsing workflows (e.g. `SearchEngine.importIndex`) with an imperative `for...in` loop over keys to explicitly determine the count and place each entry into a `Uint8Array` directly, bypassing the intermediate javascript array entirely.

## 2026-10-04 - Refactor Iterator loops

**Learning:** Replaced the `[...html.matchAll()]` spread syntax with an imperative `for...of` loop on the iterator directly to prevent excessive intermediate array allocation overhead.
**Action:** Always prefer imperative loops over array spread with iterative methods like `.map()` or `.filter()` when manipulating iterators like Regex matchAll outputs.

## 2026-10-31 - Replace intermediate array spreads with imperative loops

**Learning:** Svelte reactivity blocks (`$derived`, `$effect`) often contain declarative array manipulations that spread iterables into intermediate arrays just to filter them (e.g., `[...selectedIds].filter()`). In hot paths or large datasets, this creates a significant performance overhead by forcing unnecessary Javascript garbage collection for the intermediate arrays.
**Action:** Always prefer initializing an empty collection and populating it with an imperative `for...of` loop over intermediate array instantiation using spreads when refactoring or optimizing reactivity hooks.
