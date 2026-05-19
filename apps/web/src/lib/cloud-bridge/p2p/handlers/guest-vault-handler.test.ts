import { describe, it, expect, vi, beforeEach } from "vitest";
import { GuestVaultHandler } from "./guest-vault-handler";
import type { GuestHandlerContext } from "./guest-handler-context";

describe("GuestVaultHandler", () => {
  let handler: GuestVaultHandler;
  let callbacks: any;
  let ctx: GuestHandlerContext;
  const conn = { peer: "host", send: vi.fn(), close: vi.fn() } as any;

  beforeEach(() => {
    callbacks = {
      onGraphData: vi.fn(),
      onEntityUpdate: vi.fn(),
      onEntityDelete: vi.fn(),
      onBatchUpdate: vi.fn(),
      onThemeUpdate: vi.fn(),
      onJoinRejected: vi.fn(),
    };
    handler = new GuestVaultHandler();
    ctx = { callbacks } as any;
  });

  it("claims vault-domain message types", () => {
    for (const type of [
      "GRAPH_SYNC",
      "ENTITY_UPDATE",
      "ENTITY_BATCH_UPDATE",
      "ENTITY_DELETE",
      "THEME_UPDATE",
    ]) {
      expect(handler.canHandle({ type } as any)).toBe(true);
    }
    expect(handler.canHandle({ type: "CHAT_MESSAGE" } as any)).toBe(false);
  });

  it("routes each message type to the matching callback", async () => {
    await handler.handle(
      { type: "GRAPH_SYNC", payload: { g: 1 } } as any,
      conn,
      ctx,
    );
    expect(callbacks.onGraphData).toHaveBeenCalledWith({ g: 1 });

    await handler.handle(
      { type: "ENTITY_UPDATE", payload: { id: "e1" } } as any,
      conn,
      ctx,
    );
    expect(callbacks.onEntityUpdate).toHaveBeenCalledWith({ id: "e1" });

    await handler.handle(
      { type: "ENTITY_BATCH_UPDATE", payload: { a: 1 } } as any,
      conn,
      ctx,
    );
    expect(callbacks.onBatchUpdate).toHaveBeenCalledWith({ a: 1 });

    await handler.handle(
      { type: "ENTITY_DELETE", payload: "e1" } as any,
      conn,
      ctx,
    );
    expect(callbacks.onEntityDelete).toHaveBeenCalledWith("e1");

    await handler.handle(
      { type: "THEME_UPDATE", payload: "dark" } as any,
      conn,
      ctx,
    );
    expect(callbacks.onThemeUpdate).toHaveBeenCalledWith("dark");
  });
});
