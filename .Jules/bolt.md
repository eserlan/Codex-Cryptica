## 2025-02-17 - Eliminate Chained Array Operations in Derived Stores
**Learning:** In Svelte 5, using chained array methods like `.filter().map()` inside `$derived` or `$derived.by` blocks is a common performance bottleneck because these blocks re-evaluate on every dependency change. Chained methods require multiple iterations over the data and allocate intermediate arrays, increasing garbage collection (GC) pressure—especially noticeable when processing large collections like `allEntities` or calendar entries.
**Action:** Always replace chained array methods with a single imperative loop (`for...of`) that pushes results into a pre-allocated or newly created array. This reduces memory allocations and ensures single-pass processing during reactive updates.

## 2024-07-26 - [Avoid Object.values() when mapping large data sets]
**Learning:** Using `Object.values(entities)` allocates an intermediate array, which can cause unnecessary GC pressure and slowdowns when called frequently or on large entity sets.
**Action:** Replace `Object.values()` iterations with an imperative `for...in` loop over the object keys, retrieving the value directly inside the loop.
