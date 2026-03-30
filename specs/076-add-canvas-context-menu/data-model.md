# Data Model: Add to Canvas in Context Menu

**Date**: 2026-03-27
**Feature**: 076-add-canvas-context-menu

## Entities

### Canvas (Existing - Extended)

**What it represents**: A user-created collection of entities for organization and visualization.

**Fields**:

- `id: string` - Unique identifier
- `title: string` - User-defined name
- `entityIds: string[]` - Array of entity IDs on this canvas
- `createdAt: number` - Timestamp
- `lastUsedAt: number` - Last access timestamp (for recency sorting)

**Relationships**:

- Contains many Entities (by ID reference)
- Belongs to a Vault (implicitly via storage location)

**Validation Rules**:

- Title must be non-empty string
- Entity IDs must be unique within array (no duplicates)
- Entity IDs must reference valid entities (referential integrity)

---

### CanvasAddResult (New)

**What it represents**: Result of adding entities to a canvas.

**Fields**:

- `canvasId: string` - Target canvas
- `added: string[]` - Entity IDs that were newly added
- `skipped: string[]` - Entity IDs that were already on canvas
- `errors: Array<{ entityId: string, error: string }>` - Any failures

**Validation Rules**:

- All entity IDs must be in added, skipped, or errors (complete accounting)
- No overlap between added, skipped, and errors arrays

---

## Operations

### addEntitiesToCanvas(canvasId, entityIds)

**Input**:

- `canvasId: string` - Target canvas
- `entityIds: string[]` - Entities to add

**Process**:

1. Load canvas from storage
2. Filter out entity IDs already in `canvas.entityIds`
3. Add new entity IDs to `canvas.entityIds`
4. Update `canvas.lastUsedAt`
5. Save canvas to storage
6. Return `CanvasAddResult`

**Output**: `CanvasAddResult`

---

### createCanvasFromEntities(entityIds, title?)

**Input**:

- `entityIds: string[]` - Initial entities
- `title?: string` - Optional name (auto-generated if not provided)

**Process**:

1. Generate title if not provided (e.g., "5 entities" or first entity title)
2. Create new canvas object
3. Set `entityIds` to provided list
4. Save to storage
5. Return new canvas

**Output**: `Canvas` object

---

## State Transitions

```
[No Canvas Exists]
       |
       v
[Create First Canvas] ←──────────────┐
       |                              |
       v                              |
[Canvas Exists] ──→ [Add Entities] ──┘
       |
       v
[Multiple Canvases] ──→ [Show Recents]
```

---

## No Contracts

This is an internal feature with no external API contracts. All operations are client-side only.
