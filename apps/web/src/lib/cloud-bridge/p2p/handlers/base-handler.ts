import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import type { vault } from "../../../stores/vault.svelte";
import type { uiStore } from "../../../stores/ui.svelte";
import type { mapSession } from "../../../stores/map-session.svelte";
import type { themeStore } from "../../../stores/theme.svelte";
import type { mapStore } from "../../../stores/map.svelte";

export interface P2PHandlerContext {
  vault: typeof vault;
  uiStore: typeof uiStore;
  mapSession: typeof mapSession;
  mapStore: typeof mapStore;
  themeStore: typeof themeStore;
  guestRoster: any; // Svelte writable
  transport: any; // P2PTransport
}

/**
 * Interface for specialized P2P message handlers.
 */
export interface P2PMessageHandler {
  /** Returns true if this handler can process the given message. */
  canHandle(message: P2PMessage): boolean;

  /** Processes the incoming message. */
  handle(
    message: P2PMessage,
    connection: P2PConnection,
    context: P2PHandlerContext,
  ): Promise<void>;
}

/**
 * Abstract base class for action logic and DI.
 */
export abstract class BaseHandler implements P2PMessageHandler {
  abstract canHandle(message: P2PMessage): boolean;
  abstract handle(
    message: P2PMessage,
    connection: P2PConnection,
    context: P2PHandlerContext,
  ): Promise<void>;

  /** Utility to send a message back to the sender */
  protected send(connection: P2PConnection, message: P2PMessage) {
    connection.send(message);
  }

  /** Utility to broadcast a message to all except sender */
  protected broadcast(
    context: P2PHandlerContext,
    message: P2PMessage,
    excludePeerId?: string,
  ) {
    context.transport.broadcast(message, excludePeerId);
  }
}
