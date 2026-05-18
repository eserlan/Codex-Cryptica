import { describe, it, expect, vi } from "vitest";
import { P2PDispatcher } from "./p2p-dispatcher";
import type { P2PMessageHandler } from "../handlers/base-handler";

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
});
