import type { P2PMessage } from "../p2p-protocol";
import type { TransportErrorPayload } from "./transport-events";

export type ClientTransportEventType = "open" | "data" | "close" | "error";

export type ClientTransportEventPayload = {
  open: void;
  data: any;
  close: void;
  error: TransportErrorPayload | Error | unknown;
};

/**
 * Low-level Network IO interface for the guest (client) side of P2P.
 * Sibling to {@link P2PTransport}; owns the PeerJS peer and a single
 * outbound connection. Stale-connection callbacks are filtered at the
 * transport via an internal epoch so dispatcher/handlers see only
 * current-connection events.
 */
export interface P2PClientTransport {
  /** The guest's own peer ID (available after 'open' or initialized). */
  readonly id: string | null;

  /** Whether currently connected to a host. */
  readonly connected: boolean;

  /**
   * Underlying realtime peer (e.g. the PeerJS Peer) for media calls.
   * Undefined/null when the transport has no media-capable peer.
   */
  readonly rawPeer?: unknown;

  /**
   * Connects to a remote host.
   * @param hostId The Peer ID of the host.
   */
  connect(hostId: string): Promise<void>;

  /**
   * Sends a message to the connected host. No-op if not connected.
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
