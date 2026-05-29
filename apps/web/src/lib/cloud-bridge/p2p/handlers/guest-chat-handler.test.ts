import { describe, it, expect, vi, beforeEach } from "vitest";
import { GuestChatHandler } from "./guest-chat-handler";

describe("GuestChatHandler", () => {
  let handler: GuestChatHandler;
  let ctx: any;
  const conn = { peer: "host", send: vi.fn(), close: vi.fn() } as any;

  beforeEach(() => {
    handler = new GuestChatHandler();
    ctx = {
      mapSession: {
        handleRemoteChatMessage: vi.fn(),
        handleRemoteChatClear: vi.fn(),
      },
    };
  });

  it("claims chat message types", () => {
    expect(handler.canHandle({ type: "CHAT_MESSAGE" } as any)).toBe(true);
    expect(handler.canHandle({ type: "CHAT_CLEAR" } as any)).toBe(true);
    expect(handler.canHandle({ type: "TOKEN_ADDED" } as any)).toBe(false);
  });

  it("forwards CHAT_MESSAGE payload to mapSession", async () => {
    const msg = {
      type: "CHAT_MESSAGE",
      sender: "Ava",
      content: "hi",
    } as any;
    await handler.handle(msg, conn, ctx);
    expect(ctx.mapSession.handleRemoteChatMessage).toHaveBeenCalledWith(msg);
  });

  it("delegates CHAT_CLEAR to mapSession", async () => {
    await handler.handle({ type: "CHAT_CLEAR" } as any, conn, ctx);
    expect(ctx.mapSession.handleRemoteChatClear).toHaveBeenCalled();
  });
});
