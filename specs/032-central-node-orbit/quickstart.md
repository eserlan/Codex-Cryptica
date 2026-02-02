# Quickstart: Central Node Orbit Layout

**Feature**: `032-central-node-orbit`

## Overview

Orbit Layout allows you to visualize the graph as a series of concentric rings around a selected "Central Node". This helps in understanding the "degrees of separation" from a specific entity.

## How to Use

1.  **Open the Graph**: Navigate to the Graph View.
2.  **Select a Node**: Click on any node you wish to analyze.
3.  **Activate Orbit**:
    -   Right-click the node to open the Context Menu.
    -   Select **"Set as Central Node"** (or click the Orbit icon in the toolbar).
4.  **Explore**:
    -   The selected node moves to the center.
    -   Direct neighbors form the first ring.
    -   Secondary neighbors form the second ring.
5.  **Switch Center**: Click another node while in Orbit Mode to make it the new center.
6.  **Exit**: Click the **"Exit Orbit View"** button (or press `Esc`) to return to the standard layout.

## Testing Verification

### Manual Test
1.  Launch the app: `npm run dev`.
2.  Go to a graph with at least 5 connected nodes.
3.  Click Node A. Press "Orbit".
    -   **Verify**: Node A is center. Neighbors are around it.
4.  Click Node B (a neighbor).
    -   **Verify**: Node B becomes center. Layout animates.
5.  Click "Exit".
    -   **Verify**: Graph returns to previous state.

### Automated Tests
Run the graph engine test suite:
```bash
npm run test --filter=orbit
```
(Note: You will need to implement the tests in `packages/graph-engine/tests/orbit.test.ts`)
