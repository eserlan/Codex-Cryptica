# Map Page Analysis & Decomposition Proposal

**Date**: 2026-05-20
**Target**: `apps/web/src/routes/(app)/map/+page.svelte`
**Original Metrics**: 738 lines, 15+ reactive states, 4 distinct UI surfaces.
**Implemented Metrics**: 148-line route composer, route-specific controller, 4 extracted UI surfaces.

## 1. Responsibility Audit (The "God" Surface)

The Map route coordinator currently serves as a monolithic junction for:

- **Spatial Logic**: Manages coordinate projection (`unproject`) and bridges it to entity creation.
- **Drag & Drop Engine**: Contains ~100 lines of complex DnD logic handling both internal entities and external file uploads.
- **VTT Orchestration**: Manages the branching logic between "Pin" mode (Standard) and "Token" mode (VTT).
- **Layout Management**: Hardcoded CSS offset calculations and visibility toggles for the VTT chat sidebar and toolbars.
- **Form Management**: Handles map upload initialization, file list tracking, and validation.
- **State Logic**: Bridges multiple global stores (`mapStore`, `mapSession`, `vault`, `notificationStore`, `sessionModeStore`, `modalUIStore`, `layoutUIStore`).

## 2. Critical Friction Points

### A. Mixed Logic Branches

The `handleDrop` and `handleDragOver` functions are littered with repetitive `if (mapSession.vttEnabled)` and `if (sessionModeStore.isGuestMode)` checks. This makes the core interaction logic fragile and hard to test.

### B. Visual Noise

The high-level structure of the map page is obscured by:

- 140+ lines of nested VTT sidebar markup.
- Duplicate "Empty State" logic for Hosts vs. Guests.
- Inline form styling for the "Upload New Map" overlay.

### C. Leaky Abstractions

Derived states like `chatSidebarOffset` ("3rem" vs "20rem") are hardcoded in the view, forcing the UI to manage low-level layout implementation details that should be encapsulated.

## 3. Proposed Decomposition Strategy

### Phase 1: `MapPageController` (Manager)

Extract all non-UI orchestration into a dedicated manager at `apps/web/src/lib/stores/map/map-page-controller.svelte.ts`.

- **Responsibilities**:
  - Unified `onDrop`/`onDragOver` handlers.
  - Upload session state (`showUpload`, `files`, `mapName`).
  - DnD state coordination (`isDragging`).
  - Coordinate unprojection.
  - Guest-mode blocking for GM-only map mutations.
  - Upload-session reset when the active vault changes.

### Phase 2: Component Extraction

Break the markup into focused, reusable units:

1. **`MapHUD.svelte`**: The top-level toolbar (Map selection, "Add Map" button, deletion logic).
2. **`MapVTTSidebar.svelte`**: The complex right-hand sidebar including Token list and Initiative.
3. **`MapVTTControlsHUD.svelte`**: The bottom-center floating bar for GM tools (Fog, Grid, Brush).
4. **`MapUploadOverlay.svelte`**: The absolute-positioned upload form and its local validation.

The route keeps the two small empty states inline because their markup is simple and route-specific; extracting them would add indirection without reducing meaningful complexity.

### Phase 3: Layout Ownership

`layoutUIStore` owns VTT sidebar and VTT chat sidebar collapsed state. `MapPageController` consumes that store to derive `chatSidebarOffset`, keeping hardcoded offset decisions out of the route.

## 4. Target Metrics

| Metric         | Current        | Post-Refactor                   |
| -------------- | -------------- | ------------------------------- |
| Line Count     | 738            | 148                             |
| Logic/UI Ratio | 40/60          | 10/90                           |
| Testability    | Low (E2E only) | High (Unit testable Controller) |

## 5. Next Steps

1. Keep controller behavior covered in `apps/web/src/lib/stores/map/map-page-controller.test.ts`.
2. Run `pnpm --filter web run lint`, `pnpm --filter web run lint:types`, and relevant map/VTT Vitest suites before merging.
3. Watch for Svelte state-closure warnings in the route, controller, and extracted components.
