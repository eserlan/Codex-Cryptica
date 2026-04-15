# Research: Label-Grouped Entity Explorer

## Context

GitHub Issue #606 asks for better organization inside the Entity Explorer once a vault contains enough content that a single alphabetical list becomes slow to scan. The requirement is label-based grouping plus persistence of the selected explorer layout. The change is limited to explorer presentation and preference persistence; it does not add new entity fields or backend behavior.

## Technical Decisions

### Reuse the Existing Explorer Component

- **Decision**: Extend `apps/web/src/lib/components/explorer/EntityList.svelte` instead of introducing a new explorer-specific package or rendering layer.
- **Rationale**: The feature only changes how the existing filtered entity list is presented. Keeping the work inside the explorer component avoids unnecessary abstractions.
- **Alternatives Considered**:
  - **Standalone explorer grouping service**: Rejected because the grouping logic is small, UI-local, and tightly coupled to existing explorer rendering.

### Persist the Layout in `uiStore`

- **Decision**: Store the selected explorer layout in `apps/web/src/lib/stores/ui.svelte.ts`.
- **Rationale**: `uiStore` already owns persisted UI preferences such as other sidebar and view settings, so explorer mode belongs in the same state surface.
- **Alternatives Considered**:
  - **Component-local state only**: Rejected because the chosen explorer view would reset on reload.

### Group Only After Search and Category Filtering

- **Decision**: Build grouped sections from the already filtered entity list.
- **Rationale**: This preserves current explorer semantics and guarantees grouped layouts honor existing search and category filters without duplicating filtering logic.
- **Alternatives Considered**:
  - **Group before filtering**: Rejected because it would require extra filtering passes and make empty-group handling more complex.

### Keep Entities Discoverable Through Fallback Groups

- **Decision**: Use an `Unlabeled` section in label mode.
- **Rationale**: Grouped layouts should never hide entities just because labels are missing.
- **Alternatives Considered**:
  - **Hide entities without grouping metadata**: Rejected because it would make grouped views incomplete and confusing.

## Validation Notes

- The branch includes targeted automated coverage in `apps/web/src/lib/components/explorer/EntityListGrouping.test.ts` for label grouping.
- Manual validation is still required for explorer interaction details such as filtering, theme states, and persisted layout restoration.
