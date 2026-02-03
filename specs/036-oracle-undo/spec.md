# Feature Specification: Oracle Undo (Ctrl+Z)

**Feature Branch**: `036-oracle-undo`  
**Created**: 2026-02-03  
**Status**: Draft  
**Input**: User description: "revert (ctrl+z) in the oracle" (Issue #80)

## User Scenarios & Testing

### User Story 1 - Undo Accidental Overwrite (Priority: P1)

As a user, I want to undo the last "Smart Apply", "Copy to Chronicle", or "Copy to Lore" action in the Oracle so that I can immediately revert accidental changes to my nodes.

**Why this priority**: "Smart Apply" is a destructive action that overwrites existing content. Accidental clicks or poor AI suggestions can lead to data loss if not reversible. This is the core pain point of Issue #80.

**Independent Test**:
1. Open Oracle.
2. Select an entity.
3. Ask Oracle to generate content.
4. Click "Smart Apply" (or Copy buttons).
5. Verify entity content is updated.
6. Press Ctrl+Z (or click Undo).
7. Verify entity content is reverted to its previous state.

**Acceptance Scenarios**:

1. **Given** an entity with content "Original Content", **When** I click "Smart Apply" with new content "New Content", **Then** the entity content becomes "New Content".
2. **Given** I have just performed a "Smart Apply", **When** I press `Ctrl+Z` (or Command+Z on Mac) while the Oracle window is focused (and not in the input field), **Then** the entity content reverts to "Original Content".
3. **Given** I have just performed a "Smart Apply", **When** I click the "Undo" button that appears on the chat message, **Then** the entity content reverts to "Original Content".

---

### User Story 2 - Undo Node Creation (Priority: P2)

As a user, I want to undo the "Create as Node" action so that I can quickly remove entities created by mistake.

**Why this priority**: Users may accidentally create nodes they didn't intend to, cluttering their vault.

**Independent Test**:
1. Ask Oracle to create a character.
2. Click "Create as NPC: [Name]".
3. Verify new node exists in the graph/list.
4. Press Ctrl+Z.
5. Verify the new node is deleted (or at least removed from the index/graph).

**Acceptance Scenarios**:

1. **Given** I just clicked "Create as Node", **When** I trigger Undo, **Then** the newly created entity is deleted.

---

### Edge Cases

- **Multiple Undo**: Currently scoping to single-level or multi-level undo? -> *Start with a stack, allowing multiple undos.*
- **Session Persistence**: If I close the Oracle or refresh the page, does history persist? -> *No, undo history should be transient for the session.*
- **Conflict**: What if I modify the entity manually in the editor, then try to undo the Oracle action? -> *The undo action restores the entity to the exact state captured at the time of the Oracle action, overwriting any subsequent manual edits. This is standard "Revert" behavior.*

## Requirements

### Functional Requirements

- **FR-001**: System MUST track state changes caused by Oracle actions ("Smart Apply", "Copy to Chronicle", "Copy to Lore", "Create Node").
- **FR-002**: System MUST allow users to trigger "Undo" via `Ctrl+Z` (or `Cmd+Z`) when the Oracle interface is active.
- **FR-003**: System MUST provide a visual "Undo" indicator/button on the chat message that triggered the action.
- **FR-004**: System MUST NOT trigger Oracle Undo if the user is typing in the input field (browser native undo should take precedence there).
- **FR-005**: Undo actions MUST revert the entity data to the exact state before the Oracle operation.

### Key Entities

- **OracleStore**: Needs to maintain an `undoStack`.
- **UndoableAction**: An interface/type representing a reversable operation (`{ revert: () => Promise<void>, description: string }`).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can successfully revert a text overwrite interaction in under 2 seconds using keyboard shortcuts.
- **SC-002**: No data corruption occurs when undoing a node creation (clean deletion).
