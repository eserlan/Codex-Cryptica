import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import type {
  P2PMessageHandler,
  P2PHandlerContext,
} from "../handlers/base-handler";

/**
 * Registry-based dispatcher for P2P messages.
 * Eliminates large if/else blocks and isolates message handling.
 */
export class P2PDispatcher {
  private handlers: P2PMessageHandler[] = [];

  /**
   * Registers a new handler in the dispatcher.
   */
  register(handler: P2PMessageHandler) {
    this.handlers.push(handler);
  }

  /**
   * Routes an incoming message to the first handler that can process it.
   */
  async dispatch(
    message: P2PMessage,
    connection: P2PConnection,
    context: P2PHandlerContext,
  ): Promise<boolean> {
    for (const handler of this.handlers) {
      if (handler.canHandle(message)) {
        try {
          await handler.handle(message, connection, context);
          return true;
        } catch (err) {
          console.error(
            `[P2P Dispatcher] Error in handler ${handler.constructor.name}:`,
            err,
          );
          return false;
        }
      }
    }

    console.warn(
      `[P2P Dispatcher] No handler found for message type: ${message.type}`,
    );
    return false;
  }
}
