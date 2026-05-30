# Feature Specification: Entity Explorer Hierarchy & Nested Entities

**Feature Branch**: `120-explorer-nested-entities`  
**Created**: 2026-05-26  
**Status**: Draft  
**Input**: User description: "In entity explorer, it should be possible to create entities under another entity (one to many, multiple layers deep). Nested Indentation & Accordion Toggles."

## Clarifications

### Session 2026-05-26

- Q: Visual Edit Actions in Guest Mode (P2P Collaborator Sessions) → A: Option A - Completely hide the "+" button and disable drag-and-drop hierarchy updates in Guest Mode.
- Q: Indentation styling and Nesting Depth Limits → A: Option A - Support infinite logical nesting, but cap the visual indentation padding at 8 levels deep (e.g., maximum of 96px padding-left).
- Q: Cycle Resolution Strategy → A: Option A - Automatically break the cycle by setting the parent of the youngest/last-modified entity in the cycle to null (promoting it to root level) and log a warning.
- Q: Drag-and-Drop Placement Semantics → A: Option A - Dropping onto an item makes it a child. Dropping in a "Move to Root" dropzone makes it a root item. No inline ordering.

## User Scenarios & Testing (mandatory)

### User Story 1 - Expand/Collapse Hierarchical Nested View (Priority: P1)

As a scholar organizing a vast campaign vault, I want to see my entities organized in a hierarchical tree inside the Entity Explorer sidebar, so that I can collapse sections I am not currently using and keep my workspace tidy.

**Why this priority**: It is the core visual and navigational requirement of the feature. Without a functional tree view with expand/collapse states, the hierarchy cannot be visualized or navigated.

**Independent Test**: Can be verified by creating a set of mock entities with defined parent relationships, launching the app, and confirming the Entity Explorer renders them as a nested, indented list with operational collapse/expand chevrons.

**Acceptance Scenarios**:

1. **Given** a vault with a parent entity "Sword Coast" and child entities "Waterdeep" and "Baldur's Gate", **When** the Entity Explorer is opened in "List View", **Then** "Waterdeep" and "Baldur's Gate" should be displayed nested under "Sword Coast" with indentation.
2. **Given** a parent entity "Sword Coast" with visible child entities, **When** the collapse chevron next to "Sword Coast" is clicked, **Then** its child entities should be hidden from view.
3. **Given** a collapsed parent entity "Sword Coast", **When** the expand chevron is clicked, **Then** its child entities should become visible again.

---

### User Story 2 - Create Child Entity Directly Under a Parent (Priority: P2)

As a campaign writer, I want to create a new entity directly under an existing entity in the explorer, so that I don't have to manually edit metadata afterwards to establish the parent-child link.

**Why this priority**: It streamlines the creation workflow, making nesting easy and intuitive during active writing sessions.

**Independent Test**: Can be verified by clicking the "Add Child" action on an entity item in the explorer, filling the creation form, and verifying the new entity is immediately nested under that parent.

**Acceptance Scenarios**:

1. **Given** the Entity Explorer open in list view, **When** hovering over an entity "Waterdeep" and clicking the "+" (Add Child) button, **Then** a creation dialog should open with the parent preset to "Waterdeep".
2. **Given** the creation dialog with parent preset to "Waterdeep", **When** the user saves the new entity "Yawning Portal", **Then** the new entity is created with parent link to "Waterdeep" and rendered nested under "Waterdeep".

---

### User Story 3 - Re-parent/Move Entities (Priority: P3)

As a worldbuilder reorganizing my lore structure, I want to move an entity from one parent to another or drag it to the root level.

**Why this priority**: Provides the management and maintenance tools needed as vaults grow and adapt.

**Independent Test**: Can be verified by dragging an entity in the list and dropping it onto another entity, or using context menu actions, and observing the tree layout update instantly.

**Acceptance Scenarios**:

1. **Given** child entity "Neverwinter" under root and parent entity "Sword Coast", **When** dragging "Neverwinter" and dropping it directly onto "Sword Coast", **Then** "Neverwinter" should become a child of "Sword Coast" and indent accordingly.
2. **Given** "Neverwinter" nested under "Sword Coast", **When** dragging "Neverwinter" and dropping it onto the dedicated "Move to Root" dropzone, **Then** it should be re-parented to the root.

---

### Edge Cases

- **Self-referential parent/Child cycles**: If entity A is set as its own parent, or A is a parent of B and B is set as parent of A.
  - _Mitigation_: The UI must prevent selecting an entity's own descendants or itself as its parent. If a cycle is detected during load, the system must break it by setting the parent of the youngest/last-modified entity in the cycle to null (promoting it to root level) and log a warning.
- **Deleting a parent entity**: If a parent entity is deleted, what happens to its children?
  - _Mitigation_: To prevent accidental data loss, child entities are promoted to the root level (their parent link is set to null). Cascade deletion is avoided.
- **Search filtering**: When search is active, matching children should not be hidden because their parents are collapsed.
  - _Mitigation_: If an entity matches a search query, all its ancestors up to the root must be displayed and forced expanded so the matching node remains visible in its hierarchical context. Ancestors that do not match the query themselves should be visually dimmed or marked.
- **Label Grouping view mode**: The Explorer has a "Group by Label" mode.
  - _Mitigation_: Hierarchy is only rendered when the Explorer is in "List View" mode. In "Group by Label" mode, entities are grouped flatly by their labels, ignoring the hierarchy, to maintain the label grouping's primary purpose.
- **Guest Session permissions**: Guests should view the hierarchy, but they cannot create or re-parent entities. The "+" button for creating child entities is completely hidden, and drag-and-drop hierarchy updates are disabled in Guest Mode.
- **Google Drive Synchronization Duplicates**: GDrive sync can duplicate documents instead of versioning/overwriting them if file system metadata is missing during push actions.
  - _Mitigation_: Sync coordinators MUST explicitly pass `fsMetadata: "fs"` in export-to-filesystem sync actions within `DiffAlgorithm.ts` to guarantee inline updates.
- **Warm Cache Directory Staleness**: Pulling directory changes on a warm cache can result in flat folder structures until a hard reload.
  - _Mitigation_: On a successful sync pull completion, the active vault cache and preload maps MUST be cleared (`cacheService.clearVault()`) and reloaded immediately to build the updated hierarchical tree.

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: System MUST store the hierarchical relation via a `parent` field in the entity metadata (Zod schema: `parent: z.string().optional()`) containing the parent's entity ID.
- **FR-002**: The `parent` field MUST be persisted in the frontmatter of the entity's Markdown file.
- **FR-003**: The default "List View" in the Entity Explorer MUST render entities as a tree, using accordion toggles (expand/collapse chevron) and left padding/indentation (e.g. 12px or 16px per depth level). Indentation padding MUST be capped at a maximum of 8 levels deep (e.g., 96px maximum padding-left) to preserve layout integrity on narrow sidebars.
- **FR-004**: Users MUST be able to click the chevron to toggle the collapsed state of a parent entity. Collapse state MUST be persisted locally (e.g., in `explorerUIStore` or `localStorage`).
- **FR-005**: The explorer item row MUST display a "+" button (on hover/focus) that triggers the creation of a new child entity under that parent.
- **FR-006**: When search query is active, the explorer MUST display all matching entities and their ancestors, forcing ancestors to be expanded to reveal matching descendants.
- **FR-007**: Deleting an entity MUST update all its immediate children to set their `parent` field to null (promoting them to root level).
- **FR-008**: Native drag-and-drop actions MUST be flicker-free. Pointer events MUST be disabled (`pointer-events: none`) on all non-dragged explorer items during active drag sessions.
- **FR-009**: Drag start state transitions (`isDragging`) MUST be protected against browser cancellation using a `requestAnimationFrame` queue combined with a validation check against the active `draggedEntityId`.
- **FR-010**: HTML markup structure MUST keep interactive button descendants separated from composite button nodes, using `role="listitem"` on the outer row container and moving primary selection action to a dedicated inner button.
- **FR-011**: The system MUST guarantee that file path attributes (`_path`) are normalized to a string array (`string[]`) before caching or rendering, preventing character-by-character iteration loops.
- **FR-012**: GDrive pulls MUST clear the local active vault cache and trigger an automatic files reload to update the explorer hierarchy in real-time.

### Key Entities

- **Entity**: Represents a markdown file in the vault.
- `id`: Unique identifier (string).
- `parent`: (New attribute) Optional string referencing the `id` of another Entity.
- `_path`: Array of strings representing the file path in OPFS. Note: The file location on disk can remain flat or follow the logical structure; using logical `parent` is the primary source of truth.
- `isVirtual`: (New attribute) Optional boolean marking synthesized directories that do not exist on disk, disabling selection/Zen actions and enabling foldered expand/collapse only.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: Users can expand or collapse nested levels in less than 50ms (instantaneous UI feedback).
- **SC-002**: Recursive rendering handles tree depth up to 8 levels with visual clarity.
- **SC-003**: No infinite loops or application crashes are triggered when a parent-child cycle is loaded.
- **SC-004**: Search returns matching entities within 100ms and displays their correct ancestor paths.
- **SC-005**: Google Drive sync correctly updates existing documents on GDrive with standard API versioning rather than creating duplicate documents.
