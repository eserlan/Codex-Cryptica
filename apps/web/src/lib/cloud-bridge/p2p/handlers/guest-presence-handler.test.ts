import { describe, it, expect, vi, beforeEach } from "vitest";
import { writable, get } from "svelte/store";
import { GuestPresenceHandler } from "./guest-presence-handler";
import type { GuestSessionState } from "./guest-handler-context";

describe("GuestPresenceHandler", () => {
  let handler: GuestPresenceHandler;
  let ctx: any;
  let session: GuestSessionState;
  let transport: any;
  const conn = { peer: "host", send: vi.fn(), close: vi.fn() } as any;

  beforeEach(() => {
    handler = new GuestPresenceHandler();
    session = { joinAccepted: false, pendingStatus: null };
    transport = {
      connected: true,
      send: vi.fn(),
      disconnect: vi.fn(),
    };
    ctx = {
      guestRoster: writable<Record<string, any>>({}),
      session,
      transport,
      sessionModeStore: { guestUsername: "Old", isGuestMode: false },
      vault: { status: "error" as const, errorMessage: "boom" },
      mapSession: {
        setBroadcaster: vi.fn(),
        myPeerId: "previous",
      },
      callbacks: { onJoinRejected: vi.fn() },
    };
  });

  it("claims presence-related types", () => {
    expect(handler.canHandle({ type: "GUEST_STATUS" } as any)).toBe(true);
    expect(handler.canHandle({ type: "GUEST_JOIN_REJECTED" } as any)).toBe(
      true,
    );
    expect(handler.canHandle({ type: "MAP_SYNC" } as any)).toBe(false);
  });

  it("marks the join accepted and upserts the roster on GUEST_STATUS", async () => {
    await handler.handle(
      {
        type: "GUEST_STATUS",
        payload: {
          peerId: "g1",
          displayName: "Ava",
          status: "connected",
        },
      } as any,
      conn,
      ctx,
    );

    expect(session.joinAccepted).toBe(true);
    const roster = get(ctx.guestRoster) as Record<
      string,
      { displayName: string }
    >;
    expect(roster["g1"].displayName).toBe("Ava");
  });

  it("flushes pendingStatus on first GUEST_STATUS once join is accepted", async () => {
    session.pendingStatus = {
      status: "viewing",
      currentEntityId: "e1",
      currentEntityTitle: "Title",
    };

    await handler.handle(
      {
        type: "GUEST_STATUS",
        payload: { peerId: "g1", displayName: "Ava", status: "connected" },
      } as any,
      conn,
      ctx,
    );

    expect(transport.send).toHaveBeenCalledWith({
      type: "GUEST_STATUS",
      payload: {
        status: "viewing",
        currentEntityId: "e1",
        currentEntityTitle: "Title",
      },
    });
    expect(session.pendingStatus).toBeNull();
  });

  it("tears down session state and notifies on GUEST_JOIN_REJECTED", async () => {
    await handler.handle(
      {
        type: "GUEST_JOIN_REJECTED",
        payload: { reason: "duplicate-display-name", displayName: "Ava" },
      } as any,
      conn,
      ctx,
    );

    expect(ctx.callbacks.onJoinRejected).toHaveBeenCalledWith(
      "duplicate-display-name",
      "Ava",
    );
    expect(ctx.mapSession.setBroadcaster).toHaveBeenCalledWith(null);
    expect(ctx.mapSession.myPeerId).toBeNull();
    expect(ctx.sessionModeStore.guestUsername).toBeNull();
    expect(ctx.sessionModeStore.isGuestMode).toBe(true);
    expect(ctx.vault.status).toBe("idle");
    expect(ctx.vault.errorMessage).toBeNull();
    expect(transport.disconnect).toHaveBeenCalled();
  });
});
