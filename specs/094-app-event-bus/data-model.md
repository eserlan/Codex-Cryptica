# Data Model: AppEventBus

## Entities

### AppEvent

The primary data structure for all system events.

| Field      | Type               | Description                                                                    |
| :--------- | :----------------- | :----------------------------------------------------------------------------- |
| `type`     | `string`           | The unique identifier for the event (e.g., `VAULT:ENTITY_UPDATED`).            |
| `domain`   | `EventDomain`      | The logical grouping (e.g., `vault`).                                          |
| `payload`  | Event-specific     | The event-specific data. Avoid `any`; use concrete or `unknown` payload types. |
| `metadata` | `AppEventMetadata` | Envelope with `timestamp`, optional `sync`, `remote`, and `vaultId`.           |

The current implementation represents `AppEvent` as a centralized TypeScript union. The long-term architecture should migrate this to a distributed `AppEventRegistry` where domain packages register their own event constants and payloads.

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

### Named Listener

A listener registered with a globally unique name. Reusing the same name replaces the previous listener registration across all filters.

## Validation Rules

- All events MUST have a `type`, `domain`, and `metadata`.
- Transport fields (`timestamp`, `sync`, `remote`, `vaultId`) MUST live under `metadata`, not at the top level.
- Events marked `metadata.sync: true` MUST have a JSON-serializable payload.
- Named listeners MUST be globally unique per name to prevent duplicate registration.
- `reset()` MUST remove non-named listeners and preserve named listeners.
- Remote cross-tab messages MUST be validated as event envelopes before re-emitting.
