# Data Model: Node Merging

**Feature Branch**: `041-node-merging`

## Overview

This document defines the data structures involved in the node merging process, specifically the input selection, the intermediate AI-suggested content, and the output format for the updated node.

## Entity Definitions

### 1. Merge Request (`IMergeRequest`)

Describes the user's intent to merge nodes.

```typescript
export interface IMergeRequest {
  sourceNodeIds: string[]; // IDs of nodes to be merged (will be deleted)
  targetNodeId: string;    // ID of the primary node (will be updated)
  strategy: 'ai' | 'concat'; // How to generate content
}
```

### 2. Node Content (`INodeContent`)

Structure representing the content of a single node.

```typescript
export interface INodeContent {
  id: string;
  frontmatter: Record<string, any>; // Parsed YAML
  body: string;                     // Markdown content
  connections: IConnection[];       // List of edges
}
```

### 3. Merged Content Proposal (`IMergedContentProposal`)

The AI-generated (or concatenated) suggestion for the merged node.

```typescript
export interface IMergedContentProposal {
  targetId: string;
  suggestedFrontmatter: Record<string, any>;
  suggestedBody: string;
  incomingConnections: IConnection[]; // Connections to preserve/move
  outgoingConnections: IConnection[]; // Connections to preserve/move
}
```

### 4. Connection (`IConnection`)

Represents a graph edge.

```typescript
export interface IConnection {
  source: string;
  target: string;
  label: string; // Connection type/label
}
```

## State Transitions

### User Action: Select Nodes -> Initiate Merge
- **Input**: User selects multiple nodes.
- **System**:
  1. Validates selection (> 1 node).
  2. Opens `MergeNodesDialog`.
  3. Fetches `INodeContent` for all selected nodes.

### System Action: Generate Proposal (AI)
- **Input**: `INodeContent[]`
- **Processing**:
  1. Sends content to LLM with prompt: "Merge these entities into one coherent description...".
  2. Receives suggested text and frontmatter.
- **Output**: `IMergedContentProposal` displayed in Dialog.

### User Action: Confirm Merge
- **Input**: Edited `IMergedContentProposal`.
- **System**:
  1. **Write**: Updates `targetNodeId` file with new content.
  2. **Relink**: Updates graph edges (delete old edges, create new edges to/from target).
  3. **Backlinks**: Updates referencing files (replace `[[Old]]` with `[[Target]]`).
  4. **Delete**: Removes `sourceNodeIds` files (except target).
  5. **Refresh**: Updates UI.

## Validation Rules

1.  **Selection Count**: Must select at least 2 distinct nodes.
2.  **Self-Merge**: Cannot merge a node into itself (handled by distinct list check).
3.  **Content Integrity**: Merged body must not be empty.
4.  **Target Existence**: Target node must exist.
