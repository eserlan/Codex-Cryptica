# Research: Campaign Date Picker

## Unknowns & Investigations

### 1. Popover Positioning Library

- **Decision**: Use `Floating UI` (formerly Popper).
- **Rationale**: Industry standard for robust popover positioning. Handles edge detection and auto-flipping, which is critical for a compact date picker in dense UI contexts.
- **Alternatives considered**: Native CSS `anchor-positioning` (too experimental), `Svelte-Floating-UI` wrapper.

### 2. Custom Calendar Logic (Non-Standard)

- **Decision**: Implement a custom `CalendarEngine` class in `packages/chronology-engine`.
- **Rationale**: Existing libraries like `date-fns` or `dayjs` are hardcoded to the Gregorian calendar. We need logic that can handle an arbitrary number of months and days-per-month.
- **Alternatives considered**: `Temporal` API (still early), custom object-based math.

### 3. Year Navigation UX

- **Decision**: Use an "Era Snap" list followed by a year input/slider.
- **Rationale**: In RPG contexts, users often think in terms of "The Age of Fire" rather than specific numeric years initially.
- **Alternatives considered**: Infinite scroll year list (too heavy for large ranges).

## Best Practices

### Svelte 5 Popovers

- Use `bind:this` for anchoring.
- Use `portal` (or similar) to ensure the picker isn't clipped by parent containers with `overflow: hidden`.

### Accessibility

- The picker MUST be navigable via keyboard (Arrow keys for date selection).
- Support `aria-expanded` and `aria-haspopup`.
