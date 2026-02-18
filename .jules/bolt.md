## 2026-02-12 - [Optimizing Redundant Image Resolution]

**Learning:** Re-resolving images from OPFS and creating new ObjectURLs on every render is a significant performance bottleneck and memory leak.
**Action:** Always check if the resource is already resolved/cached in the component state (or library state like Cytoscape data) before initiating expensive async IO operations. Store the source path alongside the resolved URL to invalidate the cache correctly.

## 2026-02-15 - [Memoizing Expensive Template Computations]

**Learning:** Inline calls to expensive functions like `marked.parse` and `DOMPurify.sanitize` in Svelte templates can execute on every render (or fine-grained update if dependencies change), blocking the main thread during high-frequency interactions like tooltips.
**Action:** Extract expensive template logic into `$derived` runes (Svelte 5) to ensure they are memoized and only re-execute when their specific dependencies change.

## 2026-02-18 - [Optimizing Hot Loops in Graph Transformation]

**Learning:** `GraphTransformer.entitiesToElements` runs a loop for every entity. Using functional array methods (`.map`, `.includes` on spreads) inside this loop creates excessive short-lived allocations, increasing GC pressure for large graphs.
**Action:** Use imperative loops for critical transformation paths where allocation overhead matters more than syntactic sugar.
