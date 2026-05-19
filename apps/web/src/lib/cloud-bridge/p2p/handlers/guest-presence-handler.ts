import { BaseHandler } from "./base-handler";
import type { GuestHandlerContext } from "./guest-handler-context";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import { upsertGuestRoster } from "../p2p-helpers";

const HANDLED = new Set(["GUEST_STATUS", "GUEST_JOIN_REJECTED"]);

export class GuestPresenceHandler extends BaseHandler<GuestHandlerContext> {
  canHandle(message: P2PMessage): boolean {
    return HANDLED.has(message.type);
  }

  async handle(
    message: P2PMessage,
    _connection: P2PConnection,
    context: GuestHandlerContext,
  ): Promise<void> {
    if (message.type === "GUEST_STATUS") {
      this.handleGuestStatus(message as any, context);
      return;
    }
    if (message.type === "GUEST_JOIN_REJECTED") {
      this.handleJoinRejected(message as any, context);
    }
  }

  private handleGuestStatus(
    message: { payload?: any } & Record<string, any>,
    context: GuestHandlerContext,
  ) {
    context.session.joinAccepted = true;
    const p = message.payload || message;
    context.guestRoster.update((current) =>
      upsertGuestRoster(current, p.peerId, {
        displayName: p.displayName,
        status: p.status,
        currentEntityId: p.currentEntityId ?? null,
        currentEntityTitle: p.currentEntityTitle ?? null,
      }),
    );

    const pending = context.session.pendingStatus;
    if (pending && context.transport.connected) {
      context.transport.send({ type: "GUEST_STATUS", payload: pending });
      context.session.pendingStatus = null;
    }
  }

  private handleJoinRejected(
    message: { payload?: { reason?: string; displayName?: string } },
    context: GuestHandlerContext,
  ) {
    const reason = message.payload?.reason ?? "unknown";
    const displayName = message.payload?.displayName ?? "Guest";

    context.callbacks.onJoinRejected?.(reason, displayName);

    // Atomically tear down presence/guest state from the user's perspective.
    context.mapSession.setBroadcaster(null);
    context.mapSession.myPeerId = null;
    context.session.pendingStatus = null;
    context.session.joinAccepted = false;
    context.guestRoster.set({});
    context.sessionModeStore.guestUsername = null;
    context.sessionModeStore.isGuestMode = true;
    context.vault.status = "idle";
    context.vault.errorMessage = null;

    context.transport.disconnect();
  }
}
