# Data Model: Rich Text Formatting

## UI State (Transient)

### Editor Toolbar State

State derived from the Tiptap editor instance, used to highlight active buttons.

| Field           | Type             | Description                              |
| :-------------- | :--------------- | :--------------------------------------- |
| `isBold`        | `boolean`        | True if selection is bold.               |
| `isItalic`      | `boolean`        | True if selection is italic.             |
| `isHeading`     | `number \| null` | Level (1-6) of current heading, or null. |
| `isBulletList`  | `boolean`        | True if selection is in a bullet list.   |
| `isOrderedList` | `boolean`        | True if selection is in an ordered list. |
| `isBlockquote`  | `boolean`        | True if selection is a blockquote.       |
| `isLink`        | `boolean`        | True if selection is a link.             |

### Zen Mode State

Managed in `ui` store or component local state.

| Field       | Type      | Description                                                            |
| :---------- | :-------- | :--------------------------------------------------------------------- |
| `isZenMode` | `boolean` | Toggles the editor between default inline view and fullscreen overlay. |

## Persistence

Content is persisted as Markdown string in the `Entity` object (already existing). No schema changes required.
