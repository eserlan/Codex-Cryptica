# Research: VTT Entity List

## Technical Context

- **VTT Engine**: Custom Canvas-based implementation using `map-engine` for core rendering.
- **Entity List**: Shared component located at `apps/web/src/lib/components/explorer/EntityList.svelte`.
- **Coordinate System**: Uses `mapStore.project` and `mapStore.unproject` to convert between screen (pixel) and map (image) coordinates.
- **Drag & Drop**: Standard HTML5 Drag and Drop using `application/codex-entity` MIME type for entity IDs.
- **State Management**:
  - `UIStore`: Handles general layout and UI toggles.
  - `MapSessionStore`: Handles VTT session state, tokens, and initiative.

## Findings

### 1. Integration Point for Entity List

The `EntityList` component should be integrated into the existing VTT Sidebar in `apps/web/src/routes/(app)/map/+page.svelte`. It can be placed in its own collapsible section or as a primary tab to avoid cluttering with `InitiativePanel` and `TokenDetail`.

### 2. Drag and Drop Implementation

The wrapper `div` around `MapView` in `+page.svelte` already handles `ondrop` for file uploads. It should be extended to handle `application/codex-entity`:

- Extract `entityId`.
- Unproject mouse coordinates to map space using `mapStore.unproject`.
- Call `mapSession.addToken`.

### 3. Drag Preview

To provide visual feedback (Priority P2), `MapSessionStore` needs a `dragPreview` state.

- Updated during `handleDragOver` in `+page.svelte`.
- Rendered in `MapView.svelte` within the `draw()` loop using a semi-transparent version of the token.

### 4. Persistence

- `isVttSidebarCollapsed` should be moved to `UIStore` and persisted to `localStorage`.
- `isVttEntityListCollapsed` (if implemented as a section) should also be persisted.

## Decisions

- **Decision**: Add `EntityList` as a new collapsible section in the VTT Sidebar.
- **Rationale**: Keeps all VTT-related tools in one place while maintaining the existing sidebar structure.
- **Decision**: Implement drag preview by adding a `dragPreview` state to `MapSessionStore`.
- **Rationale**: Allows the `MapView` canvas to render the preview without lag or complex component layering.
- **Decision**: Persist VTT sidebar state in `UIStore`.
- **Rationale**: Consistent with how other layout toggles (like `showCanvasPalette`) are managed.

## Alternatives Considered

- **Separate VTT Entity Sidebar**: Rejected as it would take up too much screen real estate and clash with the existing VTT sidebar.
- **Overlay Palette**: Rejected because the VTT Sidebar already provides a dedicated space for tools.
