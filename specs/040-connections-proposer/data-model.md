# Data Model: Connections Proposer

## ProposedConnection (IndexedDB)

| Field        | Type     | Description                                             |
| :----------- | :------- | :------------------------------------------------------ |
| `id`         | `string` | Primary Key: `${sourceId}:${targetId}`                  |
| `sourceId`   | `string` | ID of the entity where the mention/context was found.   |
| `targetId`   | `string` | ID of the suggested entity.                             |
| `type`       | `string` | AI-suggested relationship type (e.g., "ally", "spawn"). |
| `reason`     | `string` | Semantic justification for the link.                    |
| `confidence` | `number` | Score between 0.0 and 1.0.                              |
| `status`     | `string` | `pending` \| `accepted` \| `rejected`                   |
| `timestamp`  | `number` | When the proposal was last updated.                     |

## Validation Rules

1.  **Duplicate Prevention**: A proposal MUST NOT be created if an actual connection with the same `targetId` already exists in `vault.entities[sourceId].connections`.
2.  **Uniqueness**: Only one proposal can exist per source/target pair.
3.  **Self-Reference**: `sourceId` and `targetId` MUST NOT be identical.

## State Transitions

- `init`: AI scan finds a new link → `pending`.
- `user_accept`: User clicks "Apply" → `accepted` (and real connection created).
- `user_dismiss`: User clicks "Dismiss" → `rejected`.
- `user_retry`: User clicks "Re-evaluate" from history → `pending`.
