import type { P2PMessage } from "../p2p-protocol";

export type TransportEventType =
  | "connection"
  | "data"
  | "error"
  | "close"
  | "disconnected";

export interface P2PConnection {
  peer: string;
  label?: string;
  metadata?: any;
  send(data: any): void;
  close(): void;
}

/**
 * Low-level Network IO interface for P2P communication.
 */
export interface P2PTransport {
  /** The unique peer ID of the host. */
  id: string | null;

  /** List of currently active guest connections. */
  connections: P2PConnection[];

  /**
   * Initializes the transport and starts listening for connections.
   * @param peerId Preferred ID (optional).
   */
  start(peerId?: string): Promise<string>;

  /**
   * Stops the transport and closes all connections.
   */
  stop(): void;

  /**
   * Sends a message to a specific peer.
   */
  send(peerId: string, data: P2PMessage | any): void;

  /**
   * Broadcasts a message to all connected peers.
   */
  broadcast(data: P2PMessage | any, excludePeerId?: string): void;

  /**
   * Register an event listener.
   */
  on(event: TransportEventType, callback: (payload: any) => void): void;
}
