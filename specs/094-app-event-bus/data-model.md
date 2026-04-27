# Data Model: AppEventBus

## Entities

### AppEvent (Union Type)

The primary data structure for all system events.

| Field      | Type               | Description                                                          |
| :--------- | :----------------- | :------------------------------------------------------------------- |
| `type`     | `string`           | The unique identifier for the event (e.g., `VAULT:ENTITY_UPDATED`).  |
| `domain`   | `EventDomain`      | The logical grouping (e.g., `vault`).                                |
| `payload`  | `any`              | The event-specific data.                                             |
| `metadata` | `AppEventMetadata` | Envelope with `timestamp`, optional `sync`, `remote`, and `vaultId`. |

### AppEventMetadata

| Field       | Type      | Description                                                   |
| :---------- | :-------- | :------------------------------------------------------------ |
| `timestamp` | `number`  | When the event occurred (Unix ms).                            |
| `sync`      | `boolean` | (Optional) If true, the event is broadcast to other tabs.     |
| `remote`    | `boolean` | (Optional) Set to `true` on events received from another tab. |
| `vaultId`   | `string`  | (Optional) The vault the event belongs to.                    |

### EventDomain (Enum/Literal)

- `vault`: Core content management.
- `oracle`: AI and chat operations.
- `sync`: External synchronization status.
- `ui`: Navigation and workspace state.
- `system`: App-level lifecycle events.

### EventListener

A function signature: `(event: AppEvent) => void | Promise<void>`.

## Validation Rules

- All events MUST have a `type`, `domain`, and `metadata`.
- Events marked `metadata.sync: true` MUST have a JSON-serializable payload.
- Named listeners MUST be unique per name to prevent duplicate registration.
