import { BaseHandler } from "./base-handler";
import type { GuestHandlerContext } from "./guest-handler-context";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";

const HANDLED = new Set([
  "TOKEN_ADDED",
  "TOKEN_STATE_UPDATE",
  "TOKEN_REMOVED",
  "SHOW_TOKEN_IMAGE",
  "TURN_ADVANCE",
  "SET_MODE",
  "SET_GRID_SETTINGS",
  "MAP_PING",
  "MAP_MEASUREMENT",
  "FOG_REVEAL",
]);

export class GuestVttHandler extends BaseHandler<GuestHandlerContext> {
  canHandle(message: P2PMessage): boolean {
    return HANDLED.has(message.type);
  }

  async handle(
    message: P2PMessage,
    _connection: P2PConnection,
    context: GuestHandlerContext,
  ): Promise<void> {
    const { mapSession } = context;
    const data = message as any;

    switch (data.type) {
      case "TOKEN_ADDED":
        mapSession.handleRemoteTokenAdded(data.token);
        return;
      case "TOKEN_STATE_UPDATE":
        if (typeof data.tokenId !== "string") return;
        mapSession.handleRemoteTokenUpdate(data.tokenId, data.delta);
        return;
      case "TOKEN_REMOVED":
        mapSession.handleRemoteTokenRemoved(data.tokenId);
        return;
      case "SHOW_TOKEN_IMAGE":
        if (typeof data.title !== "string") return;
        mapSession.handleRemoteShowTokenImage(data.title, data.imagePath);
        return;
      case "TURN_ADVANCE":
        mapSession.handleRemoteTurn(data.turnIndex, data.round);
        return;
      case "SET_MODE":
        mapSession.handleRemoteMode(data.mode);
        return;
      case "SET_GRID_SETTINGS":
        mapSession.handleRemoteGridSettings(data);
        return;
      case "MAP_PING":
        mapSession.handleRemotePing(
          data.x,
          data.y,
          data.peerId,
          data.color,
          data.timestamp,
        );
        return;
      case "MAP_MEASUREMENT":
        mapSession.handleRemoteMeasurement(
          data.startX,
          data.startY,
          data.endX,
          data.endY,
          data.peerId,
          data.active,
        );
        return;
      case "FOG_REVEAL":
        mapSession.handleRemoteFogMask(JSON.stringify(data.strokes ?? []));
        return;
    }
  }
}
