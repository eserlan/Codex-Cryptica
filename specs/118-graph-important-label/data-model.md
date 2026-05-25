# Data Model: Graph Important Label

## Entity

Represents a lore record rendered as a graph node.

**Relevant fields**:

- `id`: stable entity identifier.
- `title`: graph node label.
- `type`: category used for graph styling.
- `labels`: normalized metadata labels. This feature uses `important`.
- `connections`: relationship data used for graph edges and existing weight-based sizing.

**Validation rules**:

- `labels` must not contain duplicate values after normalization.
- Applying importance must add exactly one `important` label when absent.
- Applying importance to an entity that already has `important` is a no-op.
- Guest/read-only sessions must not mutate entity labels.

## Graph Selection

Represents the graph entities targeted by a context-menu action.

**Relevant fields**:

- `targetId`: entity id of the node that opened the context menu.
- `selectedNodes`: entity ids affected by the action.

**Selection rules**:

- If the right-clicked node is already selected, the action targets the selected node set.
- If the right-clicked node is not selected, the action targets only that node.
- Empty selections produce no mutation.

## Graph Node Data

Represents the library-level graph data consumed by Cytoscape.

**Relevant fields**:

- `id`: entity id.
- `label`: display title.
- `type`: category.
- `weight`: connection-derived size signal.
- `labels`: labels copied from the source entity.
- `isImportant`: derived visual-state flag for entities whose labels include `important`.

**Validation rules**:

- `isImportant` is derived from `labels` and is not separately persisted.
- `isImportant` must be true when labels contain `important` case-insensitively.
- Non-important entities must not receive the important visual flag.
- Important visual styling must not rely on node `weight` or visible label text.

## State Transitions

```text
No important label
  -> user chooses Mark Important
  -> important label added
  -> graph node data derives isImportant
  -> graph node renders with distinct important treatment

Already important
  -> user chooses Mark Important
  -> labels unchanged
  -> graph node remains visually distinct
  -> user receives no-change feedback

Mutation failure
  -> user chooses Mark Important
  -> label save fails
  -> labels unchanged
  -> user receives error feedback
```
