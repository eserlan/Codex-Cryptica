## 2026-03-07 - [Performance Insight: Array allocation in getters]

**Learning:** The `vault.allEntities` property is actually a getter that returns `Object.values(this.entities)`. Calling it multiple times allocates multiple new arrays.
**Action:** In iterative computations or `$derived` blocks in Svelte 5, explicitly call `Object.values(vault.entities)` once and cache the result locally, or iterate over keys, to avoid redundant memory allocation and GC pressure.

## 2026-03-15 - [Performance Insight: Array allocation and Svelte 5 derived state]

**Learning:** The `vault.allEntities` property is actually a getter that returns `Object.values(this.entities)`. Calling it multiple times allocates multiple new arrays. In Svelte 5 components, combining multiple aggregate calculations into a single `$derived.by` block using a one-pass imperative loop should ONLY be done if they share the exact same reactive dependencies. Combining states with different update frequencies (e.g., static entities vs. active search queries) destroys fine-grained reactivity and causes performance regressions.
**Action:** When optimizing Svelte 5 reactivity, cache the getter once inside each separate `$derived.by` block. Keep fast-changing derived states (like `filteredEntities`) separate from slow-changing ones (like `types`) while still optimizing their internal loops.
## 2026-03-24 - Optimize chained array methods
**Learning:** Chained array methods (like `.filter().map()`) over large object value arrays (`Object.values()`) allocate multiple intermediate arrays and can significantly impact performance, especially when run frequently or on large state. Replacing them with a single imperative loop using cached arrays (like `vault.allEntities`) reduces iterations and GC pressure.
**Action:** Always identify long array method chains on hot paths or large datasets and rewrite them as a single imperative loop where applicable.
