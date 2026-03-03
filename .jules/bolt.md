## 2026-02-12 - [Optimizing Redundant Image Resolution]

**Learning:** Re-resolving images from OPFS and creating new ObjectURLs on every render is a significant performance bottleneck and memory leak.
**Action:** Always check if the resource is already resolved/cached in the component state (or library state like Cytoscape data) before initiating expensive async IO operations. Store the source path alongside the resolved URL to invalidate the cache correctly.

## 2026-02-15 - [Memoizing Expensive Template Computations]

**Learning:** Inline calls to expensive functions like `marked.parse` and `DOMPurify.sanitize` in Svelte templates can execute on every render (or fine-grained update if dependencies change), blocking the main thread during high-frequency interactions like tooltips.
**Action:** Extract expensive template logic into `$derived` runes (Svelte 5) to ensure they are memoized and only re-execute when their specific dependencies change.

## 2026-02-18 - [Optimizing Hot Loops in Graph Transformation]

**Learning:** `GraphTransformer.entitiesToElements` runs a loop for every entity. Using functional array methods (`.map`, `.includes` on spreads) inside this loop creates excessive short-lived allocations, increasing GC pressure for large graphs.
**Action:** Use imperative loops for critical transformation paths where allocation overhead matters more than syntactic sugar.

## 2026-02-23 - [Optimizing Object Comparison in Hot Loops]

**Learning:** `JSON.stringify` for object equality checks in hot loops (e.g., graph sync) is significantly slower (~40x) than manual field comparison, even for small objects like `TemporalMetadata`.
**Action:** Replace `JSON.stringify` with specialized equality functions for known object structures in performance-critical synchronization loops to reduce allocation overhead.

## 2026-02-28 - [Memoizing Expensive Svelte 5 Template Functions]

**Learning:** Calling expensive parsing functions like `marked.parse` and `DOMPurify.sanitize` inline inside Svelte templates (`{@html parseContent(step.content)}`) causes those operations to block the main thread on every reactive dependency update (e.g. tooltip repositioning).
**Action:** Always extract expensive string or DOM processing functions out of inline template calls into `$derived.by` or `$derived` bindings to leverage Svelte 5's memoization and ensure they only execute when their exact data dependencies change.

## 2026-03-03 - [Grouping Redundant Derived States]

**Learning:** In Svelte 5, having many separate `$derived.by` declarations that depend on the same reactive trigger (like a generic keystroke counter) causes each derived block to re-execute individually on every trigger increment. For instance, multiple `editor.isActive(...)` checks fired simultaneously cause unnecessary redundant computations per keystroke.
**Action:** Group related active state checks that share the same trigger (like editor events) into a single `$state` object updated via a single callback. This prevents N separate reactive computations and avoids redundant re-renders.
