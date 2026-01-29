# Data Model: UI & Sync State

## SyncStatus (In-Memory Store)
Represents the current state of the Cloud Bridge synchronization process.

| Field | Type | Description |
|-------|------|-------------|
| status | `IDLE \| SCANNING \| SYNCING \| SUCCESS \| ERROR` | Current operation phase |
| lastError | `string \| null` | Error message if status is ERROR |
| stats | `SyncStats` | Count of uploaded/downloaded files |

### State Transitions
- `IDLE -> SCANNING`: Triggered by interval or manual button.
- `SCANNING -> SYNCING`: Files detected for transfer.
- `SYNCING -> SUCCESS`: All files processed successfully.
- `SYNCING/SCANNING -> ERROR`: Connection or file system failure.
- `SUCCESS/ERROR -> IDLE`: After 3-5 seconds of displaying result.

## ViewportState (Derived from CSS/Window)
Determines the layout configuration based on screen width.

| Breakpoint | Class | Layout Impact |
|------------|-------|---------------|
| < 640px | `xs` / `sm` | "CA" logo, full-width detail panel, stacked header. |
| 640px - 768px | `md` | "Codex Cryptica" title, search visible, 1/3 width panel. |
| > 1024px | `lg` / `xl` | Full header, 1/4 width panel. |
