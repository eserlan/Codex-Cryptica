# Data Model: Graph Focus Styles

**Feature**: Graph Focus Highlight (014-graph-focus-mode)

## Style Definitions (Cytoscape Classes)

The focus state is entirely CSS/Class-driven. No persistent database entities are required.

### Class: `.dimmed`

| Property  | Value  | Description                                                   |
| :-------- | :----- | :------------------------------------------------------------ |
| `opacity` | `0.35` | Reduced visibility for background context (A11y balanced).    |
| `events`  | `no`   | Disable interaction for dimmed elements to prevent misclicks. |

### Class: `.neighborhood` (Applied to connected nodes/edges)

| Property  | Value | Description                                       |
| :-------- | :---- | :------------------------------------------------ |
| `opacity` | `1.0` | Full visibility.                                  |
| `z-index` | `100` | Ensure focused elements appear above dimmed ones. |

## Event Flow

1.  **Event**: `tap` on Node
    - Action: Calculate Neighborhood.
    - Action: Apply `dimmed` to all.
    - Action: Remove `dimmed` from Neighborhood.
2.  **Event**: `tap` on Background
    - Action: Remove `dimmed` from all.
