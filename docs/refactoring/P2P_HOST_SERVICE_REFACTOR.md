# Refactor Analysis: P2P Host Service Monolith

**File:** `apps/web/src/lib/cloud-bridge/p2p/host-service.svelte.ts`  
**Current Size:** 918 Lines  
**Status:** 🔴 God File (Critical)

## 1. Problem Statement

The `P2PHostService` is the primary "God Object" for the application's multiplayer capabilities. It currently conflates several distinct architectural layers:

1.  **Network Transport**: Directly managing PeerJS lifecycle, connections, and raw data events.
2.  **Protocol Routing**: A 150+ line `if/else` block that parses and dispatches every incoming P2P message type.
3.  **File Server**: Logic for fetching, chunking (implicit), and sending binary files from OPFS/Vault.
4.  **Business Logic**: Direct implementation of VTT rules (token movement validation, turn advancement) inside the message router.
5.  **State Sync**: Orchestrating the synchronization of Vault, Theme, and Map state between the host and multiple guests.

This high coupling makes the P2P system extremely fragile. A bug in "Ping" handling can crash the entire transport layer, and adding a new multiplayer feature requires modifying a 900-line monolith.

## 2. Proposed Architecture: Layered Multiplayer Bridge

We will transition to a decoupled architecture consisting of a **Transport Provider**, a **Message Dispatcher**, and specialized **Action Handlers**.

### Proposed Structure

```text
apps/web/src/lib/cloud-bridge/p2p/
├── transport/                  # Layer 1: Network IO
│   ├── peer-transport.ts       # PeerJS implementation details
│   └── connection-manager.ts   # Managing the guest list
├── handlers/                   # Layer 2: Domain Logic
│   ├── vtt-handler.ts          # Tokens, Pings, Measurements, Turns
│   ├── vault-handler.ts        # Entity sync, Batch updates
│   └── file-handler.ts         # GET_FILE requests
├── protocol.ts                 # Type-safe message definitions (existing)
└── host-service.svelte.ts      # Layer 3: Thin Facade / Coordinator
```

## 3. Modularization Strategy

### A. The Transport Split

Extract the `Peer` object and its `on("connection")` and `on("data")` listeners into a `P2PTransport` class. The `HostService` should only receive "Events" from this transport (e.g., `GUEST_CONNECTED`, `MESSAGE_RECEIVED`).

### B. The Dispatcher Pattern

Replace the giant `if/else` block with a **Message Dispatcher**.

- Create a registry of handlers.
- Each handler implements a `handle(message, connection)` method.
- The `HostService` becomes a thin router that passes messages to the appropriate handler based on the domain (VTT, Vault, File).

### C. The Handler Extraction

- **`VTTHandler`**: Move all `TOKEN_*`, `TURN_*`, `PING`, and `MEASUREMENT` logic here. This handler will interact with the `mapSession` store.
- **`VaultHandler`**: Move `GUEST_JOIN` (initial snapshot), `ENTITY_UPDATE`, and `BATCH_UPDATE` logic here.
- **`FileHandler`**: Move the complex `handleFileRequest` logic here.

## 4. Immediate Wins

- **Testability**: Handlers can be unit-tested without a real PeerJS network connection.
- **Stability**: Errors in one handler can be caught and isolated without dropping all guest connections.
- **Maintainability**: The `host-service.svelte.ts` file should drop from 918 lines to **< 150 lines**.

---

## Next Steps

1.  **Draft Implementation Plan**: Create a SpecKit-compliant plan for the P2P refactor.
2.  **Define Transport Interface**: Ensure the bridge can support future transport types (e.g. WebSocket fallback) by abstracting PeerJS.
3.  **Extract `VTTHandler`**: The largest and most volatile logic block.
