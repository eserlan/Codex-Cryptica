import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.stubGlobal("$state", (v: any) => v);
(globalThis as any).$state = (v: any) => v;
(globalThis as any).$state.snapshot = (v: any) => v;
(globalThis as any).$derived = (v: any) => v;

vi.mock("$app/paths", () => ({ base: "" }));

const { mockMapSession } = vi.hoisted(() => ({
  mockMapSession: {
    setBroadcaster: vi.fn(),
    clearSession: vi.fn(),
    myPeerId: null as string | null,
    handleRemoteTokenAdded: vi.fn(),
    syncFromRemoteSession: vi.fn(),
  },
}));

vi.mock("../../stores/map-session.svelte", () => ({
  mapSession: mockMapSession,
}));
vi.mock("../../stores/vault.svelte", () => ({
  vault: {
    maps: {} as Record<string, any>,
    status: "idle" as const,
    errorMessage: null,
  },
}));
vi.mock("../../stores/ui/session-mode.svelte", () => ({
  sessionModeStore: { guestUsername: null, isGuestMode: false },
}));
vi.mock("../../stores/map.svelte", () => ({
  mapStore: { activeMapId: null, selectMap: vi.fn() },
}));
vi.mock("../../stores/theme.svelte", () => ({
  themeStore: { currentThemeId: "t1" },
}));

import { P2PGuestService } from "./guest-service";
import { MockClientTransport } from "./transport/mock-client-transport";
import { guestStore } from "../../stores/guest.svelte";

describe("P2PGuestService (facade)", () => {
  let transport: MockClientTransport;
  let service: P2PGuestService;

  beforeEach(() => {
    const NativeURL = globalThis.URL;
    transport = new MockClientTransport();
    service = new P2PGuestService({ transport });
    mockMapSession.setBroadcaster.mockClear();
    mockMapSession.handleRemoteTokenAdded.mockClear();
    mockMapSession.myPeerId = null;
    guestStore.guestRoster = {};
    // URL.* stubs for assetCache path coverage
    vi.stubGlobal(
      "URL",
      Object.assign(NativeURL, {
        createObjectURL: vi.fn(() => "blob:fake"),
        revokeObjectURL: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("exposes the documented public API", () => {
    expect(typeof service.connectToHost).toBe("function");
    expect(typeof service.disconnect).toBe("function");
    expect(typeof service.leaveSession).toBe("function");
    expect(typeof service.getFile).toBe("function");
    expect(typeof service.updateGuestStatus).toBe("function");
    expect(typeof service.requestTokenMove).toBe("function");
    expect(typeof service.requestTokenRemove).toBe("function");
    expect("connected" in service).toBe(true);
    expect("peerId" in service).toBe(true);
  });

  it("wires broadcaster, peerId and GUEST_JOIN on a successful connect", async () => {
    const noop = vi.fn();
    await service.connectToHost("host-1", noop, noop, noop, noop, noop, "Ava");

    expect(service.connected).toBe(true);
    expect(mockMapSession.myPeerId).toBe("mock-guest-peer-id");
    expect(mockMapSession.setBroadcaster).toHaveBeenCalledTimes(1);
    expect(transport.sent).toContainEqual({
      type: "GUEST_JOIN",
      payload: { displayName: "Ava" },
    });
  });

  it("dispatches inbound messages to the appropriate handler", async () => {
    const onGraphData = vi.fn();
    await service.connectToHost(
      "host-1",
      onGraphData,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      "Ava",
    );

    transport.simulateData({ type: "GRAPH_SYNC", payload: { x: 1 } });
    // dispatch is async; flush microtasks
    await Promise.resolve();
    await Promise.resolve();
    expect(onGraphData).toHaveBeenCalledWith({ x: 1 });

    transport.simulateData({
      type: "TOKEN_ADDED",
      token: { id: "t1" },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(mockMapSession.handleRemoteTokenAdded).toHaveBeenCalledWith({
      id: "t1",
    });
  });

  it("throttles token moves and sends one TOKEN_MOVE per window", async () => {
    vi.useFakeTimers();
    const noop = vi.fn();
    await service.connectToHost("host-1", noop, noop, noop, noop, noop, "Ava");
    transport.sent.length = 0;

    service.requestTokenMove("t1", 1.234, 2.234);
    service.requestTokenMove("t1", 3.456, 4.567);
    expect(transport.sent).toHaveLength(0);

    vi.advanceTimersByTime(50);
    expect(transport.sent).toEqual([
      { type: "TOKEN_MOVE", tokenId: "t1", x: 3.46, y: 4.57 },
    ]);
  });

  it("flushes pendingStatus on the first GUEST_STATUS after a queued update", async () => {
    const noop = vi.fn();
    await service.connectToHost("host-1", noop, noop, noop, noop, noop, "Ava");

    service.updateGuestStatus({
      status: "viewing",
      currentEntityId: "e1",
      currentEntityTitle: "T",
    });
    expect(transport.sent.some((m) => m.type === "GUEST_STATUS")).toBe(false);

    transport.simulateData({
      type: "GUEST_STATUS",
      payload: { peerId: "g1", displayName: "Ava", status: "connected" },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(transport.sent.some((m) => m.type === "GUEST_STATUS")).toBe(true);
  });

  it("fully tears down service state when host rejects the join", async () => {
    const onJoinRejected = vi.fn();
    const onGraphData = vi.fn();
    await service.connectToHost(
      "host-1",
      onGraphData,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      "Ava",
      onJoinRejected,
    );

    transport.simulateData({
      type: "GUEST_JOIN_REJECTED",
      payload: { reason: "duplicate-display-name", displayName: "Ava" },
    });
    // dispatcher + presence handler are async; flush
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onJoinRejected).toHaveBeenCalledWith(
      "duplicate-display-name",
      "Ava",
    );
    expect(service.connected).toBe(false);

    // Reconnecting must not double-register listeners (regression guard)
    onGraphData.mockClear();
    transport.sent.length = 0;
    await service.connectToHost(
      "host-1",
      onGraphData,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      "Ava",
    );
    transport.simulateData({ type: "GRAPH_SYNC", payload: { x: 1 } });
    await Promise.resolve();
    await Promise.resolve();
    expect(onGraphData).toHaveBeenCalledTimes(1);
  });

  it("reconnects when connectToHost targets a different host id", async () => {
    const noop = vi.fn();
    await service.connectToHost("host-1", noop, noop, noop, noop, noop, "Ava");
    const firstSent = transport.sent.length;

    // Same host: no-op
    await service.connectToHost("host-1", noop, noop, noop, noop, noop, "Ava");
    expect(transport.sent.length).toBe(firstSent);

    // Different host: must disconnect + reconnect (re-sends GUEST_JOIN)
    await service.connectToHost("host-2", noop, noop, noop, noop, noop, "Ava");
    expect(transport.sent.filter((m) => m.type === "GUEST_JOIN").length).toBe(
      2,
    );
  });

  it("cleans up listeners when connect fails so retries don't double-dispatch", async () => {
    // Patch transport.connect to reject on first call, succeed on second
    const realConnect = transport.connect.bind(transport);
    let calls = 0;
    transport.connect = vi.fn(async (hostId: string) => {
      calls++;
      if (calls === 1) throw new Error("boom");
      return realConnect(hostId);
    });

    const noop = vi.fn();
    const onGraphData = vi.fn();
    await expect(
      service.connectToHost(
        "host-1",
        onGraphData,
        noop,
        noop,
        noop,
        noop,
        "Ava",
      ),
    ).rejects.toThrow("boom");

    // Second attempt succeeds
    await service.connectToHost(
      "host-1",
      onGraphData,
      noop,
      noop,
      noop,
      noop,
      "Ava",
    );

    transport.simulateData({ type: "GRAPH_SYNC", payload: { x: 1 } });
    await Promise.resolve();
    await Promise.resolve();
    expect(onGraphData).toHaveBeenCalledTimes(1);
  });

  it("treats a transport error like a close: tears down service state", async () => {
    const noop = vi.fn();
    await service.connectToHost("host-1", noop, noop, noop, noop, noop, "Ava");
    expect(service.connected).toBe(true);

    transport.simulateError(new Error("connection lost"));

    expect(service.connected).toBe(false);
    expect(mockMapSession.myPeerId).toBeNull();
  });

  it("disconnect() tears down state and is idempotent", async () => {
    const noop = vi.fn();
    await service.connectToHost("host-1", noop, noop, noop, noop, noop, "Ava");
    service.disconnect();
    service.disconnect();
    expect(service.connected).toBe(false);
    expect(guestStore.guestRoster).toEqual({});
    expect(mockMapSession.myPeerId).toBeNull();
  });
});
