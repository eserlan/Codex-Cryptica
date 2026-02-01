# Quickstart: Entity Labeling System

**Feature**: 029-entity-labeling | **Date**: 2026-02-01

## Setup for Testing

1. Open a vault with at least 5 entities.
2. Ensure you are on the `029-entity-labeling` branch.

## Test Scenarios

### TS-001: Assigning Labels
1. Select an NPC (e.g., "Eldrin").
2. In the Detail Panel, find the "Labels" section.
3. Type "Dead" and press Enter.
4. Verify a "Dead" badge appears.
5. Close and reopen the NPC; verify the badge persists.

### TS-002: Graph Filtering
1. Assign the label "Session 1" to 3 different entities.
2. Use the Filter menu on the Graph View.
3. Select "Session 1".
4. **Expected**: Only the 3 tagged entities (and their connections) are visible.

### TS-003: Global Management
1. Open "Label Management" in Settings.
2. Rename "Dead" to "Deceased".
3. **Expected**: All entities previously tagged "Dead" now show "Deceased".
4. **Verification**: Check the `.md` file content in the local directory.
