import { BaseHandler, type P2PHandlerContext } from "./base-handler";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import { get } from "svelte/store";
import {
  normalizeGuestName,
  upsertGuestRoster,
  removeGuestFromRoster,
  deriveGuestPresenceStatus,
  buildSharedGraphPayload,
  prepareMapPayload,
} from "../p2p-helpers";
import { encodeSessionSnapshot } from "../p2p-protocol";

export class VaultHandler extends BaseHandler {
  canHandle(message: P2PMessage): boolean {
    return [
      "GUEST_JOIN",
      "GUEST_LEAVE",
      "GUEST_STATUS",
      "ENTITY_UPDATE",
      "ENTITY_BATCH_UPDATE",
      "ENTITY_DELETE",
    ].includes(message.type);
  }

  async handle(
    message: P2PMessage,
    connection: P2PConnection,
    context: P2PHandlerContext,
  ): Promise<void> {
    switch (message.type) {
      case "GUEST_JOIN":
        await this.handleGuestJoin(connection, message.payload, context);
        break;
      case "GUEST_LEAVE":
        await this.handleGuestLeave(connection, message.payload, context);
        break;
      case "GUEST_STATUS":
        await this.handleGuestStatus(connection.peer, message.payload, context);
        break;
      case "ENTITY_UPDATE":
        await context.vault.updateEntity(message.payload.id, message.payload);
        break;
      case "ENTITY_BATCH_UPDATE":
        await context.vault.batchUpdateEntities(message.payload);
        break;
      case "ENTITY_DELETE":
        await context.vault.deleteEntity(message.payload);
        break;
    }
  }

  private async handleGuestJoin(
    conn: P2PConnection,
    payload: any,
    context: P2PHandlerContext,
  ) {
    const peerId = conn.peer;
    const { guestRoster, mapSession } = context;
    const displayName = normalizeGuestName(payload?.displayName, peerId);

    const hasDuplicateName = Object.values(get(guestRoster)).some(
      (guest: any) =>
        guest.peerId !== peerId &&
        guest.displayName.localeCompare(displayName, undefined, {
          sensitivity: "base",
        }) === 0,
    );

    if (hasDuplicateName) {
      conn.send({
        type: "GUEST_JOIN_REJECTED",
        payload: { reason: "duplicate-display-name", displayName },
      });
      conn.close();
      return;
    }

    guestRoster.update((current: any) =>
      upsertGuestRoster(current, peerId, {
        displayName,
        status: "connected",
        currentEntityId: null,
        currentEntityTitle: null,
      }),
    );

    mapSession.rebindGuestOwnership(peerId, displayName);
    this.sendGuestRosterSnapshot(conn, context);

    const guest = get(guestRoster)[peerId];
    if (guest) {
      await this.sendInitialState(conn, context);
      this.broadcast(context, {
        type: "GUEST_STATUS",
        payload: {
          peerId: guest.peerId,
          displayName: guest.displayName,
          status: guest.status,
          currentEntityId: guest.currentEntityId,
          currentEntityTitle: guest.currentEntityTitle,
        },
      });
    }
  }

  private sendGuestRosterSnapshot(
    conn: P2PConnection,
    context: P2PHandlerContext,
  ) {
    const roster = Object.values(get(context.guestRoster));
    for (const guest of roster as any[]) {
      conn.send({
        type: "GUEST_STATUS",
        payload: {
          peerId: guest.peerId,
          displayName: guest.displayName,
          status: guest.status,
          currentEntityId: guest.currentEntityId,
          currentEntityTitle: guest.currentEntityTitle,
        },
      });
    }
  }

  private async handleGuestLeave(
    conn: P2PConnection,
    _payload: any,
    context: P2PHandlerContext,
  ) {
    const peerId = conn.peer;
    const departingGuest = get(context.guestRoster)[peerId] as any;

    if (departingGuest) {
      context.mapSession.clearGuestOwnership(peerId);
      context.guestRoster.update((current: any) =>
        removeGuestFromRoster(current, peerId),
      );

      this.broadcast(context, {
        type: "GUEST_STATUS",
        payload: {
          peerId,
          displayName: departingGuest.displayName,
          status: "disconnected" as const,
          currentEntityId: null,
          currentEntityTitle: null,
        },
      });
    }
    conn.close();
  }

  private async handleGuestStatus(
    peerId: string,
    payload: any,
    context: P2PHandlerContext,
  ) {
    const existingGuest = get(context.guestRoster)[peerId] as any;
    if (!existingGuest) return;

    const currentEntityId = payload?.currentEntityId || null;
    const currentEntityTitle =
      payload?.currentEntityTitle ||
      (currentEntityId
        ? context.vault.entities[currentEntityId]?.title || currentEntityId
        : null);

    const displayName = normalizeGuestName(
      payload?.displayName,
      existingGuest.displayName || peerId,
    );

    context.guestRoster.update((current: any) =>
      upsertGuestRoster(current, peerId, {
        displayName,
        status: deriveGuestPresenceStatus(payload?.status, currentEntityId),
        currentEntityId,
        currentEntityTitle,
      }),
    );

    context.mapSession.rebindGuestOwnership(peerId, displayName);
    const guest = get(context.guestRoster)[peerId] as any;
    if (guest) {
      this.broadcast(context, {
        type: "GUEST_STATUS",
        payload: {
          peerId: guest.peerId,
          displayName: guest.displayName,
          status: guest.status,
          currentEntityId: guest.currentEntityId,
          currentEntityTitle: guest.currentEntityTitle,
        },
      });
    }
  }

  private async sendInitialState(
    conn: P2PConnection,
    context: P2PHandlerContext,
  ) {
    const { vault, themeStore, mapStore, mapSession } = context;

    // Use shallow copy as entities are essentially read-only snapshots for transport here
    const rawEntities = { ...vault.entities };
    const graph = buildSharedGraphPayload(
      rawEntities,
      vault.defaultVisibility,
      themeStore.currentThemeId,
    );

    conn.send({ type: "GRAPH_SYNC", payload: graph });

    if (mapStore.activeMap) {
      const mapPayload = await prepareMapPayload(
        mapStore.activeMap,
        mapStore,
        vault,
      );
      conn.send({ type: "MAP_SYNC", payload: mapPayload });
    }

    if (mapSession.mapId && mapSession.vttEnabled) {
      const sessionSnapshot = mapSession.createSnapshot();
      const payload = await encodeSessionSnapshot(sessionSnapshot);
      conn.send(payload);
    }
  }
}
