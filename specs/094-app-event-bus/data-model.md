# Data Model: AppEventBus

## Entities

### AppEvent (Union Type)

The primary data structure for all system events.

| Field       | Type          | Description                                                      |
| :---------- | :------------ | :--------------------------------------------------------------- |
| `type`      | `string`      | The unique identifier for the event (e.g., `ENTITY_UPDATED`).    |
| `domain`    | `EventDomain` | The logical grouping (e.g., `vault`).                            |
| `payload`   | `any`         | The event-specific data.                                         |
| `sync`      | `boolean`     | (Optional) If true, the event should be broadcasted across tabs. |
| `timestamp` | `number`      | When the event occurred.                                         |

### EventDomain (Enum/Literal)

- `vault`: Core content management.
- `oracle`: AI and chat operations.
- `sync`: External synchronization status.
- `ui`: Navigation and workspace state.
- `system`: App-level lifecycle events.

### EventListener

A function signature: `(event: AppEvent) => void | Promise<void>`.

## Validation Rules

- All events MUST have a `type` and `domain`.
- Events marked `sync: true` MUST have a serializable payload (JSON-compatible).
- Named listeners MUST be unique per domain to prevent duplicate registration.
