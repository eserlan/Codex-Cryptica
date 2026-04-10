# Data Model: Lightweight VTT Functionality

## Entities

### Token

A visual marker placed on a map during a VTT session. Represents a character, creature, or prop in the scene.

**Fields**:

| Field         | Type                 | Description                                                  | Validation                                |
| ------------- | -------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| `id`          | `string`             | Unique identifier (generated)                                | Non-empty, unique within session          |
| `entityId`    | `string \| null`     | Optional link to a vault entity                              | If set, must reference an existing entity |
| `name`        | `string`             | Display name for the token                                   | Non-empty, max 100 chars                  |
| `x`           | `number`             | X position in image-space coordinates                        | >= 0                                      |
| `y`           | `number`             | Y position in image-space coordinates                        | >= 0                                      |
| `width`       | `number`             | Token width in image-space units                             | > 0                                       |
| `height`      | `number`             | Token height in image-space units                            | > 0                                       |
| `rotation`    | `number`             | Rotation in degrees                                          | 0-360                                     |
| `zIndex`      | `number`             | Draw order (higher = on top)                                 | Integer >= 0                              |
| `ownerPeerId` | `string \| null`     | Peer ID of the player who can move this token in shared mode | If set, must be a connected peer          |
| `visibleTo`   | `"all" \| "gm-only"` | Visibility scope controlled by the host                      | One of the two enum values                |
| `color`       | `string`             | Visual color for freeform tokens                             | Valid CSS color                           |
| `imageUrl`    | `string \| null`     | Blob URL or path for token image                             | If set, must be a resolvable URL          |

**Relationships**:

- `entityId` -> Vault Entity (optional, many-to-one)
- `ownerPeerId` -> Connected Peer (optional, many-to-one)
- Belongs to exactly one `EncounterSession`

**Notes**:

- Token ownership is a movement permission, not a visibility rule.
- In the lightweight VTT, `gm-only` is the explicit hidden-from-guests state.
- `owner-only` is legacy compatibility data only; the lightweight VTT should normalize it to `all` and must not emit it for new tokens.

---

### EncounterSession

The ephemeral or saved state associated with a map during a VTT session.

**Fields**:

| Field             | Type                        | Description                                                | Validation                                                     |
| ----------------- | --------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| `id`              | `string`                    | Unique session identifier (generated)                      | Non-empty                                                      |
| `mapId`           | `string`                    | ID of the map this session is associated with              | Must reference an existing map                                 |
| `mode`            | `"exploration" \| "combat"` | Session mode                                               | One of the two enum values                                     |
| `tokens`          | `Record<string, Token>`     | Map of token ID to token object                            | Keys must match token.id                                       |
| `initiativeOrder` | `string[]`                  | Ordered list of token IDs representing turn order          | All IDs must exist in `tokens`; no duplicates                  |
| `round`           | `number`                    | Current round number (1-indexed)                           | >= 1                                                           |
| `turnIndex`       | `number`                    | Index into `initiativeOrder` of the currently active token | 0 <= turnIndex < initiativeOrder.length when list is non-empty |
| `selection`       | `string \| null`            | ID of the currently selected token                         | If set, must exist in `tokens`                                 |
| `chatMessages`    | `ChatMessage[]`             | Shared VTT transcript entries                              | Messages must use the chat message schema                      |
| `sessionFogMask`  | `Uint8Array \| null`        | Compressed PNG data for session-specific fog reveal        | If set, valid PNG data matching map dimensions                 |
| `createdAt`       | `number`                    | Timestamp when session was created (ms since epoch)        | > 0                                                            |
| `savedAt`         | `number \| null`            | Timestamp of last encounter save, or null if ephemeral     | If set, > 0                                                    |

**Relationships**:

- `mapId` -> Map (one-to-one per active session)
- Contains many `Token` objects
- Contains many `ChatMessage` objects
- `initiativeOrder` entries reference `Token` IDs

---

### InitiativeEntry

A reference to a token within the ordered initiative list. Not stored as a separate object - derived from `EncounterSession.initiativeOrder` + `EncounterSession.tokens`.

**Derived Fields**:

| Field             | Source                     | Description                                                        |
| ----------------- | -------------------------- | ------------------------------------------------------------------ |
| `tokenId`         | `initiativeOrder[i]`       | Reference to the token                                             |
| `tokenName`       | `tokens[tokenId].name`     | Display name                                                       |
| `tokenEntityId`   | `tokens[tokenId].entityId` | Linked entity (if any)                                             |
| `tokenColor`      | `tokens[tokenId].color`    | Visual color                                                       |
| `initiativeValue` | Computed/assigned          | Numeric initiative value for sorting (stored separately if needed) |
| `hasActed`        | Tracked per round          | Whether this token has taken its turn in the current round         |

---

### ChatMessage

A shared VTT transcript entry that can be authored by the host or a guest and optionally carries dice-roll output.

**Fields**:

| Field        | Type                     | Description                                     | Validation                              |
| ------------ | ------------------------ | ----------------------------------------------- | --------------------------------------- |
| `id`         | `string`                 | Unique message identifier (generated)           | Non-empty                               |
| `senderId`   | `string`                 | Peer ID or local host identifier for the author | Non-empty                               |
| `senderName` | `string`                 | Display name shown in the transcript            | Non-empty                               |
| `content`    | `string`                 | Chat text or command text                       | May be empty only for roll-only entries |
| `createdAt`  | `number`                 | Timestamp in milliseconds since epoch           | > 0                                     |
| `roll`       | `DiceRollResult \| null` | Parsed dice result shown in the shared roll UI  | If set, must match a resolved roll      |
| `kind`       | `"chat" \| "roll"`       | Message type used by the transcript renderer    | One of the two enum values              |

**Notes**:

- Roll messages created from the dice modal are inserted into the chat transcript using the resolved roll payload, not by rerolling locally.
- `content` may contain the original `/roll` command text for command-based entries.

---

### P2P Session Message

The wire format for VTT session synchronization over the existing P2P layer.

**Discriminated Union**:

| Message Type       | Direction                     | Payload                               | Purpose                                                         |
| ------------------ | ----------------------------- | ------------------------------------- | --------------------------------------------------------------- |
| `SESSION_SNAPSHOT` | Host -> Guest                 | Full `EncounterSession` state         | Initial sync on guest join                                      |
| `TOKEN_ADD`        | Guest -> Host                 | `Token` object                        | Request to add a token                                          |
| `TOKEN_MOVE`       | Guest -> Host                 | `{ tokenId, x, y }`                   | Request to move a token                                         |
| `TOKEN_REMOVE`     | Guest -> Host                 | `{ tokenId }`                         | Request to remove a token                                       |
| `TOKEN_REMOVED`    | Host -> Guest                 | `{ tokenId }`                         | Broadcast when a token is removed from the session              |
| `TOKEN_SELECT`     | Guest -> Host                 | `{ tokenId }`                         | Announce selection for shared highlighting                      |
| `TURN_ADVANCE`     | Host -> Guest                 | `{ turnIndex, round }`                | Notify turn advancement                                         |
| `FOG_REVEAL`       | Host -> Guest                 | `{ maskDelta: Uint8Array }`           | Session fog reveal update                                       |
| `PING`             | Guest -> Host / Host -> Guest | `{ x, y }` in image-space             | Map ping or cursor position                                     |
| `SET_MODE`         | Host -> Guest                 | `{ mode: "exploration" \| "combat" }` | Session mode change                                             |
| `SESSION_SAVE`     | Host -> Guest                 | `{ encounterId }`                     | Notify that encounter was saved                                 |
| `CHAT_MESSAGE`     | Guest -> Host / Host -> Guest | `ChatMessage`                         | Submit or broadcast a chat entry, including shared dice results |

---

## Validation Rules

Derived from functional requirements:

1. **Token bounds** (FR-003, FR-004): When a grid is defined, `x` and `y` must be multiples of `gridSize`. When no grid, any non-negative value is valid.
2. **Initiative integrity** (FR-009): `initiativeOrder` must contain a permutation of all combat-capable token IDs. No duplicates, no missing entries.
3. **Turn index validity** (FR-010): `turnIndex` must always be a valid index into the current `initiativeOrder`.
4. **Permission check** (FR-016): A guest can only send `TOKEN_MOVE` for tokens where `ownerPeerId` matches their peer ID. Ownership does not hide the token from other viewers.
5. **Session-map binding** (FR-020): `sessionFogMask` dimensions must match the associated map's image dimensions.
6. **Chat sync** (FR-032, FR-034, FR-035): `CHAT_MESSAGE` entries must preserve sender metadata and resolved roll payloads so the transcript is consistent for all participants.
