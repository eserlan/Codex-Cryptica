# Quickstart: Progressive Node Sizing

## Feature Overview

This feature introduces connectivity-based node sizing to the Codex graph. Nodes with more rendered links will visually grow into larger "tiers," making hubs easily identifiable at a glance.

## Testing Node Sizing

To verify the feature, you can create a test vault or use an existing one:

1.  Open the Graph View.
2.  Select an entity and add several connections to it.
3.  Observe the node size transition between tiers:
    - **0-1 Connections**: Small (48px)
    - **2-5 Connections**: Medium (64px)
    - **6-10 Connections**: Large (96px)
    - **11+ Connections**: Hub (128px)
4.  Repeat with one-way links that point into the same node and confirm the referenced node still grows.
5.  Hide or remove a target entity and confirm stale or filtered links no longer inflate node size.

## Development Verification

Run the graph engine tests to ensure the sizing logic is correctly calculated:

```bash
npm test -w packages/graph-engine
```

Verify the `weight` property is correctly assigned to nodes in the `transformer.ts` output.
