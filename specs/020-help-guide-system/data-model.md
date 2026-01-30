# Data Model: Help and Guide System

## Entities

### `GuideStep`
Represents a single step in a multi-step walkthrough tour.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier for the step. |
| `targetSelector` | `string` | CSS selector for the DOM element to highlight. |
| `title` | `string` | Short heading for the guide step. |
| `content` | `string` | Markdown-supported explanation of the feature. |
| `position` | `"top" \| "bottom" \| "left" \| "right"` | Preferred position of the tooltip relative to the target. |

### `HelpArticle`
Represents a searchable documentation entry in the Help Center.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier. |
| `title` | `string` | The article headline. |
| `tags` | `string[]` | Keywords for categorization and search optimization. |
| `content` | `string` | Full markdown content of the guide. |

### `HelpStoreState` (Local Storage)
Persistence structure for user progress.

| Field | Type | Description |
| :--- | :--- | :--- |
| `completedTours` | `string[]` | IDs of tours the user has finished. |
| `lastSeenVersion` | `string` | App version when the user last opened the app (to trigger "What's New"). |
| `dismissedHints` | `string[]` | IDs of contextual hints the user has closed. |

## State Transitions
- **`START_TOUR(id)`**: Initializes the tour overlay and sets step index to 0.
- **`NEXT_STEP()`**: Increments step index; updates spotlight position.
- **`END_TOUR()`**: Clears overlay; saves completion status to local storage.
