import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PeerJsClientTransport } from "./peerjs-client-transport";

class MockConnection {
  peer: string;
  open = false;
  handlers: Record<string, ((...args: any[]) => any)[]> = {};

  constructor(peer: string) {
    this.peer = peer;
  }

  on(event: string, handler: (...args: any[]) => any) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }

  emit(event: string, ...args: any[]) {
    if (this.handlers[event]) {
      [...this.handlers[event]].forEach((h) => h(...args));
    }
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.open = false;
  });
}

class MockPeer {
  id: string;
  open = false;
  destroyed = false;
  handlers: Record<string, ((...args: any[]) => any)[]> = {};
  lastConnection: MockConnection | null = null;

  constructor(id = "mock-guest-id") {
    this.id = id;
  }

  on(event: string, handler: (...args: any[]) => any) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }

  emit(event: string, ...args: any[]) {
    if (this.handlers[event]) {
      [...this.handlers[event]].forEach((h) => h(...args));
    }
  }

  connect = vi.fn((hostId: string) => {
    const conn = new MockConnection(hostId);
    this.lastConnection = conn;
    return conn;
  });

  destroy = vi.fn(() => {
    this.destroyed = true;
  });
}

describe("PeerJsClientTransport", () => {
  let peerFactory: ReturnType<typeof vi.fn>;
  let lastPeer: MockPeer | null;

  beforeEach(() => {
    lastPeer = null;
    peerFactory = vi.fn(() => {
      lastPeer = new MockPeer();
      return lastPeer;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves connect() once the connection opens", async () => {
    const transport = new PeerJsClientTransport(peerFactory as any);
    const openSpy = vi.fn();
    transport.on("open", openSpy);

    const promise = transport.connect("host-1");
    // Peer not open yet -> trigger open then connection
    lastPeer!.emit("open", "mock-guest-id");
    lastPeer!.lastConnection!.open = true;
    lastPeer!.lastConnection!.emit("open");

    await expect(promise).resolves.toBeUndefined();
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(transport.connected).toBe(true);
    expect(transport.id).toBe("mock-guest-id");
  });

  it("emits data events for valid messages", async () => {
    const transport = new PeerJsClientTransport(peerFactory as any);
    const dataSpy = vi.fn();
    transport.on("data", dataSpy);

    const promise = transport.connect("host-1");
    lastPeer!.emit("open", "mock-guest-id");
    lastPeer!.lastConnection!.open = true;
    lastPeer!.lastConnection!.emit("open");
    await promise;

    lastPeer!.lastConnection!.emit("data", { type: "GRAPH_SYNC", payload: {} });
    lastPeer!.lastConnection!.emit("data", "not-a-message");

    expect(dataSpy).toHaveBeenCalledTimes(1);
    expect(dataSpy).toHaveBeenCalledWith({ type: "GRAPH_SYNC", payload: {} });
  });

  it("rejects connect() on peer initialization error", async () => {
    const transport = new PeerJsClientTransport(peerFactory as any);

    const promise = transport.connect("host-1");
    lastPeer!.emit("error", new Error("peer boom"));

    await expect(promise).rejects.toThrow("peer boom");
  });

  it("allows a retry after a peer initialization error", async () => {
    const transport = new PeerJsClientTransport(peerFactory as any);

    const first = transport.connect("host-1");
    lastPeer!.emit("error", new Error("peer boom"));
    await expect(first).rejects.toThrow("peer boom");

    // Retry must rebuild the peer, not silently no-op via the isConnecting guard.
    const second = transport.connect("host-1");
    expect(peerFactory).toHaveBeenCalledTimes(2);
    lastPeer!.emit("open", "mock-guest-id");
    lastPeer!.lastConnection!.open = true;
    lastPeer!.lastConnection!.emit("open");
    await expect(second).resolves.toBeUndefined();
  });

  it("rejects connect() on a 15s timeout and tears down the peer", async () => {
    vi.useFakeTimers();
    const transport = new PeerJsClientTransport(peerFactory as any);

    const promise = transport.connect("host-1");
    // Peer never opens
    vi.advanceTimersByTime(15_000);
    await expect(promise).rejects.toThrow("Connection timed out");
    expect(lastPeer!.destroyed).toBe(true);
  });

  it("filters callbacks from stale connections via epoch", async () => {
    const transport = new PeerJsClientTransport(peerFactory as any);
    const dataSpy = vi.fn();
    const closeSpy = vi.fn();
    transport.on("data", dataSpy);
    transport.on("close", closeSpy);

    const firstPromise = transport.connect("host-1");
    lastPeer!.emit("open", "mock-guest-id");
    const firstConn = lastPeer!.lastConnection!;
    firstConn.open = true;
    firstConn.emit("open");
    await firstPromise;

    const firstPeer = lastPeer!;
    transport.disconnect();
    // disconnect emits "close" once for the just-closed connection
    closeSpy.mockClear();

    // Late callbacks from the now-stale first connection must be ignored
    firstConn.emit("data", { type: "GRAPH_SYNC", payload: {} });
    firstConn.emit("close");
    firstPeer.emit("error", new Error("late"));

    expect(dataSpy).not.toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("emits 'close' exactly once when disconnect() tears down a live connection", async () => {
    const transport = new PeerJsClientTransport(peerFactory as any);
    const closeSpy = vi.fn();
    transport.on("close", closeSpy);

    const promise = transport.connect("host-1");
    lastPeer!.emit("open");
    const conn = lastPeer!.lastConnection!;
    conn.open = true;
    conn.emit("open");
    await promise;

    transport.disconnect();
    expect(closeSpy).toHaveBeenCalledTimes(1);

    // Subsequent disconnects when already disconnected are silent
    transport.disconnect();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it("does not double-emit 'close' when PeerJS close arrives before disconnect()", async () => {
    const transport = new PeerJsClientTransport(peerFactory as any);
    const closeSpy = vi.fn();
    transport.on("close", closeSpy);

    const promise = transport.connect("host-1");
    lastPeer!.emit("open");
    const conn = lastPeer!.lastConnection!;
    conn.open = true;
    conn.emit("open");
    await promise;

    conn.emit("close");
    transport.disconnect();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it("does not emit data after disconnect", async () => {
    const transport = new PeerJsClientTransport(peerFactory as any);
    const dataSpy = vi.fn();
    transport.on("data", dataSpy);

    const promise = transport.connect("host-1");
    lastPeer!.emit("open", "mock-guest-id");
    const conn = lastPeer!.lastConnection!;
    conn.open = true;
    conn.emit("open");
    await promise;

    transport.disconnect();
    conn.emit("data", { type: "GRAPH_SYNC", payload: {} });
    expect(dataSpy).not.toHaveBeenCalled();
  });

  it("send() is a no-op when not connected", () => {
    const transport = new PeerJsClientTransport(peerFactory as any);
    expect(() => transport.send({ type: "X" })).not.toThrow();
  });

  it("send() forwards to the underlying connection when open", async () => {
    const transport = new PeerJsClientTransport(peerFactory as any);
    const promise = transport.connect("host-1");
    lastPeer!.emit("open");
    const conn = lastPeer!.lastConnection!;
    conn.open = true;
    conn.emit("open");
    await promise;

    transport.send({ type: "GUEST_JOIN", payload: { displayName: "Ava" } });
    expect(conn.send).toHaveBeenCalledWith({
      type: "GUEST_JOIN",
      payload: { displayName: "Ava" },
    });
  });

  it("off() removes registered listeners", async () => {
    const transport = new PeerJsClientTransport(peerFactory as any);
    const dataSpy = vi.fn();
    transport.on("data", dataSpy);
    transport.off("data", dataSpy);

    const promise = transport.connect("host-1");
    lastPeer!.emit("open");
    const conn = lastPeer!.lastConnection!;
    conn.open = true;
    conn.emit("open");
    await promise;

    conn.emit("data", { type: "GRAPH_SYNC", payload: {} });
    expect(dataSpy).not.toHaveBeenCalled();
  });
});
