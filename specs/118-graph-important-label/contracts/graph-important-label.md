# Contract: Graph Important Label

## Context Menu Contract

When the graph context menu is opened on an editable entity node:

- It exposes a `Mark Important` action.
- The action targets the clicked node unless the clicked node is part of the current selected node set.
- The action applies the normalized label value `important` through the existing vault label mutation path.
- The action closes the context menu and any open graph submenu before reporting success, no-change, or failure.
- The action is not available in guest/read-only sessions.

### Feedback Outcomes

| Condition                              | Expected feedback                                 |
| -------------------------------------- | ------------------------------------------------- |
| One entity changed                     | Marked as "important".                            |
| Multiple entities changed              | Marked N nodes as "important".                    |
| One target already important           | Already marked as "important".                    |
| All selected targets already important | Selected nodes are already marked as "important". |
| Mutation failure                       | Failed to mark important: [reason]                |

## Graph Engine Contract

When converting entities to graph elements:

- Entity labels are copied to node data.
- A node data flag such as `isImportant` is derived when labels include `important` case-insensitively.
- The derived flag is not persisted back to the entity.
- Non-important entities do not receive the derived important flag.

When generating graph styles:

- Important nodes receive a visual treatment distinct from otherwise similar non-important nodes.
- The important treatment does not depend on graph label text being visible.
- The important treatment does not use connection-count size as the only signal.
- Selection styling remains legible when an important node is selected.
- Existing category, image, draft, revealed, and focus-mode styles remain compatible.

## Test Contract

Required focused tests:

- Context-menu controller applies `important` to selected node ids through `bulkAddLabel`.
- Context-menu controller reports no-change feedback when no targets are modified.
- Context-menu controller does nothing for an empty selection.
- Context-menu controller reports failure feedback when label mutation rejects.
- Graph transformer marks important node data from labels.
- Graph transformer leaves non-important node data unmarked.
- Graph style output contains an important-node style that changes a non-text visual property.
