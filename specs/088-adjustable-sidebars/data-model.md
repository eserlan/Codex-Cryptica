# Data Model: Adjustable Sidebars

## UI Store Extensions (`UIStore`)

The global `uiStore` will be extended to track the persisted widths of the sidebars.

| Field               | Type     | Description                                       | Persistence    |
| :------------------ | :------- | :------------------------------------------------ | :------------- |
| `leftSidebarWidth`  | `number` | The current width of the left sidebar in pixels.  | `localStorage` |
| `rightSidebarWidth` | `number` | The current width of the right sidebar in pixels. | `localStorage` |

## Constants / Configuration

These are not persisted data, but configuration boundaries used by the resizing logic.

| Constant                  | Value | Description                                                                                 |
| :------------------------ | :---- | :------------------------------------------------------------------------------------------ |
| `MIN_LEFT_SIDEBAR_WIDTH`  | `240` | Minimum width in pixels for the left sidebar.                                               |
| `MIN_RIGHT_SIDEBAR_WIDTH` | `320` | Minimum width in pixels for the right sidebar (to accommodate rich text/forms).             |
| `MAX_SIDEBAR_VW`          | `40`  | Maximum width as a percentage of viewport width (`vw`) to prevent crushing the center view. |

## State Transitions (Transient)

During a drag operation, local component state will track:

- `isDragging`: `boolean` (Active state for applying `cursor-col-resize` globally or disabling pointer events on iframes to prevent capture loss).
- `startX`: `number` (Initial X coordinate of the pointerdown event).
- `startWidth`: `number` (Initial width of the sidebar when dragging began).
