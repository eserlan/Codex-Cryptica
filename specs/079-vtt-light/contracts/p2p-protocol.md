# VTT Session P2P Protocol Contract

This document defines the message types exchanged between the VTT session host and guests over the existing PeerJS DataConnection layer. All messages are plain JavaScript objects sent via `DataConnection.send()`.

## Message Envelope

Every message follows the format:

```typescript
{ type: "<MESSAGE_TYPE>", ...fields }
```

No wrapper, no versioning, no serialization — direct object transmission over PeerJS.

---

## Host → Guest Messages

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
      visibleTo: "all" | "gm-only" | "owner-only",
      color: string,
      imageUrl: string | null
    }>,
    initiativeOrder: string[],
    round: number,
    turnIndex: number,
    selection: string | null
  }
}
```

### TOKEN_STATE_UPDATE

Broadcast when the host confirms a token operation. Sent to all guests.

```typescript
{
  type: "TOKEN_STATE_UPDATE",
  tokenId: string,
  delta: {
    x?: number,
    y?: number,
    rotation?: number,
    visibleTo?: "all" | "gm-only" | "owner-only"
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
    visibleTo: "all" | "gm-only" | "owner-only",
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
  // Delta: array of {x, y, radius, reveal: boolean} brush strokes
  strokes: Array<{
    x: number,
    y: number,
    radius: number,
    reveal: boolean
  }>
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

### MAP_PING

Broadcast when any participant places a ping on the map.

```typescript
{
  type: "MAP_PING",
  x: number,    // image-space
  y: number,    // image-space
  peerId: string  // originator
}
```

---

## Guest → Host Messages

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

**Expected host response**: `TOKEN_STATE_UPDATE` broadcast to all guests (including the requester) with the confirmed position. If the host rejects the move (invalid token, wrong owner, out of bounds), no response is sent — the guest client should revert the token to its last known position after a timeout.

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

---

## Error Handling

- If a guest sends a `TOKEN_MOVE` for a token they don't own, the host silently ignores it. The guest client should implement a 500ms revert timeout if no `TOKEN_STATE_UPDATE` arrives.
- If a `SESSION_SNAPSHOT` is received but the `mapId` doesn't match the guest's current map, the guest logs a warning and ignores the snapshot.
- Malformed messages (missing required fields) are silently discarded with a debug log.
