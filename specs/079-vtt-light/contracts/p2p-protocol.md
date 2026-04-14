# VTT Session P2P Protocol Contract

This document defines the message types exchanged between the VTT session host and guests over the existing PeerJS DataConnection layer. Most messages are plain JavaScript objects sent via `DataConnection.send()`. Large session snapshots are gzip-compressed at the transport boundary when supported by the browser.

## Message Envelope

Every message follows the format:

```typescript
{ type: "<MESSAGE_TYPE>", ...fields }
```

No wrapper, no versioning, no custom envelope beyond the transport-specific compressed snapshot variant - direct object transmission over PeerJS.

---

## Shared Payload Shapes

### ChatMessage

```typescript
{
  id: string,
  senderId: string,
  senderName: string,
  content: string,
  createdAt: number,
  kind: "chat" | "roll",
  roll: {
    formula: string,
    total: number,
    terms: Array<{
      value: number,
      label?: string
    }>,
    detail?: string
  } | null
}
```

Roll entries are sent as resolved results, not re-rolled by guests.

---

## Host -> Guest Messages

### SESSION_SNAPSHOT

Sent when a guest connects. Provides the complete current session state.

```typescript
{
  type: "SESSION_SNAPSHOT",
  session: {
    id: string,
    mapId: string,
    mode: "exploration" | "combat",
    tokens: Record<string, {
      id: string,
      entityId: string | null,
      name: string,
      x: number,
      y: number,
      width: number,
      height: number,
      rotation: number,
      zIndex: number,
      ownerPeerId: string | null,
      visibleTo: "all" | "gm-only",
      color: string,
      imageUrl: string | null,
      statusEffects: string[]
    }>,
    initiativeOrder: string[],
    initiativeValues: Record<string, number>,
    round: number,
    turnIndex: number,
    selection: string | null,
    sessionFogMask: string | null,
    lastPing: {
      x: number,
      y: number,
      peerId: string,
      color: string,
      timestamp: number
    } | null,
    measurement: {
      active: boolean,
      start: { x: number, y: number } | null,
      end: { x: number, y: number } | null,
      locked?: boolean
    },
    chatMessages: Array<{
      id: string,
      senderId: string,
      senderName: string,
      content: string,
      createdAt: number,
      kind: "chat" | "roll",
      roll: {
        formula: string,
        total: number,
        terms: Array<{
          value: number,
          label?: string
        }>,
        detail?: string
      } | null
    }>,
    createdAt: number,
    savedAt: number | null,
    gridSize?: number,
    gridUnit?: string,
    gridDistance?: number
  }
}
```

### SESSION_SNAPSHOT_GZIP

Preferred transport form for `SESSION_SNAPSHOT` when the browser supports `CompressionStream`.

```typescript
{
  type: "SESSION_SNAPSHOT_GZIP",
  encoding: "gzip",
  data: ArrayBuffer
}
```

Guests must accept either the plain or gzip-compressed snapshot payload.

### TOKEN_STATE_UPDATE

Broadcast when the host confirms a token operation. Sent to all guests.

```typescript
{
  type: "TOKEN_STATE_UPDATE",
  tokenId: string,
  delta: {
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    rotation?: number,
    visibleTo?: "all" | "gm-only",
    ownerPeerId?: string | null,
    imageUrl?: string | null,
    statusEffects?: string[]
  }
}
```

### TOKEN_ADDED

Broadcast when a new token is placed on the map.

```typescript
{
  type: "TOKEN_ADDED",
  token: {
    id: string,
    entityId: string | null,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    zIndex: number,
    ownerPeerId: string | null,
    visibleTo: "all" | "gm-only",
    color: string,
    imageUrl: string | null
  }
}
```

### TOKEN_REMOVED

Broadcast when a token is removed from the session.

```typescript
{
  type: "TOKEN_REMOVED",
  tokenId: string
}
```

### TURN_ADVANCE

Broadcast when the host advances to the next turn.

```typescript
{
  type: "TURN_ADVANCE",
  turnIndex: number,
  round: number,
  activeTokenId: string
}
```

### FOG_REVEAL

Broadcast when the host reveals or hides fog during the session.

```typescript
{
  type: "FOG_REVEAL",
  strokes: Array<{
    x: number,
    y: number,
    radius: number,
    reveal: boolean
  }>
}
```

### MAP_MEASUREMENT

Broadcast when the host updates the measurement overlay.

```typescript
{
  type: "MAP_MEASUREMENT",
  mapId: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  peerId: string,
  active: boolean
}
```

### SET_MODE

Broadcast when the host changes the session mode.

```typescript
{
  type: "SET_MODE",
  mode: "exploration" | "combat"
}
```

### SESSION_ENDED

Broadcast when the host ends the shared VTT session.

```typescript
{
  type: "SESSION_ENDED";
}
```

### MAP_PING

Broadcast when any participant places a ping on the map.

```typescript
{
  type: "MAP_PING",
  x: number,
  y: number,
  peerId: string
}
```

### CHAT_MESSAGE

Broadcast when a chat entry or resolved dice result should appear in the shared transcript.

```typescript
{
  type: "CHAT_MESSAGE",
  message: ChatMessage
}
```

---

## Guest -> Host Messages

### TOKEN_MOVE

Sent by a guest to request moving a token they own.

```typescript
{
  type: "TOKEN_MOVE",
  tokenId: string,
  x: number,
  y: number
}
```

**Expected host response**: `TOKEN_STATE_UPDATE` broadcast to all guests (including the requester) with the confirmed position. If the host rejects the move (invalid token, wrong owner, out of bounds), no response is sent - the guest client should revert the token to its last known position after a timeout.

### TOKEN_ADD_REQUEST

Sent by a guest to request adding a freeform token (e.g., their character).

```typescript
{
  type: "TOKEN_ADD_REQUEST",
  name: string,
  entityId: string | null,
  x: number,
  y: number,
  color: string
}
```

**Expected host response**: `TOKEN_ADDED` with the full token object (host assigns `id`, `ownerPeerId`, etc.).

### PING

Sent when a guest clicks to place a ping marker.

```typescript
{
  type: "PING",
  x: number,
  y: number
}
```

### CHAT_MESSAGE

Sent by a guest to submit chat text or a resolved dice roll for the shared transcript.

```typescript
{
  type: "CHAT_MESSAGE",
  message: ChatMessage
}
```

---

## Error Handling

- If a guest sends a `TOKEN_MOVE` for a token they don't own, the host silently ignores it. The guest client should implement a 500ms revert timeout if no `TOKEN_STATE_UPDATE` arrives.
- If a guest requests token removal using `TOKEN_REMOVE` or a compatible `TOKEN_REMOVED` action, the host removes the token and broadcasts `TOKEN_REMOVED` to all guests.
- If a `SESSION_SNAPSHOT` or `SESSION_SNAPSHOT_GZIP` is received but the `mapId` doesn't match the guest's current map, the guest logs a warning and ignores the snapshot.
- Malformed messages (missing required fields) are silently discarded with a debug log.

## P2P Rules

- The host is authoritative for encounter state. Guests may request changes, but the host decides whether to apply them.
- Token ownership is a movement permission only. It does not change whether other participants can see the token.
- Token visibility is controlled separately by the host through the token's visibility state; in the lightweight VTT, hidden-from-guests state is represented by `visibleTo: "gm-only"`. `owner-only` is legacy compatibility data and should be normalized to `all`.
- Large `SESSION_SNAPSHOT` payloads should be compressed when browser support exists, but the uncompressed schema remains the canonical data model.
- The initiative pop-out mirrors the same session state as the sidebar, including current initiative order, selection, and token ownership assignments.
- Chat messages and resolved dice rolls are synchronized through the same transcript payload so all participants see the same output.
