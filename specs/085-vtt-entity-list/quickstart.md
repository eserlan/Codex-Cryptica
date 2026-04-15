# Quickstart: VTT Entity List

## Testing Workflow

### 1. VTT Sidebar Toggling

- Open any map in the application.
- Toggle "VTT Mode" on.
- Observe the "VTT Sidebar" on the right.
- Collapse and expand the sidebar using the panel button.
- Refresh the page and verify the collapsed/expanded state is preserved.

### 2. Entity List in VTT

- Expand the VTT sidebar.
- Locate the "Vault Entities" (or "Entity List") section.
- Verify you can search and filter entities within this sidebar.
- Toggle the section collapse state and verify it's persisted on refresh.

### 3. Drag-and-Drop to Map

- Drag an 'Actor' or 'Object' entity from the VTT Entity List onto the map canvas.
- Observe the visual preview (semi-transparent token) following your cursor while dragging.
- Drop the entity onto the map.
- Verify a new token is created at the drop coordinates.
- Verify the token inherits the entity's image and name.

### 4. Edge Cases

- Drag a non-Actor/Object entity (if possible) and verify if it's prevented or handled as per requirements.
- Drop an entity outside the map canvas (e.g., over the sidebar) and verify the drag is cancelled.
- Drag the same entity multiple times to verify multiple tokens can be created.
