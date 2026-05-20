# Interface Contracts: PeerJSConnectionManager

This contract defines the public methods, callbacks, and expected behaviors of the `PeerJSConnectionManager` class.

## 1. Public Class API

```typescript
export class PeerJSConnectionManager {
  /**
   * The current reactive connection state.
   * Leverages Svelte 5 Runes ($state) so consumers update reactively.
   */
  readonly state: ConnectionState;

  /**
   * Initialize a host session and open the signaling port to listen for incoming peers.
   */
  async startHost(hostPeerId?: string): Promise<string>;

  /**
   * Connect to a remote host session by Peer ID.
   */
  async connect(hostId: string): Promise<void>;

  /**
   * Disconnect cleanly, destroy any active sockets, clear heartbeats and listeners.
   */
  disconnect(): void;

  /**
   * Send a formatted message to a specific peer (or broadcast if omitted).
   */
  send(messageType: string, payload: any, peerId?: string): void;

  /**
   * Register a custom callback handler for specific message types.
   * Returns an unsubscribe function.
   */
  onMessage<T = any>(
    type: string,
    callback: (message: PeerJSMessage<T>) => void,
  ): () => void;
}
```

## 2. Event Types & Format Rules

Every message sent or received must be formatted with the JSON layout defined in `data-model.md`.

| Event Type  | Direction | Description                                                                         |
| ----------- | --------- | ----------------------------------------------------------------------------------- |
| `ping`      | Out / In  | Diagnostics: heartbeat probe to check channel availability.                         |
| `pong`      | Out / In  | Diagnostics: heartbeat response containing the original request timestamp.          |
| `handshake` | Out / In  | Authentication: handshake validation containing client versions and session states. |
