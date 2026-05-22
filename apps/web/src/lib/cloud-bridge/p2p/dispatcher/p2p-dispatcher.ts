import { isValidP2PMessage, type P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import type {
  P2PMessageHandler,
  P2PHandlerContext,
} from "../handlers/base-handler";

/**
 * Registry-based dispatcher for P2P messages.
 * Parameterized over a context type so it can serve host and guest sides
 * with their own handler-context shape.
 */
export class P2PDispatcher<TContext = P2PHandlerContext> {
  private handlers: P2PMessageHandler<TContext>[] = [];

  /**
   * Registers a new handler in the dispatcher.
   */
  register(handler: P2PMessageHandler<TContext>) {
    this.handlers.push(handler);
  }

  /**
   * Routes an incoming message to the first handler that can process it.
   */
  async dispatch(
    message: unknown,
    connection: P2PConnection,
    context: TContext,
  ): Promise<boolean> {
    if (!isValidP2PMessage(message)) {
      console.warn(`[P2P Dispatcher] Invalid message received:`, message);
      return false;
    }

    const p2pMessage = message as P2PMessage;

    // Filter out internal PeerJS connection-level control messages
    const INTERNAL_TYPES = ["handshake", "handshake_ack", "ping", "pong"];
    if (INTERNAL_TYPES.includes(p2pMessage.type)) {
      return false;
    }

    for (const handler of this.handlers) {
      try {
        if (handler.canHandle(p2pMessage)) {
          await handler.handle(p2pMessage, connection, context);
          return true;
        }
      } catch (err) {
        console.error(
          `[P2P Dispatcher] Error in handler ${handler.constructor.name}:`,
          err,
        );
        return false;
      }
    }

    console.warn(
      `[P2P Dispatcher] No handler found for message type: ${p2pMessage.type}`,
    );
    return false;
  }
}
