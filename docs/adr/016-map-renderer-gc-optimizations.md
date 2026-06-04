# ADR 016: Map Renderer Garbage Collection & State Optimizations

## Context and Problem Statement

The map visualization engine in Codex Cryptica rendering pipeline (`renderMap`) is executed repeatedly during user interactions such as panning, zooming, and drawing animations. In our previous implementation:

1. **Hot-Path Object Allocations**: Each call to `imageToViewport` allocated a new `{ x, y }` coordinates object. With hundreds of pins, tokens, and measurement markers, this resulted in thousands of transient point objects allocated per frame, triggering frequent garbage collection (GC) cycles and micro-stuttering on mobile or low-end devices.
2. **Redundant Context State Saving**: Rendering individual elements like token borders, active selections, status icons, and Fog of War compositions repeatedly called `ctx.save()` and `ctx.restore()`. This created unnecessary context state resets and CPU overhead.
3. **Repeated Text Measurements**: Rendering token names and measurement labels called `ctx.measureText` on every frame, which requires layout calculations in the browser rendering engine and incurs a performance penalty.

We needed a zero-allocation hot-path architecture for the canvas renderer to minimize GC pressure, optimize text metrics checks, and group state operations.

## Decision Drivers

- **Rendering Performance**: Maintain a fluid 60fps frame rate during pan and zoom gestures.
- **Memory Footprint**: Eliminate temporary heap allocations in the rendering loop.
- **Robustness**: Maintain compatibility with existing canvas rendering states and unit tests.

## Considered Options

- **Option 1: Rely on browser garbage collection (Status Quo)** - Simple, but leads to micro-stutter and frame drops under high load (many tokens and pins).
- **Option 2: Zero-Allocation Renderer with Caching and Grouped Operations** - Reuse pre-allocated scratch objects, cache text measurements on the canvas context lifecycle, and bundle canvas state transforms.

## Decision Outcome

Chosen option: **Option 2: Zero-Allocation Renderer with Caching and Grouped Operations**.

### Implementation Details:

1. **Reused Coordinate Conversions (`math.ts`)**:
   - Updated `imageToViewport` and `viewportToImage` to accept an optional `target` point parameter, allowing caller-supplied mutable objects.
2. **Module-Level Scratch Point Pools (`renderer.ts`)**:
   - Defined static, pre-allocated module-level scratch points (e.g. `scratchPinPos`, `scratchTokenCenter`, `scratchStart`, `scratchEnd`) to perform coordinate calculations in-place.
3. **Canvas-Associated Text Metrics Cache (`measureTextCached`)**:
   - Extended `CanvasCache` (associated with individual canvases via `WeakMap`) to include a `textMeasurementCache`.
   - Wrapped `ctx.measureText` in `measureTextCached` to memoize label widths by font/text key.
4. **Grouped Context State Wrappers**:
   - Bundled the three separate border draws for active/selected tokens under a single `save()` / `restore()` block, avoiding context state switches.
   - Combined Fog of War fill and composite clipping steps to execute within a single context transform frame.
   - Grouped status pill and status icon drawing loops.

## Consequences

### Positive

- **GC Elimination**: Zero temporary point allocations are made during standard pins, tokens, and measurement rendering cycles.
- **Rendering Speedup**: Grouped context state saves reduce browser canvas driver state thrashing. Text-heavy maps load and redraw faster due to cached layout metrics.
- **Memory Safety**: Associating text caches with the canvas `WeakMap` ensures memory is automatically reclaimed when the target canvas elements are unmounted.

### Negative

- **Non-reentrant Functions**: Module-level scratch point pools are shared across synchronous calls on the main thread. While safe for single-threaded rendering lifecycles, this requires care if multiple workers or async task intervals invoke drawing steps concurrently.
