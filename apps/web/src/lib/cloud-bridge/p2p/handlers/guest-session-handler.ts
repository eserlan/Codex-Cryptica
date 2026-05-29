import { BaseHandler } from "./base-handler";
import type { GuestHandlerContext } from "./guest-handler-context";
import { decodeSessionSnapshot, type P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";

const HANDLED = new Set([
  "SESSION_SNAPSHOT",
  "SESSION_SNAPSHOT_GZIP",
  "SESSION_ENDED",
]);

export class GuestSessionHandler extends BaseHandler<GuestHandlerContext> {
  canHandle(message: P2PMessage): boolean {
    return HANDLED.has(message.type);
  }

  async handle(
    message: P2PMessage,
    _connection: P2PConnection,
    context: GuestHandlerContext,
  ): Promise<void> {
    if (message.type === "SESSION_ENDED") {
      context.mapSession.clearSession(true);
      return;
    }

    if (
      message.type === "SESSION_SNAPSHOT" ||
      message.type === "SESSION_SNAPSHOT_GZIP"
    ) {
      try {
        const session = await decodeSessionSnapshot(message as any);
        context.mapSession.syncFromRemoteSession(session, false);
      } catch (err) {
        // FR-015: snapshot decode failures are non-fatal — drop and wait for
        // the next snapshot to reconcile.
        console.warn(
          "[P2P Guest Session] Failed to decode snapshot; dropping message",
          err,
        );
      }
    }
  }
}
