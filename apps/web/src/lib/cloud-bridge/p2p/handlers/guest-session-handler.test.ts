import { describe, it, expect, vi, beforeEach } from "vitest";
import { GuestSessionHandler } from "./guest-session-handler";

vi.mock("../p2p-protocol", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    decodeSessionSnapshot: vi.fn(),
  };
});

import { decodeSessionSnapshot } from "../p2p-protocol";

describe("GuestSessionHandler", () => {
  let handler: GuestSessionHandler;
  let ctx: any;
  const conn = { peer: "host", send: vi.fn(), close: vi.fn() } as any;

  beforeEach(() => {
    handler = new GuestSessionHandler();
    ctx = {
      mapSession: {
        clearSession: vi.fn(),
        syncFromRemoteSession: vi.fn(),
      },
    };
    vi.mocked(decodeSessionSnapshot).mockReset();
  });

  it("claims session message types", () => {
    expect(handler.canHandle({ type: "SESSION_SNAPSHOT" } as any)).toBe(true);
    expect(handler.canHandle({ type: "SESSION_SNAPSHOT_GZIP" } as any)).toBe(
      true,
    );
    expect(handler.canHandle({ type: "SESSION_ENDED" } as any)).toBe(true);
    expect(handler.canHandle({ type: "TOKEN_ADDED" } as any)).toBe(false);
  });

  it("clears local session on SESSION_ENDED", async () => {
    await handler.handle({ type: "SESSION_ENDED" } as any, conn, ctx);
    expect(ctx.mapSession.clearSession).toHaveBeenCalledWith(true);
  });

  it("applies decoded snapshot via syncFromRemoteSession", async () => {
    vi.mocked(decodeSessionSnapshot).mockResolvedValue({
      tokens: {},
    } as any);
    await handler.handle(
      { type: "SESSION_SNAPSHOT", session: { tokens: {} } } as any,
      conn,
      ctx,
    );
    expect(ctx.mapSession.syncFromRemoteSession).toHaveBeenCalledWith(
      { tokens: {} },
      false,
    );
  });

  it("drops the message and leaves state intact on decode failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(decodeSessionSnapshot).mockRejectedValue(new Error("bad"));

    await handler.handle(
      { type: "SESSION_SNAPSHOT_GZIP", data: new ArrayBuffer(2) } as any,
      conn,
      ctx,
    );

    expect(ctx.mapSession.syncFromRemoteSession).not.toHaveBeenCalled();
    expect(ctx.mapSession.clearSession).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
