import { describe, it, expect, vi, beforeEach } from "vitest";
import { PeerJSTransport } from "./peerjs-transport";

describe("PeerJSTransport", () => {
  let transport: PeerJSTransport;
  let mockPeer: any;
  let mockConn: any;

  beforeEach(() => {
    mockPeer = {
      on: vi.fn(),
      destroy: vi.fn(),
    };
    mockConn = {
      peer: "guest-1",
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
    };
    transport = new PeerJSTransport({ peerFactory: () => mockPeer });
  });

  it("should start and resolve with peer id", async () => {
    const startPromise = transport.start("host-id");

    // Simulate peer opening
    const openCallback = mockPeer.on.mock.calls.find(
      (call: any[]) => call[0] === "open",
    )[1];
    openCallback("host-id");

    const id = await startPromise;
    expect(id).toBe("host-id");
    expect(transport.id).toBe("host-id");
  });

  it("should handle incoming connections", async () => {
    transport.start("host-id");
    const connCallback = mockPeer.on.mock.calls.find(
      (call: any[]) => call[0] === "connection",
    )[1];

    const onConnection = vi.fn();
    transport.on("connection", onConnection);

    connCallback(mockConn);

    // Connection events should be registered
    expect(mockConn.on).toHaveBeenCalledWith("open", expect.any(Function));

    // Simulate open
    const connOpenCallback = mockConn.on.mock.calls.find(
      (call: any[]) => call[0] === "open",
    )[1];
    connOpenCallback();

    expect(onConnection).toHaveBeenCalled();
    expect(transport.connections).toHaveLength(1);
    expect(transport.connections[0].peer).toBe("guest-1");
  });

  it("should enforce 10 guest limit", async () => {
    transport.start("host-id");
    const connCallback = mockPeer.on.mock.calls.find(
      (call: any[]) => call[0] === "connection",
    )[1];

    // Mock 10 existing connections
    for (let i = 0; i < 10; i++) {
      const c = { peer: `g-${i}`, on: vi.fn() };
      connCallback(c);
      c.on.mock.calls.find((call: any[]) => call[0] === "open")?.[1]();
    }
    expect(transport.connections).toHaveLength(10);

    // Try 11th
    const c11 = { peer: "g-11", on: vi.fn(), send: vi.fn(), close: vi.fn() };
    connCallback(c11);

    expect(transport.connections).toHaveLength(10);

    // Should register open to send rejection
    expect(c11.on).toHaveBeenCalledWith("open", expect.any(Function));
    const c11OpenCallback = c11.on.mock.calls.find(
      (call: any[]) => call[0] === "open",
    )?.[1];
    expect(c11OpenCallback).toBeDefined();
    if (!c11OpenCallback) throw new Error("Missing open callback");
    c11OpenCallback();

    expect(c11.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "GUEST_JOIN_REJECTED",
        payload: { reason: "server-full" },
      }),
    );
  });
});
