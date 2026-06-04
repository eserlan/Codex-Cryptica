# Data Model: Map Route Decomposition

## MapPageController (Reactive State)

Manages the transient orchestration state for the Map route.

- **Reactive State (`$state`)**:
  - `isDragging: boolean` - Tracks if a drag operation is active over the map.
  - `showUpload: boolean` - Visibility of the `MapUploadOverlay`.
  - `showVttShare: boolean` - Visibility of the `ShareModal`.
  - `mapName: string` - User-provided name for the new map upload.
  - `files: FileList | null` - Pending files for upload.

- **Layout State (owned by `layoutUIStore`)**:
  - `vttChatSidebarCollapsed: boolean` - Controls VTT chat sidebar expansion and persists outside the route controller.

- **Derived State (`$derived`)**:
  - `chatSidebarOffset: string` - Calculated from `layoutUIStore.vttChatSidebarCollapsed` ("3rem" or "20rem").
  - `vttEntityCount: number` - Filtered count of VTT-compatible entities in the vault.
  - `showInitiativePanel: boolean` - Derived from `mapSession` mode/enabled flags.

- **Methods**:
  - `onDrop(event: DragEvent)` - Unified drop handler for entities and files.
  - `onDragOver(event: DragEvent)` - Unified drag-over handler.
  - `onDragLeave(event: DragEvent)` - Handles resetting drag state.
  - `handleUpload()` - Orchestrates the `mapStore.uploadMap` workflow.
  - `handleEntityDragStart(event, entityId)` - Sets up the data transfer for entity dragging.
