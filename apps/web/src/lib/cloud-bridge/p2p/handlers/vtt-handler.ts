import { BaseHandler, type P2PHandlerContext } from "./base-handler";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import { isVTTMessage } from "../p2p-protocol";

export class VTTHandler extends BaseHandler {
  canHandle(message: P2PMessage): boolean {
    return isVTTMessage(message);
  }

  async handle(
    message: P2PMessage,
    connection: P2PConnection,
    context: P2PHandlerContext,
  ): Promise<void> {
    const { mapSession, transport } = context;

    if (message.type === "TOKEN_ADD_REQUEST") {
      if (
        typeof message.name !== "string" ||
        typeof message.x !== "number" ||
        typeof message.y !== "number"
      )
        return;

      const entity = message.entityId
        ? (context.vault.entities[message.entityId] as
            { image?: string } | undefined)
        : null;
      const roster = context.guestStore.guestRoster as Record<
        string,
        { displayName?: string } | undefined
      >;
      const guest = roster[connection.peer];

      mapSession.addToken({
        name: message.name,
        entityId: message.entityId,
        x: message.x,
        y: message.y,
        color: message.color,
        imageUrl: entity?.image ? entity.image : null,
        ownerPeerId: connection.peer,
        ownerGuestName: guest?.displayName ?? null,
      });
    } else if (message.type === "TOKEN_MOVE") {
      if (
        typeof message.tokenId !== "string" ||
        typeof message.x !== "number" ||
        typeof message.y !== "number"
      )
        return;
      if (mapSession.canMoveToken(message.tokenId, connection.peer, false)) {
        mapSession.moveToken(message.tokenId, message.x, message.y, true);
        transport.broadcast(
          {
            type: "TOKEN_STATE_UPDATE",
            tokenId: message.tokenId,
            delta: { x: message.x, y: message.y },
          },
          connection.peer,
        );
      }
    } else if (
      message.type === "TOKEN_REMOVE" ||
      message.type === "TOKEN_REMOVED"
    ) {
      if (typeof message.tokenId !== "string") return;
      if (mapSession.canMoveToken(message.tokenId, connection.peer, false)) {
        mapSession.removeToken(message.tokenId);
      }
    } else if (message.type === "TOKEN_SELECT") {
      if (typeof message.tokenId !== "string") return;
      const remoteSelection = (mapSession as any).remoteSelection;
      if (remoteSelection && typeof remoteSelection === "object") {
        remoteSelection[connection.peer] = message.tokenId;
      }
    } else if (message.type === "TURN_ADVANCE") {
      if (mapSession.canAdvanceTurn(connection.peer, false)) {
        mapSession.advanceTurn();
      }
    } else if (message.type === "CHAT_MESSAGE") {
      if (
        typeof message.sender !== "string" ||
        typeof message.content !== "string"
      )
        return;
      mapSession.handleRemoteChatMessage(message as any);
      transport.broadcast(message, connection.peer);
    } else if (message.type === "PING") {
      if (
        typeof message.x !== "number" ||
        typeof message.y !== "number" ||
        typeof message.color !== "string"
      )
        return;
      mapSession.handleRemotePing(
        message.x,
        message.y,
        message.peerId ?? connection.peer,
        message.color,
        message.timestamp,
      );
      transport.broadcast(
        {
          type: "MAP_PING",
          mapId: mapSession.mapId || "",
          x: message.x,
          y: message.y,
          peerId: message.peerId ?? connection.peer,
          color: message.color,
          timestamp: message.timestamp ?? Date.now(),
        },
        connection.peer,
      );
    } else if (message.type === "MEASUREMENT") {
      if (
        typeof message.startX !== "number" ||
        typeof message.startY !== "number" ||
        typeof message.endX !== "number" ||
        typeof message.endY !== "number"
      )
        return;
      mapSession.handleRemoteMeasurement(
        message.startX,
        message.startY,
        message.endX,
        message.endY,
        message.peerId ?? connection.peer,
        message.active,
      );
      transport.broadcast(
        {
          type: "MAP_MEASUREMENT",
          mapId: mapSession.mapId || "",
          startX: message.startX,
          startY: message.startY,
          endX: message.endX,
          endY: message.endY,
          peerId: message.peerId ?? connection.peer,
          active: message.active,
        },
        connection.peer,
      );
    }
  }
}
