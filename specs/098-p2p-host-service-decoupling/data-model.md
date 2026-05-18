# Data Model: P2P Host Service Decoupling

## 1. Interfaces

### `P2PTransport`

Located in `apps/web/src/lib/cloud-bridge/p2p/transport/transport-interface.ts`.
Responsible for low-level network IO.

```typescript
export type TransportEventType = "connection" | "data" | "error" | "close";

export interface P2PTransport {
  id: string | null;
  start(peerId: string): Promise<string>;
  stop(): void;
  send(peerId: string, data: any): void;
  broadcast(data: any, excludePeerId?: string): void;
  on(event: TransportEventType, callback: (payload: any) => void): void;
}
```

### `P2PMessageHandler`

Located in `apps/web/src/lib/cloud-bridge/p2p/handlers/base-handler.ts`.
Responsible for domain-specific message processing.

```typescript
export interface P2PHandlerContext {
  vault: VaultService;
  uiStore: UIStore;
  mapSession: MapSessionStore;
  themeStore: ThemeStore;
}

export interface P2PMessageHandler {
  handle(
    message: P2PMessage,
    connection: any,
    context: P2PHandlerContext,
  ): Promise<void>;
}
```

## 2. Shared Data Shapes

### `P2PMessage` (Existing)

Adheres to the `P2PMessage` union type defined in `p2p-protocol.ts`.

## 3. Architecture Hierarchy

- `P2PHostService` (Coordinator/Store)
  - `P2PTransport` (IO)
  - `P2PDispatcher` (Routing)
    - `VTTHandler` (Action)
    - `VaultHandler` (Action)
    - `FileHandler` (Action)
