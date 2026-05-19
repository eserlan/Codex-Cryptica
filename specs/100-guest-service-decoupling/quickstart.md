# Quickstart: P2P Guest Service Decoupling

## Overview

This refactor decomposes the `P2PGuestService` into modular components. For developers, this means message handling logic is now located in specialized handlers, and network transport is abstracted behind a clean interface.

## Key Files

- `apps/web/src/lib/cloud-bridge/p2p/guest-service.ts`: The main entry point (thin facade).
- `apps/web/src/lib/cloud-bridge/p2p/transport/peerjs-client-transport.ts`: PeerJS implementation of the client transport.
- `apps/web/src/lib/cloud-bridge/p2p/handlers/`: Directory containing all message handlers (Vault, VTT, etc.).
- `apps/web/src/lib/cloud-bridge/p2p/guest-file-client.ts`: Logic for chunked file reassembly.

## How to add a new inbound message type

1. **Identify the correct handler**: Determine if the message belongs to Vault, VTT, Session, etc.
2. **Implement/Update the handler**:
   - Add the message type to the handler's `canHandle` check.
   - Implement the logic in the `handle` method.
3. **Register (if new handler)**: If you created a new handler class, register it in the `P2PGuestService` constructor.

## Testing

To test a handler in isolation without network:

```typescript
import { GuestVTTHandler } from "./handlers/guest-vtt-handler";

const handler = new GuestVTTHandler();
const mockConnection = { send: vi.fn(), close: vi.fn(), peer: "host" };
const mockContext = {
  /* ... */
};

await handler.handle(
  { type: "TOKEN_ADDED", token: { id: "1" } },
  mockConnection,
  mockContext,
);
// Assert on mockContext.mapSession calls
```

To test the transport with a mock:

```typescript
import { PeerJsClientTransport } from "./transport/peerjs-client-transport";
// ... mock peerFactory and assert on connection events
```
