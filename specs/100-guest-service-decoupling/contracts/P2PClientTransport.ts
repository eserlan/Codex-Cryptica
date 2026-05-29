import type { P2PMessage } from "../p2p-protocol";

export type ClientTransportEventType = "open" | "data" | "close" | "error";

export interface P2PClientTransport {
  /** The guest's own peer ID (available after 'open' or initialized). */
  readonly id: string | null;

  /** Whether currently connected to a host. */
  readonly connected: boolean;

  /**
   * Connects to a remote host.
   * @param hostId The Peer ID of the host.
   */
  connect(hostId: string): Promise<void>;

  /**
   * Sends a message to the connected host.
   */
  send(message: P2PMessage | any): void;

  /**
   * Disconnects from the host and destroys the peer.
   */
  disconnect(): void;

  /**
   * Event listener registration.
   */
  on(event: ClientTransportEventType, callback: (payload?: any) => void): void;

  /**
   * Remove event listener.
   */
  off(event: ClientTransportEventType, callback: (payload?: any) => void): void;
}
