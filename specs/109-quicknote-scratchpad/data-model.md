# Data Model: QuickNote Scratchpad

## Entities

### QuickNote

Represents a fleeting idea captured via the floating scratchpad.

| Field     | Type   | Description                                 |
| --------- | ------ | ------------------------------------------- |
| id        | string | Unique identifier (UUID or Auto-increment). |
| vaultId   | string | The ID of the active vault.                 |
| content   | string | Raw unformatted text/markdown.              |
| status    | string | 'active', 'elevated', or 'archived'.        |
| createdAt | number | Unix timestamp.                             |

## Storage

- **Dexie Table**: `quick_notes`
- **Indices**: `++id`, `vaultId`, `status`, `createdAt`
