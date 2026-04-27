# Research: Adjustable Sidebars

## Decision: Resizing Implementation Strategy

**Decision**: Use `PointerEvent` (`pointerdown`, `pointermove`, `pointerup`) with `setPointerCapture` to handle the dragging interaction.
**Rationale**: Pointer events provide better support for touch and pen inputs compared to standard mouse events. Using `setPointerCapture` ensures that the drag operation continues smoothly even if the user's cursor temporarily moves outside the handle or the browser window, preventing stuttering or dropped drags.
**Alternatives Considered**:

- **HTML5 Drag and Drop API**: Rejected because it's designed for moving elements/data, not continuous resizing, and often creates "ghost" images.
- **Mouse Events only**: Rejected because it lacks robust touch support and `setPointerCapture` features out of the box.

## Decision: State Management & Performance

**Decision**: Store the active width values in Svelte 5 `$state` runes within a local component or global store, and bind them to inline CSS `style` properties on the layout containers.
**Rationale**: Svelte 5's fine-grained reactivity is extremely fast. Binding a `$state` number to a `style="width: {width}px"` property allows for 60fps updates during the drag without triggering heavy virtual DOM diffs.
**Alternatives Considered**:

- **Updating a global CSS Variable via `document.documentElement.style`**: Also very performant, but slightly less idiomatic to Svelte components. Svelte 5 runes are fast enough for this use case.

## Decision: Persistence

**Decision**: Add `leftSidebarWidth` and `rightSidebarWidth` to the existing `UIStore` (`apps/web/src/lib/stores/ui.svelte.ts`), which already handles `localStorage` persistence for other UI preferences like sidebar visibility.
**Rationale**: Keeps all UI-related user preferences in a single, established location.

## Decision: Min/Max Boundaries

**Decision**: Enforce a minimum width (e.g., 200px for left, 300px for right to accommodate dense text) and a maximum width based on viewport percentage (e.g., 50vw or 40vw to ensure the center canvas is never fully crushed).
**Rationale**: Protects the user from breaking the layout by making sidebars too small to be useful or too large to see the main content.
