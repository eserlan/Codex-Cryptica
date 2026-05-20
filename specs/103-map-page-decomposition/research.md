# Research: Map Page Decomposition

## Decisions

### 1. Controller Implementation Pattern

- **Decision**: Implement `MapPageController` as a Svelte 5 class using Runes (`$state`, `$derived`).
- **Rationale**: Provides a unified, reactive source of truth for the entire Map route. Enables clean delegation of interaction handlers (DnD, Upload) from the view to the logic layer.
- **Alternatives Considered**:
  - Svelte context: Rejected as it's less unit-testable than a standalone class.
  - Direct store usage: Rejected because the Map page needs to bridge _multiple_ stores and has unique transient state (upload session) that doesn't belong in the global `mapStore`.

### 2. Layout Offset Management

- **Decision**: Migrate the hardcoded "20rem" / "3rem" chat sidebar offsets to the `layoutUIStore` or use CSS variables.
- **Rationale**: Removes magic numbers from the Svelte component. Sub-components (HUD, Controls) can reactively adjust their positions without prop-drilling or duplication.
- **Implementation**: The `MapPageController` will query the `layoutUIStore` for current offsets to calculate HUD positioning.

### 3. Drag & Drop Strategy

- **Decision**: Consolidate both Internal Entity Drag and External File Drop into unified handlers in the `MapPageController`.
- **Rationale**: Simplifies the markup significantly. The controller can differentiate between `application/codex-entity` and `Files` using a internal strategy pattern, keeping the view clean.

### 4. Upload Session Lifecycle

- **Decision**: The `MapPageController` will manage the `MapUploadOverlay` visibility and data (`mapName`, `files`).
- **Rationale**: The upload process is intrinsically tied to the map page's active state. Keeping it in the controller ensures it's correctly reset on route transitions or vault switches.

## Research Tasks Resolved

- [x] Best practices for Svelte 5 controller pattern.
- [x] Sharing layout offsets without prop drilling.
- [x] Unified DnD orchestration strategy.
