# Implementation Plan: Entity Explorer Hierarchy & Nested Entities

**Branch**: `120-explorer-nested-entities` | **Date**: 2026-05-26 | **Spec**: [/specs/120-explorer-nested-entities/spec.md](file:///home/espen/proj/remotecodexarcana/specs/120-explorer-nested-entities/spec.md)
**Input**: Feature specification from `/specs/120-explorer-nested-entities/spec.md`

## Summary

Implement a hierarchical tree structure in the Entity Explorer sidebar's default "List View". Entities will support a logical parent-child relationship via a new optional `parent` field stored in their Markdown frontmatter. The UI will render nested entities with expand/collapse chevron toggles and indented vertical guide lines. Additionally, users can create child entities directly inline in the tree, and deleting a parent entity will safely promote its children to the root level.

## Technical Context

- **Language/Version**: TypeScript 6.0.3, Svelte 5 runes, Bun 1.3.14 workspace
- **Primary Dependencies**: Svelte 5, Cytoscape, `graph-engine`, `schema`, Tailwind 4 semantic tokens
- **Storage**: Browser OPFS (Markdown files with YAML frontmatter), local IndexedDB cache, persistent IndexedDB-backed vault stores
- **Testing**: Vitest unit tests in `entities.test.ts` and UI store tests in `explorer-ui.test.ts`
- **Target Platform**: Browser (responsive desktop/mobile layout compatible)
- **Constraints**: Offline-capable, client-side tree building and filtering under 100ms for up to 10,000 entities

## Constitution Check

- **Library-First**: PASS. The schema schema package `packages/schema/src/entity.ts` is updated to support the new metadata field. The core entity manipulation and logic are handled by the headless vault store and utilities.
- **TDD**: PASS. Unit tests will be updated and expanded in `entities.test.ts` and `explorer-ui.test.ts` to cover tree building, hierarchy updates, parent cycle detection, and deletions.
- **Simplicity & YAGNI**: PASS. Purely client-side logical hierarchy via a `parent` field in entity frontmatter. Avoids complex file path movements in OPFS, resulting in a robust, simple, and high-performance solution.
- **Dependency Injection**: PASS. Uses the existing constructor-based DI for stores.
- **Natural Language**: PASS. Clear UI tooltips ("Add Child Entity", "Collapse All") and instructions.

---

## Proposed Changes

### 1. Data Schema & Vault Stores

#### [MODIFY] [entity.ts](file:///home/espen/proj/remotecodexarcana/packages/schema/src/entity.ts)

- Add `parent: z.string().optional()` to `EntitySchema` Zod validation definition.

#### [MODIFY] [entities.ts](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/stores/vault/entities.ts)

- Update `createEntity` function to initialize `parent` from initial data if provided.
- Update `deleteEntity` function:
  - Locate all entities where `parent === deletedEntityId`.
  - Set their `parent` to `undefined` (promoting them to root level).
  - Add their IDs to `modifiedIds` so the changes are saved to disk.

#### [MODIFY] [entities.test.ts](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/stores/vault/entities.test.ts)

- Add unit test for creating entities with a parent.
- Add unit test for deleting a parent entity, verifying children are promoted and their files are marked for saving.

---

### 2. UI Stores & Persistent Settings

#### [MODIFY] [explorer-ui.svelte.ts](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/stores/ui/explorer-ui.svelte.ts)

- Add `explorerCollapsedEntityIds = $state<Record<string, string[]>>({})` to track collapsed entities per vault.
- Add `getCollapsedEntities(vaultId: string | null): Set<string>` to return a Set of collapsed entity IDs.
- Add `toggleExplorerEntityCollapse(vaultId: string | null, entityId: string)` to toggle and write the collapse state to persistence.
- Register `explorerCollapsedEntityIds` with `UIPersistence` keys to persist collapse states.

#### [MODIFY] [explorer-ui.test.ts](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/stores/ui/explorer-ui.test.ts)

- Add unit tests for `toggleExplorerEntityCollapse` and persistence.

---

### 3. Explorer Tree Rendering & Inline Creation

#### [MODIFY] [EntityList.svelte](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/components/explorer/EntityList.svelte)

- Implement tree structure calculation inside a derived property `entityTree`:
  1. Determine the set of visible entities. If `searchQuery` is active, it includes matching entities plus all their ancestor parent chains up to root.
  2. Map these entities into a TreeNode structure: `{ entity, children: TreeNode[], isMatchingQuery: boolean }`.
  3. Sort root nodes and children alphabetically.
- Implement a recursive snippet `{#snippet treeNode(node, depth)}` that:
  - Renders the entity item row with indentation padding (`depth * 12px` or `depth * 16px`).
  - Displays a collapse/expand chevron button if the node has children.
  - Styles ancestor nodes that do not match the query with a dimmed/italic appearance.
  - Displays a "+" hover button to trigger inline child creation.
  - Renders a child wrapper with a left border guide-line (`border-l border-theme-border/20`) for visual hierarchy.
  - Recursively renders children if the parent node is not collapsed.
- Implement inline child creation state `inlineCreationParentId: string | null`, `newChildTitle: string`, and `newChildType: string`.
- Render a small form directly under the parent node when `inlineCreationParentId === entity.id`, supporting title input, category select, `Enter` to save, and `Escape` to cancel.

---

## Verification Plan

### Automated Tests

- Run `bun run test` to execute all unit tests, confirming `entities.test.ts` and `explorer-ui.test.ts` pass successfully.
- Run `bun run lint` to verify strict code quality rules.

### Manual Verification

1. Create a parent entity "A".
2. Click the "+" button next to "A" to create child entity "B" inline. Verify "B" appears indented under "A" with a vertical guide line.
3. Click "+" on "B" to create grandchild "C". Verify multiple layers of nesting render correctly.
4. Click the chevron toggle next to "A" and verify "B" and "C" collapse/expand instantly. Refresh the page to verify collapse states are persisted.
5. Search for "C". Verify "C" is visible and ancestors "A" and "B" are shown and forced expanded, with "A" and "B" dimmed if they do not match.
6. Delete "A" and verify "B" is promoted to the root level of the explorer list.
