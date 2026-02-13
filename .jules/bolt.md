## 2026-02-12 - [Optimizing Redundant Image Resolution]

**Learning:** Re-resolving images from OPFS and creating new ObjectURLs on every render is a significant performance bottleneck and memory leak.
**Action:** Always check if the resource is already resolved/cached in the component state (or library state like Cytoscape data) before initiating expensive async IO operations. Store the source path alongside the resolved URL to invalidate the cache correctly.
