# Research: Performance Improvements

## Decision: OffscreenCanvas for Thumbnail Generation

- **Rationale**: Reduces GC pressure by reusing canvas and context objects. Fully supported in Safari 17+ and other modern mobile browsers.
- **Alternatives considered**: Creating new DOM elements (current approach, causing GC spikes).
- **Finding**: Module-level pooling is effective for `2d` contexts.

## Decision: Debounced $effect for GraphView Image Resolution

- **Rationale**: Prevents rapid re-firing of expensive file I/O and image decoding during graph manipulation (pan/zoom).
- **Implementation**: Use a 100ms debounce window. If the graph state settles, then resolve visible images.
- **Finding**: Svelte 5 `$effect` can return a cleanup function to clear pending timeouts.

## Decision: Throttled Promise.all for Batched I/O

- **Rationale**: Placing 100+ parallel file reads in a single `Promise.all` can saturate the microtask queue and cause I/O contention on mobile.
- **Implementation**: Process in chunks of 20 concurrent operations.
- **Finding**: Balance between overhead and concurrency.

## Decision: Event-Driven Minimap Redraws

- **Rationale**: `requestAnimationFrame` polling is wasteful when the graph is static.
- **Implementation**: Listen to Cytoscape events (`pan`, `zoom`, `resize`, `add`, `remove`, `position`).
- **Throttling**: Use a RAF-based throttle (max 30fps) for these events to prevent redundant draws during rapid interaction.

## Decision: Timestamp-based Sync Check

- **Rationale**: `JSON.stringify` comparison is O(N) where N is the total message history size.
- **Implementation**: Add `lastUpdated` epoch to `OracleStore` state. Compare primitives before deep checking.
