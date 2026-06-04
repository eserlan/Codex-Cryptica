import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import type { vault } from "../../../stores/vault.svelte";
import type { sessionModeStore } from "../../../stores/ui/session-mode.svelte";
import type { notificationStore } from "../../../stores/ui/notification.svelte";
import type { mapSession } from "../../../stores/map-session.svelte";
import type { themeStore } from "../../../stores/theme.svelte";
import type { mapStore } from "../../../stores/map.svelte";

import type { GuestStore } from "../../../stores/guest.svelte";

export interface P2PHandlerContext {
  vault: typeof vault;
  sessionModeStore: typeof sessionModeStore;
  notificationStore: typeof notificationStore;
  mapSession: typeof mapSession;
  mapStore: typeof mapStore;
  themeStore: typeof themeStore;
  guestStore: GuestStore;
  transport: any; // P2PTransport
  oracle?: any; // OracleStore — optional so existing tests don't break
}

/**
 * Interface for specialized P2P message handlers, parameterized over a context type
 * so the same routing infrastructure can serve both host and guest sides.
 */
export interface P2PMessageHandler<TContext = P2PHandlerContext> {
  /** Returns true if this handler can process the given message. */
  canHandle(message: P2PMessage): boolean;

  /** Processes the incoming message. */
  handle(
    message: P2PMessage,
    connection: P2PConnection,
    context: TContext,
  ): Promise<void>;
}

/**
 * Abstract base class for action logic and DI.
 */
export abstract class BaseHandler<
  TContext = P2PHandlerContext,
> implements P2PMessageHandler<TContext> {
  abstract canHandle(message: P2PMessage): boolean;
  abstract handle(
    message: P2PMessage,
    connection: P2PConnection,
    context: TContext,
  ): Promise<void>;

  /** Utility to send a message back to the sender */
  protected send(connection: P2PConnection, message: P2PMessage) {
    connection.send(message);
  }
}
