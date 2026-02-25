# Data Model: Lite Version (No AI Support)

## Entities

### Application Settings

Global user preferences persisted in `LocalStorage` or `IndexedDB`.

| Field      | Type    | Description                            | Validation           |
| ---------- | ------- | -------------------------------------- | -------------------- |
| `liteMode` | boolean | If true, all AI features are disabled. | Defaults to `false`. |

## State Transitions

### Enable Lite Mode

- **Initial State**: `liteMode = false`
- **Action**: User toggles Lite Mode ON.
- **Outcome**: `liteMode = true`. AI SDK initialization is blocked. All AI UI elements are unmounted. Oracle enters **Restricted Mode**.

### Disable Lite Mode

- **Initial State**: `liteMode = true`
- **Action**: User toggles Lite Mode OFF.
- **Outcome**: `liteMode = false`. AI SDK can be initialized if an API key is present. Full Oracle functionality restored.
