import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.stubGlobal("$state", (v: any) => v);
(globalThis as any).$state = (v: any) => v;
(globalThis as any).$state.snapshot = (v: any) => v;
(globalThis as any).$derived = (v: any) => v;

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("../../stores/ui/notification.svelte", () => {
  return {
    notificationStore: {
      notify: vi.fn(),
    },
  };
});

const { mockMapSession, mockTokens } = vi.hoisted(() => {
  const tokens: any = {};
  const mms: any = {
    clearSession: vi.fn(),
    setBroadcaster: vi.fn(),
    addToken: vi.fn().mockImplementation((t) => {
      const id = t.id || "t-" + Math.random();
      tokens[id] = { id, ...t };
      return tokens[id];
    }),
    removeToken: vi.fn().mockImplementation((id) => {
      delete tokens[id];
    }),
    moveToken: vi.fn().mockImplementation((id, x, y) => {
      if (tokens[id]) {
        tokens[id].x = x;
        tokens[id].y = y;
      }
    }),
    tokens,
    initiativeManager: {
      setSnapshotData: vi.fn(),
    },
    vttEnabled: false,
    mapId: null,
    round: 1,
    createSnapshot: vi.fn().mockReturnValue({ tokens: {} }),
    handleRemoteChatMessage: vi.fn(),
    handleRemotePing: vi.fn(),
    handleRemoteMeasurement: vi.fn(),
    canMoveToken: vi.fn().mockReturnValue(true),
    canAdvanceTurn: vi.fn().mockReturnValue(true),
    advanceTurn: vi.fn().mockImplementation(() => {
      mms.round++;
    }),
    rebindGuestOwnership: vi.fn(),
    clearGuestOwnership: vi.fn(),
    remoteSelection: {} as Record<string, string>,
    myPeerId: null as string | null,
  };
  return { mockMapSession: mms, mockTokens: tokens };
});

vi.mock("../../stores/map-session.svelte", () => {
  return {
    mapSession: mockMapSession,
  };
});

import { P2PHostService } from "./host-service.svelte";
import { vault } from "../../stores/vault.svelte";
import { themeStore } from "../../stores/theme.svelte";
import { guestRoster } from "../../stores/guest";
import { mapStore } from "../../stores/map.svelte";
import { get } from "svelte/store";

const { MockConnection, MockPeer } = vi.hoisted(() => {
  class MockConnection {
    peer: string;
    open = true;
    handlers: Record<string, ((...args: any[]) => any)[]> = {};

    constructor(peer: string) {
      this.peer = peer;
    }

    on(event: string, handler: (...args: any[]) => any) {
      if (!this.handlers[event]) this.handlers[event] = [];
      this.handlers[event].push(handler);
    }

    off(event: string, handler: (...args: any[]) => any) {
      if (this.handlers[event]) {
        this.handlers[event] = this.handlers[event].filter(
          (h) => h !== handler,
        );
      }
    }

    send = vi.fn();
    close = vi.fn();

    emit(event: string, ...args: any[]) {
      if (this.handlers[event]) {
        [...this.handlers[event]].forEach((h) => h(...args));
      }
    }
  }

  class MockPeer {
    handlers: Record<string, ((...args: any[]) => any)[]> = {};
    id: string;
    open = true;

    constructor(id = "mock-peer-id") {
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

    connect = vi
      .fn()
      .mockImplementation((id: string) => new MockConnection(id));
    destroy = vi.fn();
  }

  return { MockConnection, MockPeer };
});

vi.mock("peerjs", () => {
  return {
    default: MockPeer,
  };
});

vi.stubGlobal("Peer", MockPeer);
vi.stubGlobal(
  "CompressionStream",
  class {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    constructor() {
      const stream = new TransformStream<Uint8Array, Uint8Array>();
      this.readable = stream.readable;
      this.writable = stream.writable;
    }
  } as any,
);
vi.stubGlobal(
  "DecompressionStream",
  class {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    constructor() {
      const stream = new TransformStream<Uint8Array, Uint8Array>();
      this.readable = stream.readable;
      this.writable = stream.writable;
    }
  } as any,
);

vi.mock("svelte", async (importOriginal) => {
  const actual = await importOriginal<any>();
  const $state = (v: any) => v;
  $state.snapshot = (v: any) => v;
  return {
    ...actual,
    $state,
    $derived: (v: any) => v,
    $effect: (v: any) => v,
  };
});

vi.mock("../../stores/vault.svelte", () => {
  return {
    vault: {
      activeVaultId: "v1",
      entities: {
        "entity-1": { id: "entity-1", title: "Entity 1", lore: "secrets" },
      },
      defaultVisibility: "hidden",
      onEntityUpdate: null,
      onEntityDelete: null,
      onBatchUpdate: null,
      resolveImageUrl: vi.fn().mockResolvedValue("blob:url"),
      getActiveVaultHandle: vi.fn(),
      updateEntity: vi.fn(),
      saveImageToVault: vi.fn(),
    },
  };
});

vi.mock("../../stores/theme.svelte", () => {
  return {
    themeStore: {
      currentThemeId: "t1",
      onThemeUpdate: null,
    },
  };
});

vi.mock("../../stores/map.svelte", () => {
  return {
    mapStore: {
      activeMapId: "map-1",
      activeMap: {
        id: "map-1",
        assetPath: "maps/test.webp",
        dimensions: { width: 400, height: 300 },
        pins: [],
        fogOfWar: { maskPath: "maps/test_mask.png" },
      },
      selectMap: vi.fn(),
      gridSize: 50,
      showGrid: true,
      showFog: true,
      loadMask: vi.fn().mockResolvedValue({
        toBlob: (cb: (blob: Blob | null) => void) =>
          cb(new Blob(["fog"], { type: "image/png" })),
      }),
    },
  };
});

describe("P2P Services", () => {
  describe("P2PHostService", () => {
    let hostService: P2PHostService;

    beforeEach(() => {
      vi.clearAllMocks();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          blob: () =>
            Promise.resolve(new Blob(["image"], { type: "image/webp" })),
        }),
      );
      guestRoster.set({});

      // Reset mockMapSession
      for (const key in mockTokens) delete mockTokens[key];
      mockMapSession.round = 1;
      mockMapSession.vttEnabled = false;
      mockMapSession.mapId = null;

      hostService = new P2PHostService({
        vault,
        themeStore,
        guestRoster,
        mapStore,
        peerFactory: (id?: string) => new MockPeer(id ?? "mock-peer-id"),
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    const startHostingHelper = async (hs: P2PHostService) => {
      const idPromise = hs.startHosting();
      const transport = (hs as any).transport;
      const peerInstance = (transport as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      return idPromise;
    };

    it("should start hosting and return a peer ID", async () => {
      const seenIds: string[] = [];
      const idPromise = hostService.startHosting((peerId) => {
        seenIds.push(peerId);
      });
      const transport = (hostService as any).transport;
      const peerInstance = (transport as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      const id = await idPromise;
      expect(id).toBe("mock-peer-id");
    });

    it("should handle new connections and send initial graph", async () => {
      await startHostingHelper(hostService);
      const transport = (hostService as any).transport;
      const peerInstance = (transport as any).peer;

      const mockConn = new MockConnection("guest-1");
      peerInstance.emit("connection", mockConn);
      mockConn.emit("open");

      expect(hostService.connections).toHaveLength(1);

      mockConn.emit("data", {
        type: "GUEST_JOIN",
        payload: { displayName: "Ava" },
      });

      await vi.waitFor(
        () => {
          expect(mockConn.send).toHaveBeenCalledWith(
            expect.objectContaining({ type: "GRAPH_SYNC" }),
          );
        },
        { timeout: 1000 },
      );
    });

    it("should rebroadcast the active map with fresh fog data", async () => {
      await startHostingHelper(hostService);
      const transport = (hostService as any).transport;
      const mockConn = new MockConnection("guest-1");
      (transport as any)._connections.push(mockConn as any);

      await hostService.broadcastActiveMapSync();

      expect(mapStore.loadMask).toHaveBeenCalled();
      expect(mockConn.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: "MAP_SYNC" }),
      );
    });

    it("should broadcast initiative snapshot updates to guests", async () => {
      vi.useFakeTimers();
      await startHostingHelper(hostService);
      const currentMapSession = (hostService as any).getHandlerContext()
        .mapSession;
      currentMapSession.vttEnabled = true;
      currentMapSession.mapId = "map-1";

      const transport = (hostService as any).transport;
      const mockConn = new MockConnection("guest-1");
      (transport as any)._connections.push(mockConn as any);

      currentMapSession.addToken({ name: "Broadcast Trigger", x: 0, y: 0 });

      hostService.broadcastVttMessage({
        type: "TOKEN_ADDED",
        token: { id: "t1" } as any,
      });

      await vi.waitFor(
        () => {
          expect(mockConn.send).toHaveBeenCalledWith(
            expect.objectContaining({ type: "TOKEN_ADDED" }),
          );
        },
        { timeout: 1000 },
      );
      vi.useRealTimers();
    });

    it("should convert host ping and measurement broadcasts to guest map messages", async () => {
      await startHostingHelper(hostService);
      const transport = (hostService as any).transport;
      const mockConn = new MockConnection("guest-1");
      (transport as any)._connections.push(mockConn as any);

      mockMapSession.mapId = "map-1";

      hostService.broadcastVttMessage({
        type: "PING",
        x: 10,
        y: 20,
        color: "#f00",
        timestamp: 123,
      } as any);

      hostService.broadcastVttMessage({
        type: "MEASUREMENT",
        startX: 1,
        startY: 2,
        endX: 3,
        endY: 4,
        active: true,
      } as any);

      expect(mockConn.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: "MAP_PING", mapId: "map-1" }),
      );
      expect(mockConn.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: "MAP_MEASUREMENT", mapId: "map-1" }),
      );
    });

    it("should sanitize entity broadcasts before sending data to guests", async () => {
      await startHostingHelper(hostService);
      const transport = (hostService as any).transport;
      const mockConn = new MockConnection("guest-1");
      (transport as any)._connections.push(mockConn as any);

      await vault.onEntityUpdate?.({
        id: "entity-1",
        title: "Entity 1",
        lore: "host secret",
        _fsHandle: { private: true },
      } as any);

      vault.onBatchUpdate?.({
        "entity-1": {
          id: "entity-1",
          title: "Entity 1",
          lore: "batch secret",
          _fsHandle: { private: true },
        },
      } as any);

      await vi.waitFor(() => {
        expect(mockConn.send).toHaveBeenCalledWith({
          type: "ENTITY_UPDATE",
          payload: { id: "entity-1", title: "Entity 1" },
        });
        expect(mockConn.send).toHaveBeenCalledWith({
          type: "ENTITY_BATCH_UPDATE",
          payload: {
            "entity-1": { id: "entity-1", title: "Entity 1" },
          },
        });
      });
    });

    it("should debounce token movement broadcasts into a session snapshot", async () => {
      vi.useFakeTimers();
      await startHostingHelper(hostService);
      const transport = (hostService as any).transport;
      const mockConn = new MockConnection("guest-1");
      (transport as any)._connections.push(mockConn as any);

      const currentMapSession = (hostService as any).getHandlerContext()
        .mapSession;
      const token = currentMapSession.addToken({
        name: "Mover",
        x: 0,
        y: 0,
      });
      mockConn.send.mockClear();

      const tokenId = token.id;
      currentMapSession.moveToken(tokenId, 150, 200);

      await (hostService as any).broadcastSessionSnapshot();

      await vi.waitFor(
        () => {
          expect(mockConn.send).toHaveBeenCalledWith(
            expect.objectContaining({
              type: "SESSION_SNAPSHOT",
              session: expect.objectContaining({
                tokens: expect.any(Object),
              }),
            }),
          );
        },
        { timeout: 1000 },
      );

      vi.useRealTimers();
    });

    it("should remove a guest token when the guest sends TOKEN_REMOVED", async () => {
      await startHostingHelper(hostService);
      const transport = (hostService as any).transport;
      const peerInstance = (transport as any).peer;

      const currentMapSession = (hostService as any).getHandlerContext()
        .mapSession;
      const token = currentMapSession.addToken({
        name: "Disposable",
        x: 0,
        y: 0,
        ownerPeerId: "guest-1",
      });
      const tokenId = token.id;

      const mockConn = new MockConnection("guest-1");
      (transport as any)._connections.push(mockConn as any);
      peerInstance.emit("connection", mockConn);
      mockConn.emit("open");

      mockConn.emit("data", {
        type: "TOKEN_REMOVED",
        tokenId,
      });

      await vi.waitFor(
        () => {
          expect(currentMapSession.tokens[tokenId]).toBeUndefined();
        },
        { timeout: 1000 },
      );
    });

    it("should let a guest advance the turn when they own the active token", async () => {
      await startHostingHelper(hostService);
      const transport = (hostService as any).transport;
      const peerInstance = (transport as any).peer;

      const currentMapSession = (hostService as any).getHandlerContext()
        .mapSession;
      const guestToken = currentMapSession.addToken({
        name: "Guest Turn",
        x: 0,
        y: 0,
        ownerPeerId: "guest-1",
      });
      currentMapSession.initiativeManager.setSnapshotData(
        [guestToken!.id],
        {},
        1,
        0,
      );

      const mockConn = new MockConnection("guest-1");
      (transport as any)._connections.push(mockConn as any);
      peerInstance.emit("connection", mockConn);
      mockConn.emit("open");

      mockConn.emit("data", {
        type: "TURN_ADVANCE",
      });

      await vi.waitFor(
        () => {
          expect(currentMapSession.round).toBe(2);
        },
        { timeout: 1000 },
      );
    });

    it("should rebroadcast only fog updates without re-sending the map image", async () => {
      await startHostingHelper(hostService);
      const transport = (hostService as any).transport;
      const mockConn = new MockConnection("guest-1");
      (transport as any)._connections.push(mockConn as any);

      await hostService.broadcastActiveMapFogSync();

      expect(mapStore.loadMask).toHaveBeenCalled();
      expect(mockConn.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: "MAP_FOG_SYNC" }),
      );
    });

    it("should track joined guests and their status", async () => {
      await startHostingHelper(hostService);
      const transport = (hostService as any).transport;
      const peerInstance = (transport as any).peer;

      const mockConn = new MockConnection("guest-1");
      peerInstance.emit("connection", mockConn);
      mockConn.emit("open");

      mockConn.emit("data", {
        type: "GUEST_JOIN",
        payload: { displayName: "Ava" },
      });

      expect(get(guestRoster)["guest-1"]).toBeDefined();
      expect(get(guestRoster)["guest-1"].displayName).toBe("Ava");
    });

    it("should clear guest roster and ownership when a connection closes", async () => {
      await startHostingHelper(hostService);
      const transport = (hostService as any).transport;
      const peerInstance = (transport as any).peer;

      const mockConn = new MockConnection("guest-1");
      peerInstance.emit("connection", mockConn);
      mockConn.emit("open");

      mockConn.emit("data", {
        type: "GUEST_JOIN",
        payload: { displayName: "Ava" },
      });

      expect(get(guestRoster)["guest-1"]).toBeDefined();

      mockConn.emit("close");

      expect(get(guestRoster)["guest-1"]).toBeUndefined();
      expect(mockMapSession.clearGuestOwnership).toHaveBeenCalledWith(
        "guest-1",
      );
    });

    it("should stop hosting and clear connections", async () => {
      await startHostingHelper(hostService);
      const transport = (hostService as any).transport;
      const mockConn = new MockConnection("guest-1");
      (transport as any)._connections.push(mockConn as any);

      hostService.stopHosting();

      expect(hostService.connections.length).toBe(0);
      expect((hostService as any)._isHosting).toBe(false);
      expect(mockMapSession.myPeerId).toBeNull();
    });
  });
});
