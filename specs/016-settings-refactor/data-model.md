# Data Model: Settings State

**Feature**: Settings Panel Refactoring (016-settings-refactor)

## UI State (Svelte Store)

The `UIStore` tracks the active configuration pane.

### Type: `SettingsTab`

```typescript
export type SettingsTab =
  | "vault" // General vault info, indexing
  | "sync" // Google Drive / Cloud Sync
  | "intelligence" // Gemini API / Oracle settings
  | "schema" // Category management
  | "about"; // Legal, Version, Links
```

### Store Schema (`uiStore`)

| Property            | Type          | Description                                   |
| :------------------ | :------------ | :-------------------------------------------- |
| `showSettings`      | `boolean`     | Controls visibility of the `SettingsModal`.   |
| `activeSettingsTab` | `SettingsTab` | Controls which pane is rendered in the modal. |

## Event Flow

1. **User Event**: Clicks Header Gear Icon.
   - Action: `uiStore.toggleSettings("vault")`.
2. **User Event**: Clicks "Manage Categories" in a context menu.
   - Action: `uiStore.openSettings("schema")`.
3. **User Event**: Settings Modal -> Sidebar Click.
   - Action: Set `uiStore.activeSettingsTab`.
