import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PeerJSConnectionManager } from "../connection-manager.svelte";

describe("PeerJSConnectionManager", () => {
  let manager: PeerJSConnectionManager;
  let mockPeer: any;
  let mockConn: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockConn = {
      peer: "remote-peer-id",
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
    };

    mockPeer = {
      on: vi.fn(),
      connect: vi.fn(() => mockConn),
      destroy: vi.fn(),
      disconnect: vi.fn(),
    };

    // Instantiate with fast heartbeats for unit testing convenience
    manager = new PeerJSConnectionManager(
      () => mockPeer,
      1000, // Heartbeat every 1s
      1500, // Heartbeat timeout after 1.5s
      [100, 200, 300], // Exponential delays (100ms, 200ms, 300ms)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should initialize in idle state", () => {
    expect(manager.state.status).toBe("idle");
    expect(manager.state.latencyMs).toBe(-1);
    expect(manager.state.peerId).toBeNull();
    expect(manager.state.remotePeerId).toBeNull();
    expect(manager.state.retryCount).toBe(0);
  });

  it("should start host and accept incoming peer connection", async () => {
    const hostPromise = manager.startHost("host-peer-id");

    // Retrieve open callback
    const openCallback = mockPeer.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    openCallback("host-peer-id");

    const resolvedId = await hostPromise;
    expect(resolvedId).toBe("host-peer-id");
    expect(manager.state.peerId).toBe("host-peer-id");
    expect(manager.state.status).toBe("connecting");

    // Simulate incoming connection
    const connectionCallback = mockPeer.on.mock.calls.find(
      (c: any[]) => c[0] === "connection",
    )[1];
    connectionCallback(mockConn);

    // Verify connections listeners are set up
    const connOpenCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    connOpenCallback();

    expect(manager.state.status).toBe("handshaking");

    // Simulate incoming handshake
    const dataCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "data",
    )[1];
    dataCallback({
      type: "handshake",
      senderId: "remote-peer-id",
      timestamp: Date.now(),
      payload: { clientPeerId: "remote-peer-id" },
    });

    expect(manager.state.status).toBe("connected");
    expect(manager.state.remotePeerId).toBe("remote-peer-id");
  });

  it("should connect to host as guest", async () => {
    const connectPromise = manager.connect("host-peer-id");

    const openCallback = mockPeer.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    openCallback("guest-peer-id");

    expect(manager.state.peerId).toBe("guest-peer-id");
    expect(mockPeer.connect).toHaveBeenCalledWith("host-peer-id");

    const connOpenCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    connOpenCallback();

    expect(manager.state.status).toBe("handshaking");

    // Simulate incoming handshake_ack from host to resolve connectPromise
    const dataCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "data",
    )[1];
    dataCallback({
      type: "handshake_ack",
      senderId: "host-peer-id",
      timestamp: Date.now(),
      payload: null,
    });

    await connectPromise;
    expect(manager.state.status).toBe("connected");
    expect(manager.state.remotePeerId).toBe("host-peer-id");
  });

  it("should handle custom messages using registered onMessage callback", async () => {
    manager.connect("host-peer-id").catch(() => {});
    const openCallback = mockPeer.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    openCallback("guest-peer-id");

    const connOpenCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    connOpenCallback();

    // Send handshake_ack to transition to connected status
    let dataCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "data",
    )[1];
    dataCallback({
      type: "handshake_ack",
      senderId: "host-peer-id",
      timestamp: Date.now(),
      payload: null,
    });

    const receivedPayloads: any[] = [];
    const unsubscribe = manager.onMessage("custom:test", (msg) => {
      receivedPayloads.push(msg.payload);
    });

    dataCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "data",
    )[1];

    // Send matching message
    dataCallback({
      type: "custom:test",
      senderId: "remote-peer-id",
      timestamp: Date.now(),
      payload: "hello context",
    });

    expect(receivedPayloads).toContain("hello context");

    // Unsubscribe and verify no further messages are processed
    unsubscribe();
    dataCallback({
      type: "custom:test",
      senderId: "remote-peer-id",
      timestamp: Date.now(),
      payload: "should ignore",
    });

    expect(receivedPayloads).not.toContain("should ignore");
  });

  it("should handle periodic heartbeat ping-pongs and measure round trip latency", async () => {
    manager.connect("host-peer-id").catch(() => {});
    const openCallback = mockPeer.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    openCallback("guest-peer-id");

    const connOpenCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    connOpenCallback();

    // Send handshake_ack to transition to connected status
    let dataCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "data",
    )[1];
    dataCallback({
      type: "handshake_ack",
      senderId: "host-peer-id",
      timestamp: Date.now(),
      payload: null,
    });

    // Fast-forward to trigger first heartbeat
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockConn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ping",
        senderId: "guest-peer-id",
      }),
    );

    // Mock ping timestamp back to compute latency
    const pingCall = mockConn.send.mock.calls.find(
      (c: any[]) => c[0] && c[0].type === "ping",
    );
    const pingSent = pingCall[0];
    dataCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "data",
    )[1];

    // Artificially wait 45ms and trigger pong response
    vi.advanceTimersByTime(45);
    dataCallback({
      type: "pong",
      senderId: "remote-peer-id",
      timestamp: pingSent.timestamp,
      payload: null,
    });

    expect(manager.state.latencyMs).toBe(45);
  });

  it("should attempt reconnection if heartbeat ping-pong times out", async () => {
    manager.connect("host-peer-id").catch(() => {});
    const openCallback = mockPeer.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    openCallback("guest-peer-id");

    const connOpenCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    connOpenCallback();

    // Send handshake_ack to transition to connected status
    const dataCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "data",
    )[1];
    dataCallback({
      type: "handshake_ack",
      senderId: "host-peer-id",
      timestamp: Date.now(),
      payload: null,
    });

    // Fast-forward to trigger first heartbeat
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockConn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ping",
        senderId: "guest-peer-id",
      }),
    );

    // Now fast-forward past the heartbeatTimeoutMs (1500ms) without triggering pong
    await vi.advanceTimersByTimeAsync(1600);

    // It should trigger reconnecting state
    expect(manager.state.status).toBe("reconnecting");
    expect(manager.state.retryCount).toBe(1);
  });

  it("should gracefully attempt reconnection with exponential backoff on client dropouts", async () => {
    manager.connect("host-peer-id").catch(() => {});
    const openCallback = mockPeer.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    openCallback("guest-peer-id");

    const connOpenCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    connOpenCallback();

    // Send handshake_ack to transition to connected status
    const dataCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "data",
    )[1];
    dataCallback({
      type: "handshake_ack",
      senderId: "host-peer-id",
      timestamp: Date.now(),
      payload: null,
    });

    const errorCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "error",
    )[1];

    // Trigger dropout connection error
    errorCallback(new Error("Connection drops"));

    expect(manager.state.status).toBe("reconnecting");
    expect(manager.state.retryCount).toBe(1);

    // Advance 100ms for first backoff reconnect
    await vi.advanceTimersByTimeAsync(110);
    expect(mockPeer.connect).toHaveBeenCalledTimes(2); // Initial (1) + retry (2)

    // Trigger 2nd failure
    errorCallback(new Error("Connection drops again"));
    expect(manager.state.retryCount).toBe(2);

    // Advance 200ms for second backoff reconnect
    await vi.advanceTimersByTimeAsync(210);
    expect(mockPeer.connect).toHaveBeenCalledTimes(3);

    // Trigger 3rd failure
    errorCallback(new Error("Connection drops third time"));
    expect(manager.state.retryCount).toBe(3);

    // Advance 300ms for third backoff reconnect
    await vi.advanceTimersByTimeAsync(310);
    expect(mockPeer.connect).toHaveBeenCalledTimes(4);

    // Trigger final failure (reconnection exhaust)
    errorCallback(new Error("Failed completely"));
    expect(manager.state.status).toBe("failed");
    expect(manager.state.latencyMs).toBe(-1);
  });

  it("should cleanly tear down connections and clear scheduling resources on disconnect", async () => {
    manager.connect("host-peer-id").catch(() => {});
    const openCallback = mockPeer.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    openCallback("guest-peer-id");

    const connOpenCallback = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    connOpenCallback();

    manager.disconnect();

    expect(mockConn.close).toHaveBeenCalled();
    expect(mockPeer.destroy).toHaveBeenCalled();
    expect(manager.state.status).toBe("disconnected");
    expect(manager.state.peerId).toBeNull();
    expect(manager.state.remotePeerId).toBeNull();
  });
});
