# Data Model: Node Read Mode

**Feature**: Node Read Mode (027)

## Transient UI State (`UIStore`)

This feature introduces a new global store for UI state management.

| Field | Type | Description |
| :--- | :--- | :--- |
| `readModeNodeId` | `string \| null` | The ID of the node currently displayed in the Read Mode modal. `null` if closed. |

## Entities (Read-Only)

The feature reads from existing entities but does not modify them.

| Entity | Field | Usage |
| :--- | :--- | :--- |
| `Entity` | `title` | Displayed as header. |
| `Entity` | `content` | Rendered as Markdown body. |
| `Entity` | `connections` | Used to list outgoing links. |
| `Entity` | `tags`, `lore`, `metadata` | Displayed as metadata. |
| `Vault` | `inboundConnections` | Used to list incoming links. |
