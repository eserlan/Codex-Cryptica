import { describe, it, expect, vi } from "vitest";
import { P2PDispatcher } from "./p2p-dispatcher";
import type { P2PMessageHandler } from "../handlers/base-handler";
import type { GuestHandlerContext } from "../handlers/guest-handler-context";

describe("P2PDispatcher", () => {
  it("should route message to correct handler", async () => {
    const dispatcher = new P2PDispatcher();

    const handler1: P2PMessageHandler = {
      canHandle: (msg) => msg.type === "PING",
      handle: vi.fn(),
    };

    const handler2: P2PMessageHandler = {
      canHandle: (msg) => msg.type === "CHAT_MESSAGE",
      handle: vi.fn(),
    };

    dispatcher.register(handler1);
    dispatcher.register(handler2);

    const context = {} as any;
    const conn = {} as any;
    const msg = { type: "PING" } as any;

    const handled = await dispatcher.dispatch(msg, conn, context);

    expect(handled).toBe(true);
    expect(handler1.handle).toHaveBeenCalledWith(msg, conn, context);
    expect(handler2.handle).not.toHaveBeenCalled();
  });

  it("should return false if no handler is found", async () => {
    const dispatcher = new P2PDispatcher();
    const handled = await dispatcher.dispatch(
      { type: "UNKNOWN" } as any,
      {} as any,
      {} as any,
    );
    expect(handled).toBe(false);
  });

  it("should reject null payloads before asking handlers to inspect them", async () => {
    const dispatcher = new P2PDispatcher();
    const handler: P2PMessageHandler = {
      canHandle: vi.fn(() => true),
      handle: vi.fn(),
    };

    dispatcher.register(handler);

    const handled = await dispatcher.dispatch(null, {} as any, {} as any);

    expect(handled).toBe(false);
    expect(handler.canHandle).not.toHaveBeenCalled();
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it("routes through a guest-typed context unchanged", async () => {
    const dispatcher = new P2PDispatcher<GuestHandlerContext>();
    const handler: P2PMessageHandler<GuestHandlerContext> = {
      canHandle: (msg) => msg.type === "GRAPH_SYNC",
      handle: vi.fn(),
    };
    dispatcher.register(handler);

    const guestCtx = {
      callbacks: { onGraphData: vi.fn() },
    } as unknown as GuestHandlerContext;
    const handled = await dispatcher.dispatch(
      { type: "GRAPH_SYNC", payload: {} } as any,
      { peer: "host", send: vi.fn(), close: vi.fn() } as any,
      guestCtx,
    );
    expect(handled).toBe(true);
    expect(handler.handle).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GRAPH_SYNC" }),
      expect.any(Object),
      guestCtx,
    );
  });

  it("warns and returns false on unknown message types in guest context", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dispatcher = new P2PDispatcher<GuestHandlerContext>();
    const handler: P2PMessageHandler<GuestHandlerContext> = {
      canHandle: () => false,
      handle: vi.fn(),
    };
    dispatcher.register(handler);

    const handled = await dispatcher.dispatch(
      { type: "TOTALLY_UNKNOWN" } as any,
      {} as any,
      {} as any,
    );

    expect(handled).toBe(false);
    expect(handler.handle).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("should return false when handler routing throws", async () => {
    const dispatcher = new P2PDispatcher();
    const handler: P2PMessageHandler = {
      canHandle: vi.fn(() => {
        throw new Error("bad routing");
      }),
      handle: vi.fn(),
    };

    dispatcher.register(handler);

    const handled = await dispatcher.dispatch(
      { type: "PING" } as any,
      {} as any,
      {} as any,
    );

    expect(handled).toBe(false);
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it("should silently ignore internal PeerJS connection-level messages", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dispatcher = new P2PDispatcher();

    const handler: P2PMessageHandler = {
      canHandle: vi.fn(() => true),
      handle: vi.fn(),
    };
    dispatcher.register(handler);

    const internalTypes = ["handshake", "handshake_ack", "ping", "pong"];
    for (const type of internalTypes) {
      const handled = await dispatcher.dispatch(
        { type } as any,
        {} as any,
        {} as any,
      );
      expect(handled).toBe(false);
      expect(handler.canHandle).not.toHaveBeenCalled();
      expect(handler.handle).not.toHaveBeenCalled();
    }

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
