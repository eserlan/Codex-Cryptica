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

## 2026-04-12 - [Performance Insight: Array allocation and Indexing batches]

**Learning:** When indexing many entities in `SearchEngine.add` inside a loop, an individual `this.notifyChange()` call for every entity forces UI re-renders and slows down indexing. Replacing individual `add()` calls with a batched `addBatch()` that iterates over the docs and calls `notifyChange()` only once at the end significantly reduces overhead.
**Action:** When performing bulk updates on state or indexing services, create batch APIs (like `addBatch`) to minimize reactive or event-based notifications, calling the notification only once per batch.

## 2026-04-13 - [Performance Insight: Array derived vs Map for templates]

**Learning:** Returning an array from a `$derived.by` block just to be used in a template's nested `.find()` loop results in `O(N)` lookups inside an `O(M)` loop (e.g. iterating over `categories` and calling `.find()` on `typeCounts`). Additionally, converting a `Map` to an `Array` using `.map()` and `.sort()` on every reactivity update generates GC pressure for arrays whose sort order isn't actually used.
**Action:** In Svelte 5 `$derived.by` blocks computing keyed data for `#each` loops, return the `Map` directly. Then use `.get(id)` inside the `#each` loop to turn the `O(N)` array lookup into an `O(1)` Map lookup and eliminate intermediate array allocations.

## 2026-04-16 - Avoid `.indexOf()` in Array Transformations in Svelte Reactive Blocks

**Learning:** In highly reactive Svelte blocks (e.g., `$derived.by`), using `.indexOf()` inside array transformation callbacks like `.map()` degrades performance to O(N²).
**Action:** Replace `.map().filter()` with an imperative `for` loop and use the loop index directly instead of calling `.indexOf()` on the parent array to achieve O(N) performance.

## 2026-04-19 - [Performance Insight: Array allocation in Svelte 5 nested deriveds]

**Learning:** Caching `Object.values(state)` on a class as a `$derived` property (e.g., `allTokens = $derived.by(() => Object.values(this.tokens));`) and then accessing it inside another `$derived` block (e.g., `MapView`'s `$derived.by` using `mapSession.allTokens`) avoids recursive array allocation issues and minimizes garbage collection overhead, compared to calling `Object.values(mapSession.tokens)` repeatedly within each dependent block.
**Action:** Expose an `allX = $derived.by(() => Object.values(this.X))` property on store classes whenever `Object.values` is needed by multiple external reactive derivations, and use this cached property instead of calling `Object.values` inline.

## 2026-04-21 - Avoid chaining array allocation operations for recent updates

**Learning:** Svelte 5 stores often manage small bounded arrays like "recent searches" or "recent labels". Using `[newItem, ...arr.filter(...)]` or `.slice()` allocates multiple intermediate arrays on every update, increasing overhead for simple insertions.
**Action:** Replace `...arr.filter()` or `.slice()` patterns for managing small, bounded recent lists with a single imperative loop that caps the array size.

## 2026-04-26 - [Performance Insight: Avoid chained .map().filter()]

**Learning:** Replace chained array methods like `.map().filter(Boolean)` (often used to map IDs to entities and remove nulls) or `Object.values().map()` with a single imperative loop (e.g., `for...of` or `for...in`). This eliminates the allocation and traversal of intermediate arrays, drastically reducing memory pressure and improving performance during chunk processing or event handling.
**Action:** When handling large sets of data in event callbacks like `SYNC_CHUNK_READY` or `CACHE_LOADED`, always favor simple imperative loops over chained functional array transformations.

## 2026-04-26 - [Performance Insight: Caution with manual limit loops]

**Learning:** When manually optimizing `.slice(0, limit)` with an imperative loop condition like `result.length < limit`, explicitly handle cases where `limit` might be `undefined`. Native `.slice(0, undefined)` safely copies the array, but a manual loop condition `0 < undefined` evaluates to `false`, causing the loop to terminate immediately and introducing bugs.
**Action:** Be careful when replacing standard library functions. Ensure that all edge cases (like `undefined` parameters) are correctly handled.

## 2026-04-30 - Optimize event parsing with single pass loops

**Learning:** When parsing large synchronization events in Svelte stores, using chained functional array methods like `.map().filter(Boolean)` creates intermediate arrays and increases garbage collection pressure.
**Action:** Replace `Array.prototype.map().filter()` chains with a single imperative loop (`for` loop with `push`) when parsing batch payloads, especially in hot paths like `SYNC_CHUNK_READY` in the vault engine.

## 2026-05-18 - [Performance Insight: Array allocation in object key search]

**Learning:** Svelte 5 `$derived` blocks re-evaluate when their dependencies change. If a block uses `Object.values(obj).find(...)`, it allocates a new array of all values on every evaluation. When `obj` is large (e.g., `vault.maps`), this generates significant garbage collection pressure, especially if the block is evaluated frequently.
**Action:** Replace `Object.values(obj).find(...)` with a `for...in` loop over the object's keys, checking the value directly and returning early. This completely avoids array allocation and is highly compatible with Svelte 5's fine-grained proxy tracking.

## 2026-05-18 - Replacing sort and slice with imperative bounded O(N) merge

**Learning:** In contexts where we retrieve two separate lists from the database (`pinnedRecords` and `recentCandidates`), if both are already ordered by the target sorting metric (e.g., `lastModified` descending), combining them with array spreads followed by a full `.sort()` and `.slice()` is highly inefficient (`O(N log N)`).
**Action:** Replace the spread and sort with sequential imperative loops that push directly into a target array, using early `break` statements to truncate exactly at the required limit (`O(N)`).

## 2026-05-04 - [Performance Insight: Avoid intermediate array allocation for counting elements]

**Learning:** Using `.filter(...).length` in Svelte `$derived` blocks on large arrays (like `vault.allEntities`) allocates a completely unnecessary intermediate array in memory, creating excess garbage collection pressure on every reactivity tick. While a verbose imperative loop is extremely efficient, a declarative `.reduce((count, item) => count + (condition ? 1 : 0), 0)` is slightly slower than a `for` loop but completely avoids array allocation and is far more readable.
**Action:** Use `.reduce()` instead of `.filter(...).length` when counting matching items in reactive blocks to eliminate intermediate array memory allocation without sacrificing code readability.

## 2026-05-08 - Early Exit Loops in `$derived`

**Learning:** Chaining `.filter().slice()` in Svelte `$derived` blocks, especially for autocomplete features iterating over `vault.allEntities`, forces an O(N) intermediate array allocation on every keystroke.
**Action:** Always replace `.filter(...).slice(0, limit)` with an imperative loop and an early exit (`if (result.length >= limit) break;`) for bounded search results to eliminate redundant processing and GC overhead.

## 2026-05-18 - [Performance Insight: Array allocation in iteration over Object]

**Learning:** Replaced `Object.values()` when iterating over the large `entities` record in `VaultLifecycleManager` with an imperative loop over keys (`for (const id in entities) { const entity = entities[id]; ... }`). Also replaced `...Object.values(entity.metadata || {}).flat()` with direct array push logic. This prevents creation of large intermediate arrays, reducing garbage collection pauses in hot paths like vault persistence and data loading.
**Action:** When iterating over a large object or assembling a large sequence of items, prefer an imperative iteration (`for...in`) over `Object.values()`, and direct array insertions over spread operators and `.flat()`, to eliminate intermediate allocations and garbage collection overhead.

## 2026-05-18 - [Performance Insight: Avoid array returning reduce]

**Learning:** Using `.reduce((acc, item) => { acc.push(item); return acc; }, [])` creates a closure and adds overhead compared to simply pushing to an array in an imperative `for...of` loop. In hot paths like context retrieval which occurs frequently, this can cause unnecessary GC overhead.
**Action:** Replace `.reduce()` that initializes and returns an array with an imperative `for...of` loop and a standard array `push`.

## 2026-05-18 - [Performance Insight: Array allocation in iteration over Object values in reactive blocks]

**Learning:** Svelte 5 `$derived` blocks evaluating `Object.values(obj)` inline can allocate a new array on every evaluation causing unnecessary garbage collection. While it can be solved with an imperative loop for iteration, if an array is explicitly needed by the UI, caching it natively in the store (`allX = $derived.by(() => Object.values(this.X))`) prevents the dependency from repeatedly evaluating in Svelte `MapView`.
**Action:** When working with objects representing collections in the Store that are iterated across multiple components, pre-calculate an `allX` property in the Store via `$derived.by()` and use that property in the UI, avoiding `Object.values()` allocation within UI `$derived` blocks.

## 2026-05-18 - [Performance Insight: Array allocation in map selection loop]

**Learning:** Replaced the inline array allocation `{#each Object.values(vault.maps) as map (map.id)}` with the pre-cached property `{#each vault.allMaps as map (map.id)}` in Svelte 5.
**Action:** When a Svelte UI component requires an array representation of a record/map located in a store, pre-calculate the array natively at the store level using `$derived.by(() => Object.values(this.X))` and expose it as a property to prevent redundant array allocations and unnecessary garbage collection overhead on UI updates.

## 2026-05-18 - [Performance Insight: Array allocation in object transformation]

**Learning:** Svelte `Object.fromEntries(Object.entries(obj).map(...))` allocates multiple intermediate arrays for extracting entries, transforming them, and then reassembling the object. For store methods operating on many keys, this introduces significant garbage collection pressure and CPU overhead on every invocation.
**Action:** Replace `Object.fromEntries(Object.entries(obj).map(...))` with an imperative `for...in` loop constructing a new record natively when transforming or filtering object properties in Svelte stores.

## 2026-05-18 - [Performance Insight: Array allocation in object key transformation]

**Learning:** Replacing `Object.fromEntries(Object.entries(obj).map(...))` with a `for...of Object.keys()` loop when cloning or normalizing objects prevents multiple intermediate array allocations (`O(N)` mapping, `O(N)` entries, and the resultant array), removing GC overhead. This is particularly valuable for session sanitization and snapshot functions where object processing runs frequently.
**Action:** When creating transformed copies of objects (such as `tokens` inside VTT maps), utilize an imperative `for...of Object.keys()` loop to directly build the target record natively instead of chaining functional object methods.

## 2026-05-18 - [Optimize Vault Import Parsing Stats Calculation]

**Learning:** In Svelte 5 `$derived` blocks, writing concise declarative code like `[...arrays].filter(condition).length` multiple times inside a single block can lead to significant unnecessary intermediate array allocations, memory pressure, and garbage collection overhead—especially visible when dealing with larger datasets like vault entity lists.
**Action:** When calculating multiple aggregate stats over a single array in a reactive context, favor a single-pass imperative `for...of` loop inside a `$derived.by()` block. This avoids intermediate allocations while correctly preserving reactivity and drastically reducing execution time for large arrays.

## 2025-02-12 - Imperative counting in reactive derived stores

**Learning:** In Svelte `$derived` blocks, avoiding `.filter(...).length` and `.reduce(...)` allocations against large store properties (like `vault.allEntities`) prevents closure instantiations on every reactive loop execution. Using an imperative `for...of` loop tracking an inner counter is the most garbage-collection friendly method for these common counting operations.
**Action:** Always replace `.reduce` loops inside derived counters that query `allEntities` with imperative loops to lower CPU bounds on hot rendering paths.

## 2026-06-03 - [Performance Insight: Early exit imperative loops over chained array methods for Autocomplete]
**Learning:** In `$derived` blocks for autocomplete functionality (like in `EntityListSearch.svelte`), chaining `.filter(condition).slice(0, 10)` over an array of tokens processes the entire array and creates an intermediate allocated array every time the user types. This generates noticeable lag and GC pressure when searching through many tokens.
**Action:** Replace full array `.filter().slice(0, limit)` calls with an early-exit imperative `for` loop that uses `.push()` and `if (results.length >= limit) break;`. This avoids full traversal and limits intermediate array size.

## 2026-06-16 - [Performance Insight: Reuse store indexes instead of full mapping in components]

**Learning:** Svelte components often recalculate full search indexes via `$derived` blocks, mapping over `Object.values(vault.entities)`. When `flatMap()` and `map()` are used inside these derived computations, they trigger multiple intermediate array allocations. Since the vault store already maintains a pre-calculated index incrementally (`titleAndAliasIndex`), redefining it inside component scope wastes significant GC cycles on large vaults.
**Action:** Always favor retrieving pre-calculated, flat structures directly from the store (`vault.titleAndAliasIndex`) rather than running `Object.values(store.data).flatMap()` inside UI component `$derived` blocks. If shape mapping is strictly required, use an imperative loop to populate the final array structure.
