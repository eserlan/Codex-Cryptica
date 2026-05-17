# Data Model: P2P Host Service Decoupling

## 1. Interfaces

### `P2PTransport`

Located in `apps/web/src/lib/cloud-bridge/p2p/transport/transport-interface.ts`.

```typescript
export interface P2PTransport {
  id: string | null;
  connections: P2PConnection[];
  start(onOpen: (id: string) => void): Promise<string>;
  send(peerId: string, message: P2PMessage): void;
  broadcast(message: P2PMessage, excludePeerId?: string): void;
  on(
    event: "connection" | "data" | "error" | "close",
    callback: Function,
  ): void;
}
```

### `P2PMessageHandler`

Located in `apps/web/src/lib/cloud-bridge/p2p/handlers/base-handler.ts`.

```typescript
export interface P2PMessageHandler {
  canHandle(message: P2PMessage): boolean;
  handle(message: P2PMessage, connection: any): Promise<void>;
}
```

## 2. P2P Protocol (Existing)

Located in `apps/web/src/lib/cloud-bridge/p2p/p2p-protocol.ts`.
Refactored logic will adhere to these existing message types to ensure client compatibility.

## 3. Architecture Hierarchy

- `P2PHostService` (Coordinator/Store)
  - `P2PTransport` (IO)
  - `P2PDispatcher` (Routing)
    - `VTTHandler`
    - `VaultHandler`
    - `FileHandler`
