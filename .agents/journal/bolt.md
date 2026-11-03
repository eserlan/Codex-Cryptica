# Bolt journal

Critical, codebase-specific lessons for the `bolt` persona sweep. Merged from the Jules-era
`.Jules/bolt.md` and `.jules/bolt.md` on 2026-11-02.

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

## 2026-10-05 - Prevent Intermediate Array Allocations when Building Run Sheet

**Learning:** Replaced chained .map().filter() in the session prep renderer to avoid short-lived intermediate arrays. Inline loops in each branch pushed the functions over Fallow's cognitive complexity gate.
**Action:** Put the single-pass loop in one small helper (`linesOf`, `joinPresent`, `present`) and keep callers declarative, so you get both the allocation saving and readable code.

## 2026-10-06 - Replace intermediate array spreads with imperative loops

**Learning:** Svelte reactivity blocks (`$derived`, `$effect`) often contain declarative array manipulations that spread iterables into intermediate arrays just to filter them (e.g., `[...selectedIds].filter()`). In hot paths or large datasets, this creates a significant performance overhead by forcing unnecessary Javascript garbage collection for the intermediate arrays.
**Action:** Always prefer initializing an empty collection and populating it with an imperative `for...of` loop over intermediate array instantiation using spreads when refactoring or optimizing reactivity hooks.

## 2025-02-28 - Replace chained array methods with an imperative loop when mapping and filtering IDs

**Learning:** When mapping an array of IDs to entities and filtering out nullish values (e.g., `[...new Set(ids)].map(getEntity).filter(Boolean)`), spreading a Set into an array and using `.map()` operation creates multiple intermediate arrays of potentially undefined values, only to be traversed and discarded by the subsequent `.filter()`. This creates unnecessary garbage collection pressure, particularly when handling UI selections.
**Action:** Replace `[...new Set].map().filter()` chains with a single imperative `for...of` loop over the Set. This allows valid resolved values to be pushed directly into the final arrays in one pass, eliminating intermediate array allocations.

## 2025-02-28 - Replace `.map().join()` with imperative loop for byte array to hex conversion

**Learning:** Using chained `.map().join("")` on an array derived from a `Uint8Array` to generate a hex string allocates multiple intermediate arrays, causing unnecessary garbage collection pressure and reducing performance by roughly 3x in hot paths.
**Action:** Replace `[...bytes].map().join("")` with an imperative loop (`let hex = ""; for (...) { hex += bytes[i]... }`) to convert byte arrays to hex strings without intermediate array allocations.

## 2026-10-25 - Avoid nested intermediate array allocations in unique Map generation

**Learning:** Constructing a Map to deduplicate entities using `new Map([...entityByNode.values()].map((e) => [e.id, e]))` allocates multiple unnecessary intermediate arrays (the spread values and the mapped tuple array) before the Map is even instantiated, significantly increasing garbage collection pressure.
**Action:** Use an imperative `for...of` loop to iterate over values and set them directly into a newly instantiated Map to eliminate the intermediate array allocations.

## 2024-06-25 - Replace intermediate array spreads/filters/maps with imperative loops when diffing sets

**Learning:** When identifying differences between two sets of data (like party joins and leaves in `SoloSession`), using chained array methods (e.g., `[...before].filter(...).map(...)`) or `next.partyIds.filter(...).map(...)` allocates multiple intermediate arrays for the spread elements, the filtered elements, and the mapped elements. For hot paths or large collections, this increases garbage collection overhead.
**Action:** Replace `[...set].filter(...).map(...)` with an imperative `for...of` loop over the set or array, manually checking the condition and pushing the mapped value directly into a newly created array.

## 2026-10-15 - Prevent chained intermediate array allocations in vault mutations

**Learning:** When generating arrays of entities for bulk update events (like \`vaultEventBus.emit({ type: "BATCH_UPDATED" })\`), using \`Object.keys(updates).map(id => entities[id])\` forces the JavaScript engine to allocate an intermediate array of keys before creating the final mapped array. In hot paths that run constantly (like vault entity batch mutations), this creates unnecessary garbage collection pressure and CPU overhead.
**Action:** Replace \`Object.keys(obj).map(...)\` with an imperative \`for...in\` loop to iterate and explicitly push into a single array, avoiding the intermediate allocation entirely. Also ensure to remove any adjacent \`Object.keys(obj).length\` checks by tracking emptiness inside the loop.

## 2024-11-20 - Avoid chained array operations inside nested loops

**Learning:** In \`sceneBriefs\`, the nested use of `.map().filter()` inside an outer \`list(structure.scenes).map(...)\` causes a geometric explosion of intermediate array allocations, significantly increasing garbage collection pressure.
**Action:** Replace nested chained operations like `.map().filter()` with a single imperative `for...of` loop when extracting relationships between collections, pushing the results directly to an array.

## 2026-10-20 - Replace chained array operations and flatMap with imperative loops for finding unmatched items

**Learning:** When filtering and mapping arrays (e.g. `assignments.filter().map()`) to create a Set, and then using `images.flatMap()` to filter based on that Set, it creates unnecessary intermediate arrays that increase garbage collection pressure.
**Action:** Replace these chained declarative array methods with imperative `for...of` loops and pre-allocated arrays (e.g., pushing directly into a result array after a `Set.has` check) to prevent intermediate allocation overhead.

## 2026-10-25 - Imperative Iteration Over Intermediate Arrays for matchAll()

**Learning:** In V8/JS engines, parsing large string payloads (like parsing generated text files or markdown content) using `String.prototype.matchAll(regex)` combined with `[...string.matchAll(...)].map(...)` eagerly evaluates the entire iterator, forcing the engine to allocate an intermediate array. This spikes garbage collection pressure and CPU usage unnecessarily for large arrays or high-frequency operations.
**Action:** Replace chained operations on iterators such as `[...matchAll(...)]` with a single imperative `for...of` loop over the iterator to process matches lazily. If mapping to a new array is required, instantiate the array and push to it inside the loop. Avoid `Array.from()` over `matchAll()` as well.

## 2026-10-31 - Replace chained array allocations with imperative loops in map transformations

**Learning:** When performing map and filter operations on iterables (such as `names.flatMap(words).map(w => w.toLowerCase())` or `[...singles].filter().map()`), using the native array method chaining forces the JavaScript engine to allocate intermediate arrays for every step. In hot paths that evaluate many items, this dramatically increases garbage collection pressure and reduces CPU efficiency.
**Action:** Replace chained declarative array methods with a single imperative loop (such as `for...of`) that processes the items sequentially and pushes valid matches directly into the destination array or Set, preventing intermediate array allocations entirely.

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

## 2026-06-17 - [Optimize entity index building in $derived]

**Learning:** In Svelte components using $derived blocks, chaining array methods like `Object.values(obj).flatMap(...)` causes significant O(N) overhead during reactive updates due to multiple intermediate array allocations.
**Action:** Replace `Object.values().flatMap(...)` with imperative loops using pre-cached array indexes (like `titleAndAliasIndex` mapped on the store) inside `$derived.by(() => { ... })` to reduce garbage collection pressure.

## 2026-06-25 - [Performance Insight: Refactoring Object.values(vault.entities) to pre-cached vault.allEntities]

**Learning:** Invoking `Object.values(vault.entities)` in component `$derived` blocks or hot functions triggers an `O(N)` object keys iteration and creates a new intermediate array on every evaluation. When `vault.entities` is large, this leads to significant redundant memory allocations and garbage collection pauses. While some components started caching arrays natively via the Store (`vault.allEntities`), many continued allocating `Object.values` inline. Also, chaining `.filter().slice().map()` or just `.filter()` onto those inline values causes even more intermediate allocations.
**Action:** Prefer `vault.allEntities` when a component needs entity values, especially when the store exposes it as cached derived state. For hot paths that repeatedly inspect the same entities, cache derived indexes such as slug sets and reuse them across calls. When a fresh traversal is required, use an imperative loop to avoid intermediate arrays; this still performs the necessary O(N) pass, but avoids repeated `Object.values()` allocations and redundant work.

## 2026-06-25 - [Performance Insight: Refactoring Object.values(guestStore.guestRoster) to pre-cached guestStore.allGuests]

**Learning:** Svelte 5 `$derived` blocks evaluating `Object.values(obj)` inline allocate a new array on every evaluation, causing unnecessary garbage collection. This pattern was identified in several components fetching `guestStore.guestRoster`.
**Action:** When working with objects representing collections in the Store that are iterated across multiple components, pre-calculate an `allX` property in the Store via `$derived.by()` and use that property in the UI, avoiding `Object.values()` allocation within UI `$derived` blocks.

## 2025-06-30 - Replace chained array methods with early-exit imperative loops

**Learning:** In `apps/web/src/lib/services/generators/generator-vault-context.ts`, building context samples via `Object.values(allEntities).filter(...).slice(0, MAX)` forces intermediate array allocations and full `O(N)` traversal of vaults. When vaults contain thousands of items, mapping and filtering the entire dataset just to capture a `MAX_TITLES` size slice severely spikes GC pressure on hot rendering/generation paths.
**Action:** When deriving subsets of objects by limits (like `MAX_WORLD_SAMPLE` or `MAX_NEIGHBORS`), always replace `Object.values(obj).filter().slice()` with imperative loops (`for (const id in allEntities)`) combined with explicit capacity limits and early returns (e.g., `if (results.length >= MAX) break;`). This guarantees `O(K)` performance bounded to the sample size limit.

## 2026-06-29 - [Performance Insight: Array allocation in object fromEntries]

**Learning:** When generating lookup objects from an array of items (like connection counts per entity) in a `$derived` block, using `Object.fromEntries(vault.allEntities.map(...))` creates two intermediate arrays: one for the mapped tuples, and another internally by `fromEntries`. This creates unnecessary memory pressure during frequent reactive updates.
**Action:** Replace `Object.fromEntries(array.map(...))` with an imperative `for...of` loop that constructs a new `Record` natively to reduce garbage collection pressure.

## 2024-05-18 - Replacing Chained Array Methods with Imperative Loops for Performance

## 2024-05-18 - Replacing Chained Array Methods with Imperative Loops for Performance

**Learning:** In VTT applications, `graph.entities` payloads can be exceptionally large (containing thousands of items). Chaining methods like `Object.entries().map().map()` followed by `Object.fromEntries()` allocates multiple large, short-lived arrays. These intermediate allocations place immense pressure on the garbage collector during data sync/initialization, leading to jank and latency spikes. Replacing these chains with a single imperative loop (`for...in`) directly building the target dictionary avoids these array allocations entirely.
**Action:** When transforming large data collections (especially dictionaries like `entities`), actively look for `Object.keys/values/entries` combined with `.map()` or `.filter()`, and refactor them into a single imperative loop.

## 2024-05-18 - Replacing Chained Array Methods with Imperative Loops for Performance

**Learning:** When generating a specific entity ID by resolving against a username across all entities (such as in `resolveGuestCharacterId`), using `Object.values(entities)` inline will allocate a new intermediate array on every resolution. Since `resolveGuestCharacterId` can be called frequently (e.g. per message, on connection setup), doing full allocations adds unnecessary memory pressure and garbage collection overhead.
**Action:** Replace `Object.values(obj)` iterations with imperative `for...in` loops accessing `obj[key]` to process objects directly without intermediate array allocation when performing matching or transforming subsets that run frequently.

## 2026-06-30 - [Performance Insight: Replace .filter() array methods with imperative loops over allEntities]

**Learning:** When navigating connections or locating children nodes, invoking `.filter()` on the large `vault.allEntities` array triggers full O(N) traversal and allocates a new intermediate array on every evaluation (such as in `DetailStatusTab` and `ZenContent`). This places pressure on the garbage collector during rendering.
**Action:** Replace `allEntities.filter(...)` with an imperative `for...of` (or traditional `for`) loop that checks conditions and constructs the necessary subsets or result shapes directly in a single pass.

## 2026-07-02 - [Performance Insight: Replace chained array methods (Array.from().map().filter()) with imperative loops]

**Learning:** In `apps/web/src/lib/services/dungeon-delve-service.ts`, using `Array.from(narrative.matchAll(...)).filter()` allocates multiple intermediate arrays for the regex matches, the mapped strings, and the filtered results. In hot paths or large narratives, this creates unnecessary GC pressure.
**Action:** Replace chained array generation methods over iterators with imperative `for...of` loops that push valid results directly into the final array.

## 2026-08-08 - [Verify Production Code Before Modifying Test Mocks]

**Learning:** Replacing an expensive `.filter()` operation on `Object.values(entities)` with an imperative loop on `allEntities` is a good performance pattern. However, you must first verify that `allEntities` actually exists on the production object being modified (e.g. `vault`). If it does exist in production, it is correct to update the test mock to include it. If it does not exist, adding it only to the test mock will cause a `TypeError: Cannot read properties of undefined` in production, leading to a crash.
**Action:** When refactoring to use a pre-calculated property (like `allEntities`), explicitly verify its existence in the real production code (not just the mock) before changing the test. Do not artificially mask errors by adding missing properties to test mocks.

## 2024-05-18 - Replacing Chained Array Methods with Imperative Loops for Performance

**Learning:** Svelte 5 `$derived` blocks evaluating `Object.values(obj)` inline allocate a new array on every evaluation, causing unnecessary garbage collection. This pattern was identified in several components fetching `guestStore.guestRoster`.
**Action:** When working with objects representing collections in the Store that are iterated across multiple components, pre-calculate an `allX` property in the Store via `$derived.by()` and use that property in the UI, avoiding `Object.values()` allocation within UI `$derived` blocks.

## 2024-05-18 - Replacing inline array .filter().length with imperative counting in Svelte derived states

**Learning:** In Svelte `$derived` blocks, chaining `.filter(...).length` on potentially large arrays creates an entirely new intermediate array in memory just to count its elements. This causes unnecessary garbage collection pressure and CPU overhead on every reactive update.
**Action:** Replace inline `.filter(...).length` derivations with `$derived.by()` utilizing an imperative `for` loop that iterates over the original array and increments a counter based on the filter logic. This reduces the memory complexity of the count from O(N) to O(1).

## 2026-08-14 - Replacing chained array methods with imperative early-exit loops

**Learning:** When acting as the 'Bolt' persona, do not replace single native array methods like `array.filter()` or `array.every()` with verbose imperative loops, as this is a micro-optimization that degrades readability. Reserve imperative loop optimizations for replacing chained array methods (e.g., `.map().filter().slice()`), eliminating unnecessary allocations (e.g., `[...set].map()`), or introducing early exits to reduce algorithmic complexity (e.g., O(N) to O(K)).
**Action:** When working with large datasets, replace chains of array mapping and filtering (like `[...set].map().filter().slice()`) with a single imperative `for...of` loop and an early `break` condition to avoid massive intermediate array allocations.

## 2026-08-14 - Limit imperative array optimizations to high-impact bulk paths

**Learning:** While it is beneficial to avoid allocating intermediate arrays in Svelte reactive blocks for truly massive state arrays or bulk processing logic (like in `apps/web/src/lib/stores/vault/bulk-results.ts`), replacing simple, concise 1-line statements like `array.filter(...).length` with verbose 10-line imperative loops inside standard UI components (like `ImportWizard.svelte`) violates the 'never sacrifice code readability for micro-optimizations' rule.
**Action:** When acting as the 'Bolt' persona, only refactor array pipelines to imperative loops in non-UI modules (e.g. stores, workers, data-processing pipelines) or when specifically querying massive global arrays (e.g. `vault.allEntities`). Do not optimize small, ephemeral arrays inside UI components unless profiling shows they are an active bottleneck.

## 2026-08-18 - Replacing chained array generation methods over iterators with imperative loops

**Learning:** In markdown parsing components (like `generator-document-layout.ts` and `markdown-sections.ts`), using `Array.from(markdown.matchAll(...)).map()` forces the JavaScript engine to eagerly evaluate the entire iterator into an intermediate array of match objects, only to immediately throw it away after mapping it into another array. For large generator documents, this spikes unnecessary garbage collection pressure during formatting.
**Action:** Replace `Array.from(iterator).map()` with a single imperative `for...of` loop over the iterator. This processes the matches lazily, avoids the intermediate `.map` array allocation, and pushes directly into the final array.

## 2025-02-24 - Avoid allocating unused objects by replacing map().filter() with a loop

**Learning:** When chained array methods like `.map().filter()` create new objects in the `.map()` phase (e.g., `images.map(f => ({ file: f, index })).filter(...)`), they instantiate objects that are immediately thrown away by the subsequent filter. This creates unnecessary garbage collection pressure beyond just the intermediate array allocation.
**Action:** Replace `.map(x => ({...})).filter(...)` chains with a single imperative loop. Only instantiate the new object if the condition passes, pushing it directly into the result array.

## 2025-02-27 - Object.values + filter optimization

**Learning:** Calling `Object.values(obj).filter(...)` repeatedly inside reactive/derived blocks creates multiple intermediate arrays and adds heavy garbage collection pressure. This is particularly harmful in hot paths like VTT (Virtual TableTop) tile snapping/placing, which evaluates on every mouse movement.
**Action:** Replace `Object.values(obj).filter(...)` chains with an imperative `for...in` loop that uses `Object.prototype.hasOwnProperty.call(obj, key)` to safely iterate the object keys and conditionally push to a single result array.

## 2024-05-18 - Replacing Object.fromEntries(array.map(...)) with imperative loops for performance

**Learning:** When building an object/record from an array of keys (such as `entityDetailTabs`), using `Object.fromEntries(array.map(...))` creates two intermediate arrays: one from `.map()` for the `[key, value]` tuples, and another internally by `fromEntries`. This creates unnecessary memory pressure and garbage collection overhead, especially in hot paths.
**Action:** Replace `Object.fromEntries(array.map(...))` with an imperative `for...of` loop. Initialize an empty Record and assign the properties directly within the loop to avoid intermediate array allocations.

## 2025-02-28 - Optimize derived block collection filters

**Learning:** Chaining array methods like `Object.values(obj).filter(...)` inside Svelte `$derived` or `$derived.by` blocks creates intermediate arrays that add to garbage collection pressure, particularly in frequently updated components. Using pre-derived arrays (like `allTokens`) and filtering them via imperative loops is more efficient for larger datasets.
**Action:** When extracting data from objects in reactive blocks, use a single imperative `for...in` loop with `hasOwnProperty` check, or if a flat derived array already exists, use an imperative `for` loop to filter results instead of chaining `.filter()`.

## 2026-08-30 - Focus on eliminating intermediate arrays, avoid pure syntax rewrites

**Learning:** When acting as the 'Bolt' persona, avoid refactoring simple object iterations like `Object.keys(obj).filter(...)` into traditional `for...in` loops unless operating on massive data structures, as it's often rejected in code review as an unmeasurable micro-optimization that harms readability.
**Action:** Focus instead on chained array methods like `.map().filter()` that explicitly allocate unused intermediate objects or arrays (e.g., mapping strings to trim them before filtering out empty ones), as replacing these with a single imperative loop offers a clearer memory optimization without sacrificing readability.

## 2024-08-30 - Eliminate chained array allocations in SettlementFormFields

**Learning:** Replacing chained array allocations (`Object.entries().filter().map()`) followed by `Object.fromEntries()` with a single imperative loop over object properties reduces object instantiation overhead and intermediate array generation. This is especially useful for logic run frequently (like reactive declarations and effects).
**Action:** When extracting data or building objects in frequent/reactive paths, utilize imperative `for...in` or `for...of` loops rather than chaining high-level JS array methods if array allocations become a bottleneck. Ensure the component remains readable.

## 2026-10-25 - [Performance Insight: Avoid intermediate array allocation when translating Map values]

**Learning:** When using `Map.get(id)` over an array of IDs to build a new array of matching values, chaining `.map(id => map.get(id)).filter(Boolean)` forces the creation of an intermediate array containing potentially undefined values, only to immediately traverse and filter it into a second array.
**Action:** Replace `array.map().filter()` when querying Maps (like `byId.get(id)`) with a single imperative `for...of` loop over the IDs. This allows pushing valid resolved values directly into the final array in a single O(N) pass, completely eliminating the intermediate array allocation and reducing garbage collection pressure.

## 2026-10-25 - [Performance Insight: Avoid intermediate array allocation when parsing and mapping lists]

**Learning:** In data parsing functions, like those normalising lists in generator responses (`public-plot-twist.ts`), using `Array.isArray(value) ? value.map(text).filter(Boolean) : ...` forces the creation of an intermediate mapped array that might contain empty strings, only to traverse it again to filter them out. This causes unnecessary garbage collection pressure on frequently-called parsing code paths.
**Action:** Replace `array.map().filter()` when processing parsed values with an imperative `for...of` loop over the elements, checking and pushing the transformed values directly into the result array.

## 2025-05-18 - Avoid array allocation when mapping iterables

**Learning:** When using `[...iterable].filter(...).map(...)` on collections like Maps, it creates multiple intermediate arrays, causing unnecessary allocations.
**Action:** Replace chained array methods on iterables with a single imperative `for...of` loop to avoid intermediate allocations and reduce GC pressure.

## 2024-05-23 - Avoid Object.fromEntries(Object.entries().map()) in Hot Paths

**Learning:** Using Object.fromEntries with a mapped Object.entries array creates two intermediate arrays, increasing garbage collection pressure. This is especially impactful in serialization paths like index compression where object counts can be large.
**Action:** Use an imperative loop to populate a new object or Record when transforming object values instead of chaining Object.entries().map() into Object.fromEntries.

## 2026-09-07 - Avoid Object.fromEntries(array.map(...)) in UI Components and Hot Paths

**Learning:** Constructing objects using `Object.fromEntries(array.map(...))` or `Object.fromEntries(Object.entries(...).map(...))` allocates multiple intermediate arrays that are immediately discarded, increasing garbage collection pressure. This is especially prevalent when transforming arrays of items into lookup records or updating object state in UI handlers.
**Action:** Use an imperative `for...of` or `for` loop to instantiate and populate a `Record` directly (e.g., `const result: Record<string, Item> = Object.create(null); for (let i = 0; i < items.length; i++) { result[items[i].id] = items[i]; }`). Use `Object.create(null)` for ID-keyed records to prevent prototype pollution from special keys like `__proto__`. This avoids temporary array allocations and is measurably faster for large objects or frequent UI updates. Avoid this optimization in cold paths like tests or static data initialization where readability outweighs unmeasurable micro-optimizations.

## 2025-02-23 - Replace `.map().join()` with imperative loop for deep stringification

**Learning:** Using chained `.map().join()` in a recursive `stableStringify` function creates heavy intermediate string array allocations. For complex object structures, this causes measurable GC pressure and latency spikes.
**Action:** Replace `.map().join()` with imperative string concatenation loops (`let s = "["; for (...) { s += ... }`) in hot code paths dealing with deep serialization, saving considerable allocation overhead.

## 2024-05-24 - Imperative loops instead of .filter().map()

**Learning:** Chained array methods like `array.filter(condition).map(transformation)` allocate intermediate arrays which can cause garbage collection pressure, especially when executed frequently or on large collections (like iterating over canvas nodes or entities in the vault).
**Action:** Replace `.filter().map()` chains with single imperative `for...of` loops and array `push` on the hot paths for better performance without sacrificing readability, applying it to elements like mapping nodes.

## 2025-02-23 - Optimize Canvas Drawing Path

**Learning:** Using chained `.map().join()` in hot pointer event paths like free-hand drawing generates large amounts of intermediate string arrays, causing frequent garbage collection and frame drops.
**Action:** Replace `.map().join()` with imperative loops (e.g. `for (const point of points) { path += ... }`) in hot frontend logic loops to significantly decrease GC pressure.

## 2025-05-23 - Optimize flattenText using imperative loops in mystery-staged-normalize

**Learning:** When using recursive flatten functions that map arrays and object values using \`.map(flattenText).filter(Boolean)\` (such as \`flattenText\` in \`mystery-staged-normalize.ts\`), the JavaScript engine is forced to allocate intermediate arrays for mapping results before filtering them. This causes unnecessary garbage collection pressure, especially when the parsing runs repeatedly across deep object structures generated by AI models.
**Action:** Replace \`.map(flattenText).filter(Boolean)\` with an imperative \`for...of\` or \`for...in\` loop to evaluate values lazily, only pushing non-empty strings directly into the final array.

## 2025-01-20 - Reducing Garbage Collection Overhead with Sets

**Learning:** In the generator-engine, chained array operations `.filter().map()` inside a `Set` initialization create intermediate array allocations that add significant garbage collection pressure.
**Action:** Replace `new Set(array.filter().map())` patterns with imperative `for...of` loops and explicit `set.add()` calls to eliminate intermediate arrays entirely.

## 2025-05-18 - Replacing Object.fromEntries(Object.entries().map()) with imperative loops

**Learning:** Using `Object.fromEntries(Object.entries(obj).map(...))` creates two intermediate arrays, increasing garbage collection pressure. This pattern is particularly harmful inside hot paths like reactive derived blocks in Svelte.
**Action:** Replace `Object.fromEntries(Object.entries(obj).map(...))` with an imperative `for...in` loop to iterate through the object properties and populate a new object to significantly reduce garbage collection pressure.
