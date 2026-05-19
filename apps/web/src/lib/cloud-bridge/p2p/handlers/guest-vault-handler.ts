import { BaseHandler } from "./base-handler";
import type { GuestHandlerContext } from "./guest-handler-context";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";

const HANDLED = new Set([
  "GRAPH_SYNC",
  "ENTITY_UPDATE",
  "ENTITY_BATCH_UPDATE",
  "ENTITY_DELETE",
  "THEME_UPDATE",
]);

export class GuestVaultHandler extends BaseHandler<GuestHandlerContext> {
  canHandle(message: P2PMessage): boolean {
    return HANDLED.has(message.type);
  }

  async handle(
    message: P2PMessage,
    _connection: P2PConnection,
    context: GuestHandlerContext,
  ): Promise<void> {
    const { callbacks } = context;
    switch (message.type) {
      case "GRAPH_SYNC":
        callbacks.onGraphData((message as any).payload);
        return;
      case "ENTITY_UPDATE":
        callbacks.onEntityUpdate((message as any).payload);
        return;
      case "ENTITY_BATCH_UPDATE":
        callbacks.onBatchUpdate((message as any).payload);
        return;
      case "ENTITY_DELETE":
        callbacks.onEntityDelete((message as any).payload);
        return;
      case "THEME_UPDATE":
        callbacks.onThemeUpdate((message as any).payload);
        return;
    }
  }
}
