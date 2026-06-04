# Research Notes: Entity Explorer Hierarchy & Nested Entities

## Decision 1: Logical Metadata vs. File Path Hierarchy

- **Decision**: Represent parent-child relations using a logical `parent` ID string field in the entity frontmatter metadata.
- **Rationale**:
  - Direct integration with Svelte 5 and IndexedDB stores.
  - Highly robust: renaming or changing an entity's parent does not require filesystem folder creation/renaming/deletion in OPFS or local disk, which is complex and prone to lock errors or synchronization conflicts.
  - Easy query sorting and filtering using IndexedDB and in-memory structures.
- **Alternatives Considered**: File system folder structure (modifying `_path` to match subdirectories).
  - _Why Rejected_: Although neat, renaming a parent node would require moving the directories of all child nodes recursively in OPFS. Under Guest Mode and Sync, this introduces major conflict potentials and potential data loss if a subdirectory rename fails mid-operation.

## Decision 2: Search Query Handling in Trees

- **Decision**: Filter tree nodes, but show matching children with all their ancestors up to root. Ancestors are forced to be expanded and are styled with a dimmed/italic visual state.
- **Rationale**:
  - Preserves hierarchical context: seeing "Waterdeep" tells the user it's a city, but seeing it under "Sword Coast" provides clear geographic context.
  - Dimming non-matching ancestors keeps focus on the actual matching items.
- **Alternatives Considered**: Flatten search results into a simple list.
  - _Why Rejected_: Loses hierarchy context, which is the key value of this feature.

## Decision 3: Cycle Detection Algorithm

- **Decision**: Implement a cycle-detection function `detectCycle(entityId: string, potentialParentId: string, entities: Record<string, Entity>): boolean` using recursive ancestor traversal.
- **Rationale**:
  - Extremely lightweight and fast (O(N) max traversal depth is very low).
  - Prevents setting B as parent of A when A is already parent of B.
  - Can be used in both the UI (disabling cyclic parent selection) and the backend store (sanity checks during loading).
- **Alternatives Considered**: None, standard tree validation is required.

## Decision 4: Svelte 5 Tree Recursion

- **Decision**: Use Svelte 5 snippets recursive rendering (`{#snippet treeNode(node, depth)}` self-referencing itself for each child).
- **Rationale**:
  - Fits Svelte 5 runes and snippets natively.
  - High performance: only re-renders nodes that change (e.g. toggle expand/collapse).
- **Alternatives Considered**: Separate tree-node component.
  - _Why Rejected_: Snippets are faster, have less overhead, and can easily share local scope (like collapsed states and inline forms).
