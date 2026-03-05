# ADR 004: Direct Main-Thread Cytoscape Layout Execution

- Status: accepted
- Date: 2026-03-05

## Context and Problem Statement

Initially, Codex Cryptica utilized a Web Worker-based layout system (via Comlink) to execute FCOSE physics calculations. The intent was to prevent the main thread from locking up during complex graph arrangements.

However, this architecture introduced several critical issues:

1.  **Serialization Overhead:** Transferring 1000+ nodes and edges between threads created significant latency, often exceeding the time saved by off-main-thread calculation.
2.  **Dimension Blindness:** Web Workers cannot access the DOM. Consequently, the layout math was calculated using placeholder dimensions, leading to node overlaps once real labels and images were rendered on the main thread.
3.  **Race Conditions:** Synchronizing "image resolved" triggers with worker-based layout results created "jiggling" and "diagonal collapse" bugs that were extremely difficult to debug.
4.  **Convoluted Codebase:** The abstraction layer required `LayoutService`, worker entry points, and complex state synchronization logic that obscured the core layout intent.

## Decision Outcome

We decided to abandon the Web Worker infrastructure and move layout execution directly to the main thread, utilizing Cytoscape's native FCOSE implementation.

### Rationale

- **Access to Real Dimensions:** By running on the main thread, the solver has immediate access to rendered node dimensions (including labels and thumbnails), resulting in perfectly spaced layouts.
- **Predictive Sizing:** We can now use "Predictive Sizing" selectors to reserve space for images _before_ they load, eliminating the need for a second "settling" animation.
- **Anisotropic Physics:** Main-thread execution allows the layout to be "Viewport-Aware," dynamically adjusting gravity and repulsion based on the current aspect ratio (Horizontal Burst on Desktop vs. Vertical Pillar on Mobile).
- **Reduced Complexity:** Deleting the worker infrastructure removed ~200 lines of boilerplate and centralized the layout logic into a single, readable function (`applyCurrentLayout`).
- **Modern Performance:** Benchmark testing showed that for lore graphs (<1000 nodes), FCOSE math completes in <500ms on modern devices, making the "blocking" concern negligible compared to the benefits of stability and visual polish.

## Consequences

- **Positive:** Dramatically smoother startup experience with zero visual "jiggling."
- **Positive:** Complete resolution of the "diagonal collapse" and "origin clumping" bugs.
- **Positive:** Simplified CI/CD and build process (one less worker bundle to manage).
- **Negative:** Extremely large graphs (>2000 nodes) may cause a brief UI freeze (0.5s - 1s) during initial arrangement. This is deemed an acceptable trade-off for the vastly improved Lore-Web distribution.
