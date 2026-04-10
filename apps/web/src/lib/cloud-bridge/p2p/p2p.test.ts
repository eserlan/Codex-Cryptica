import { describe, it, expect, vi, beforeEach } from "vitest";
import { P2PHostService } from "./host-service.svelte";
import { P2PGuestService } from "./guest-service";
import { P2PClientAdapter } from "./client-adapter";
import { encodeSessionSnapshot } from "./p2p-protocol";
import { vault } from "../../stores/vault.svelte";
import { themeStore } from "../../stores/theme.svelte";
import { guestRoster } from "../../stores/guest";
import { mapStore } from "../../stores/map.svelte";
import { mapSession } from "../../stores/map-session.svelte";

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
        this.handlers[event].forEach((h) => h(...args));
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
vi.stubGlobal(
  "fetch",
  vi.fn(async () => ({
    ok: true,
    blob: async () => new Blob(["map-image"], { type: "image/webp" }),
  })) as any,
);

// Mock Vault
vi.mock("../../stores/vault.svelte", () => {
  return {
    vault: {
      maps: {
        "map-1": {
          id: "map-1",
          name: "Host Map",
          assetPath: "maps/test.webp",
          dimensions: { width: 400, height: 300 },
          pins: [],
          fogOfWar: { maskPath: "maps/test_mask.png" },
        },
      },
      entities: {
        "entity-1": {
          id: "entity-1",
          title: "Entity 1",
          image: "images/test.png",
        },
      },
      defaultVisibility: "private",
      onEntityUpdate: null,
      onEntityDelete: null,
      onBatchUpdate: null,
      resolveImageUrl: vi.fn(async (path: string) =>
        path.endsWith("_mask.png") ? "blob:mask-url" : "blob:map-url",
      ),
      getActiveVaultHandle: vi.fn().mockResolvedValue({
        getFileHandle: vi.fn().mockResolvedValue({
          getFile: vi.fn().mockResolvedValue({
            size: 100,
            type: "image/png",
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
          }),
        }),
        getDirectoryHandle: vi.fn().mockResolvedValue({
          getFileHandle: vi.fn().mockResolvedValue({
            getFile: vi.fn().mockResolvedValue({
              size: 100,
              type: "image/png",
              arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
            }),
          }),
          entries: vi.fn().mockReturnValue({
            [Symbol.asyncIterator]() {
              return {
                next() {
                  return Promise.resolve({ done: true });
                },
              };
            },
          }),
        }),
      }),
      activeVaultId: "test-vault",
    },
  };
});

vi.mock("../../stores/map.svelte", () => {
  return {
    mapStore: {
      activeMapId: "map-1",
      activeMap: {
        id: "map-1",
        name: "Host Map",
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
      guestRoster.set({});
      mapSession.clearSession(true);
      hostService = new P2PHostService({
        vault,
        themeStore,
        guestRoster,
        mapStore,
        peerFactory: (id?: string) => new MockPeer(id ?? "mock-peer-id"),
      });
    });

    it("should start hosting and return a peer ID", async () => {
      const seenIds: string[] = [];
      const idPromise = hostService.startHosting((peerId) => {
        seenIds.push(peerId);
      });
      const peerInstance = (hostService as any).peer;
      expect(seenIds).toHaveLength(1);
      expect(peerInstance.id).toBe(seenIds[0]);
      peerInstance.emit("open", seenIds[0]);
      const id = await idPromise;
      expect(id).toBe(seenIds[0]);
    });

    it("should expose the peer id immediately when already hosting", async () => {
      (hostService as any)._isHosting = true;
      (hostService as any).peerId = "existing-peer";

      const seenIds: string[] = [];
      await expect(
        hostService.startHosting((peerId) => {
          seenIds.push(peerId);
        }),
      ).resolves.toBe("existing-peer");
      expect(seenIds).toEqual(["existing-peer"]);
    });

    it("should handle new connections and send initial graph", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const mockConn = new MockConnection("guest-1");
      peerInstance.emit("connection", mockConn);

      expect(hostService.connections).toContain(mockConn);

      mockConn.emit("open");

      await vi.waitFor(() => {
        expect(mockConn.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "GRAPH_SYNC",
          }),
        );
      });
      expect(mockConn.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MAP_SYNC",
          payload: expect.objectContaining({
            image: expect.any(Object),
            fog: expect.any(Object),
          }),
        }),
      );
    });

    it("should rebroadcast the active map with fresh fog data", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const mockConn = new MockConnection("guest-1");
      (hostService as any).connections.push(mockConn);

      await hostService.broadcastActiveMapSync();

      expect(mapStore.loadMask).toHaveBeenCalled();
      expect(mockConn.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MAP_SYNC",
          payload: expect.objectContaining({
            fog: expect.any(Object),
          }),
        }),
      );
    });

    it("should broadcast initiative snapshot updates to guests", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const mockConn = new MockConnection("guest-1");
      (hostService as any).connections.push(mockConn);

      const snapshot: any = {
        id: "enc-1",
        name: "Encounter",
        mapId: "map-1",
        mode: "combat",
        tokens: {
          "token-1": {
            id: "token-1",
            entityId: null,
            name: "Scout",
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            rotation: 0,
            zIndex: 0,
            ownerPeerId: null,
            visibleTo: "all",
            color: "#fff",
            imageUrl: null,
            statusEffects: [],
          },
        },
        initiativeOrder: ["token-1"],
        initiativeValues: { "token-1": 12 },
        round: 1,
        turnIndex: 0,
        selection: null,
        sessionFogMask: null,
        lastPing: null,
        measurement: {
          active: false,
          start: null,
          end: null,
        },
        createdAt: 1,
        savedAt: null,
        chatMessages: [],
        gridSize: 50,
        gridUnit: "ft",
        gridDistance: 5,
      };

      mapSession.syncFromRemoteSession(snapshot, false);
      mapSession.setInitiativeValue("token-1", 17);

      await vi.waitFor(() => {
        expect(mockConn.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "SESSION_SNAPSHOT_GZIP",
            encoding: "gzip",
            data: expect.any(ArrayBuffer),
          }),
        );
      });
    });

    it("should debounce token movement broadcasts into a session snapshot", async () => {
      vi.useFakeTimers();
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const mockConn = new MockConnection("guest-1");
      (hostService as any).connections.push(mockConn);

      mapSession.addToken({
        name: "Mover",
        x: 0,
        y: 0,
      });
      mockConn.send.mockClear();

      const tokenId = Object.keys(mapSession.tokens)[0];
      mapSession.moveToken(tokenId, 150, 200);
      expect(mockConn.send).not.toHaveBeenCalled();

      vi.advanceTimersByTime(250);

      await vi.waitFor(() => {
        expect(mockConn.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "SESSION_SNAPSHOT_GZIP",
            encoding: "gzip",
            data: expect.any(ArrayBuffer),
          }),
        );
      });

      vi.useRealTimers();
    });

    it("should remove a guest token when the guest sends TOKEN_REMOVED", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      mapSession.addToken({
        name: "Disposable",
        x: 0,
        y: 0,
      });
      const tokenId = Object.keys(mapSession.tokens)[0];

      const mockConn = new MockConnection("guest-1");
      (hostService as any).connections.push(mockConn);
      peerInstance.emit("connection", mockConn);
      mockConn.emit("open");

      mockConn.emit("data", {
        type: "TOKEN_REMOVED",
        tokenId,
      });

      await vi.waitFor(() => {
        expect(mapSession.tokens[tokenId]).toBeUndefined();
      });
    });

    it("should rebroadcast only fog updates without re-sending the map image", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const mockConn = new MockConnection("guest-1");
      (hostService as any).connections.push(mockConn);

      await hostService.broadcastActiveMapFogSync();

      expect(mapStore.loadMask).toHaveBeenCalled();
      expect(mockConn.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MAP_FOG_SYNC",
          payload: expect.objectContaining({
            mapId: "map-1",
            fog: expect.any(Object),
          }),
        }),
      );
    });

    it("should track joined guests and their status", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const mockConn = new MockConnection("guest-1");
      peerInstance.emit("connection", mockConn);
      mockConn.emit("open");

      mockConn.emit("data", {
        type: "GUEST_JOIN",
        payload: { displayName: "Ava" },
      });
      mockConn.emit("data", {
        type: "GUEST_STATUS",
        payload: {
          status: "viewing",
          currentEntityId: "entity-1",
          currentEntityTitle: "Entity 1",
        },
      });

      await vi.waitFor(() => {
        const roster = (hostService as any).connections.length;
        expect(roster).toBe(1);
      });

      let currentRoster: any = {};
      const unsubscribe = guestRoster.subscribe((value) => {
        currentRoster = value;
      });
      unsubscribe();

      expect(currentRoster["guest-1"]).toMatchObject({
        displayName: "Ava",
        status: "viewing",
        currentEntityId: "entity-1",
        currentEntityTitle: "Entity 1",
      });

      mockConn.emit("close");
      await vi.waitFor(() => {
        let nextRoster: any = {};
        const unsub = guestRoster.subscribe((value) => {
          nextRoster = value;
        });
        unsub();
        expect(nextRoster["guest-1"]).toBeUndefined();
      });
    });

    it("should handle guest leaving gracefully", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const mockConn = new MockConnection("guest-1");
      peerInstance.emit("connection", mockConn);
      mockConn.emit("open");

      mockConn.emit("data", {
        type: "GUEST_JOIN",
        payload: { displayName: "Ava" },
      });

      await vi.waitFor(() => {
        let currentRoster: any = {};
        const unsubscribe = guestRoster.subscribe((value) => {
          currentRoster = value;
        });
        unsubscribe();
        expect(currentRoster["guest-1"]).toBeDefined();
      });

      // Guest sends leave message
      mockConn.emit("data", {
        type: "GUEST_LEAVE",
        payload: { displayName: "Ava" },
      });

      await vi.waitFor(() => {
        let nextRoster: any = {};
        const unsub = guestRoster.subscribe((value) => {
          nextRoster = value;
        });
        unsub();
        expect(nextRoster["guest-1"]).toBeUndefined();
      });

      // Verify connection was closed
      expect(mockConn.close).toHaveBeenCalled();
    });

    it("should send the existing guest roster to a newly joined guest", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const firstConn = new MockConnection("guest-1");
      peerInstance.emit("connection", firstConn);
      firstConn.emit("open");
      firstConn.emit("data", {
        type: "GUEST_JOIN",
        payload: { displayName: "Ava" },
      });

      const secondConn = new MockConnection("guest-2");
      peerInstance.emit("connection", secondConn);
      secondConn.emit("open");
      secondConn.emit("data", {
        type: "GUEST_JOIN",
        payload: { displayName: "Morgan" },
      });

      await vi.waitFor(() => {
        expect(secondConn.send).toHaveBeenCalledWith({
          type: "GUEST_STATUS",
          payload: expect.objectContaining({
            peerId: "guest-1",
            displayName: "Ava",
          }),
        });
      });

      expect(secondConn.send).toHaveBeenCalledWith({
        type: "GUEST_STATUS",
        payload: expect.objectContaining({
          peerId: "guest-2",
          displayName: "Morgan",
        }),
      });
    });

    it("should reject duplicate guest display names", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const firstConn = new MockConnection("guest-1");
      peerInstance.emit("connection", firstConn);
      firstConn.emit("open");
      firstConn.emit("data", {
        type: "GUEST_JOIN",
        payload: { displayName: "Ava" },
      });

      const secondConn = new MockConnection("guest-2");
      peerInstance.emit("connection", secondConn);
      secondConn.emit("open");
      secondConn.emit("data", {
        type: "GUEST_JOIN",
        payload: { displayName: "ava" },
      });
      secondConn.emit("data", {
        type: "GUEST_STATUS",
        payload: {
          status: "connected",
          currentEntityId: null,
          currentEntityTitle: null,
        },
      });

      expect(secondConn.send).toHaveBeenCalledWith({
        type: "GUEST_JOIN_REJECTED",
        payload: {
          reason: "duplicate-display-name",
          displayName: "ava",
        },
      });
      expect(secondConn.close).toHaveBeenCalled();

      let currentRoster: any = {};
      const unsubscribe = guestRoster.subscribe((value) => {
        currentRoster = value;
      });
      unsubscribe();

      expect(currentRoster["guest-1"]?.displayName).toBe("Ava");
      expect(currentRoster["guest-2"]).toBeUndefined();
    });

    it("should broadcast entity updates to all open connections", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const mockConn = new MockConnection("guest-1");
      (hostService as any).connections.push(mockConn);

      const entity = { id: "entity-1", title: "Updated Entity" };
      (hostService as any).broadcastEntityUpdate(entity);

      expect(mockConn.send).toHaveBeenCalledWith({
        type: "ENTITY_UPDATE",
        payload: expect.objectContaining({ id: "entity-1" }),
      });
    });

    it("should relay guest ping messages to other guests as shared map pings", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const senderConn = new MockConnection("guest-1");
      const otherConn = new MockConnection("guest-2");
      (hostService as any).connections.push(senderConn, otherConn);

      peerInstance.emit("connection", senderConn);
      peerInstance.emit("connection", otherConn);
      senderConn.emit("open");
      otherConn.emit("open");

      senderConn.emit("data", {
        type: "PING",
        x: 120,
        y: 90,
        peerId: "guest-1",
        color: "hsl(220 75% 55%)",
        timestamp: 12345,
      });

      await vi.waitFor(() => {
        expect(otherConn.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "MAP_PING",
            mapId: "map-1",
            x: 120,
            y: 90,
            peerId: "guest-1",
            color: "hsl(220 75% 55%)",
            timestamp: 12345,
          }),
        );
      });

      expect(senderConn.send).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MAP_PING",
          peerId: "guest-1",
          timestamp: 12345,
        }),
      );
    });

    it("should handle file request with fuzzy match", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const mockConn = new MockConnection("guest-1");
      (hostService as any).connections.push(mockConn);

      const mockImgDir = {
        entries: async function* () {
          yield ["test-match.webp", {}];
        },
        getFileHandle: vi.fn().mockImplementation((name) => {
          if (name === "test-match.webp") {
            return Promise.resolve({
              getFile: vi.fn().mockResolvedValue({
                size: 100,
                type: "image/webp",
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
              }),
            });
          }
          throw { name: "NotFoundError" };
        }),
      };

      vi.mocked(vault.getActiveVaultHandle).mockResolvedValue({
        getDirectoryHandle: vi.fn().mockImplementation((name) => {
          if (name === "images") return Promise.resolve(mockImgDir);
          throw new Error("Not images");
        }),
        getFileHandle: vi.fn().mockRejectedValue({ name: "NotFoundError" }),
      } as any);

      const requestId = "req-fuzzy";
      await (hostService as any).handleFileRequest(
        mockConn,
        "images/test-match.png",
        requestId,
      );

      expect(mockConn.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "FILE_RESPONSE",
          requestId,
          found: true,
          mime: "image/webp",
        }),
      );
    });

    it("should return a missing file response when no vault handle exists", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const mockConn = new MockConnection("guest-1");
      (hostService as any).connections.push(mockConn);

      vi.mocked(vault.getActiveVaultHandle).mockResolvedValue(null as any);

      await (hostService as any).handleFileRequest(
        mockConn,
        "images/test.png",
        "req-missing",
      );

      expect(mockConn.send).toHaveBeenCalledWith({
        type: "FILE_RESPONSE",
        requestId: "req-missing",
        found: false,
      });
    });

    it("should stop hosting and clear connections", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      await idPromise;

      const mockConn = new MockConnection("guest-1");
      (hostService as any).connections.push(mockConn);

      hostService.stopHosting();

      expect(hostService.connections.length).toBe(0);
      expect((hostService as any).peer).toBeNull();
    });
  });

  describe("P2PGuestService", () => {
    let guestService: P2PGuestService;

    beforeEach(() => {
      vi.clearAllMocks();
      guestService = new P2PGuestService({
        peerFactory: () => new MockPeer(),
      });
    });

    it("should handle connection timeout", async () => {
      vi.useFakeTimers();
      const connectPromise = guestService.connectToHost(
        "host-id",
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        "Guest One",
      );

      vi.advanceTimersByTime(15000);

      await expect(connectPromise).rejects.toThrow("Connection timed out");
      vi.useRealTimers();
    });

    it("should ignore stale open callbacks after disconnect", async () => {
      vi.useFakeTimers();
      const connectPromise = guestService.connectToHost(
        "host-id",
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        "Guest One",
      );
      connectPromise.catch(() => undefined);

      const peerInstance = (guestService as any).peer;
      peerInstance.emit("open", "guest-id");

      const mockConn = (guestService as any).connection;
      guestService.disconnect();

      expect(() => mockConn.emit("open")).not.toThrow();
      expect(mockConn.send).not.toHaveBeenCalled();

      vi.runAllTimers();
      vi.useRealTimers();
    });

    it("should return early when already connected to the same host", async () => {
      const existingConn = { open: true, peer: "host-id" };
      (guestService as any).connection = existingConn;

      await expect(
        guestService.connectToHost(
          "host-id",
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
        ),
      ).resolves.toBeUndefined();

      expect((guestService as any).connection).toBe(existingConn);
      expect((guestService as any).peer).toBeUndefined();
    });

    it("should return early when connection is already in progress", async () => {
      (guestService as any).isConnecting = true;

      await expect(
        guestService.connectToHost(
          "host-id",
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
        ),
      ).resolves.toBeUndefined();
    });

    it("should wait for peer open before connecting", async () => {
      const onGraphData = vi.fn();
      const onEntityUpdate = vi.fn();
      const onEntityDelete = vi.fn();
      const onBatchUpdate = vi.fn();
      const onThemeUpdate = vi.fn();
      const openHandlers: Array<(...args: any[]) => void> = [];
      const connHandlers: Record<string, (...args: any[]) => void> = {};
      const connection = {
        peer: "host-id",
        open: true,
        on: vi.fn((event: string, handler: (...args: any[]) => void) => {
          connHandlers[event] = handler;
        }),
        send: vi.fn(),
      };
      (guestService as any).peer = {
        open: false,
        id: "guest-peer",
        on: vi.fn((event: string, handler: (...args: any[]) => void) => {
          if (event === "open") openHandlers.push(handler);
        }),
        connect: vi.fn().mockReturnValue(connection),
        destroy: vi.fn(),
      };

      const connectPromise = guestService.connectToHost(
        "host-id",
        onGraphData,
        onEntityUpdate,
        onEntityDelete,
        onBatchUpdate,
        onThemeUpdate,
      );

      expect((guestService as any).peer.connect).not.toHaveBeenCalled();
      openHandlers[0]?.();
      connHandlers.open?.();

      await connectPromise;
      expect((guestService as any).peer.connect).toHaveBeenCalledWith(
        "host-id",
      );
    });

    it("should throw when fetching a file without a connection", async () => {
      await expect(guestService.getFile("images/missing.png")).rejects.toThrow(
        "Not connected to host",
      );
    });

    it("should debounce token move sends to the host", () => {
      vi.useFakeTimers();
      const mockConn = new MockConnection("host-id");
      (guestService as any).connection = mockConn;

      expect(guestService.requestTokenMove("token-1", 10.1234, 20.9876)).toBe(
        true,
      );
      expect(guestService.requestTokenMove("token-1", 10.1234, 20.9876)).toBe(
        true,
      );
      expect(guestService.requestTokenMove("token-1", 25.6789, 40.4321)).toBe(
        true,
      );
      expect(mockConn.send).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);

      expect(mockConn.send).toHaveBeenCalledWith({
        type: "TOKEN_MOVE",
        tokenId: "token-1",
        x: 25.68,
        y: 40.43,
      });

      mockConn.send.mockClear();
      expect(guestService.requestTokenMove("token-1", 25.68, 40.43)).toBe(true);
      vi.advanceTimersByTime(50);
      expect(mockConn.send).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("should handle peer error during initialization", async () => {
      // Mock PeerJS to fail immediately on construction if we can
      // or just mock the peer property before calling
      const mockPeer = new MockPeer();
      (guestService as any).peer = mockPeer;

      // Mock connectToHost to reject immediately for this test
      vi.spyOn(guestService, "connectToHost").mockRejectedValueOnce(
        new Error("Peer init error"),
      );

      const promise = guestService.connectToHost(
        "host-id",
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );
      await expect(promise).rejects.toThrow("Peer init error");
    });

    it("should handle various message types on connection", async () => {
      const onGraphData = vi.fn();
      const onEntityUpdate = vi.fn();
      const onEntityDelete = vi.fn();
      const onBatchUpdate = vi.fn();
      const onThemeUpdate = vi.fn();

      const connectPromise = guestService.connectToHost(
        "host-id",
        onGraphData,
        onEntityUpdate,
        onEntityDelete,
        onBatchUpdate,
        onThemeUpdate,
        "Guest Two",
      );

      const peerInstance = (guestService as any).peer;
      peerInstance.emit("open", "guest-id");

      const mockConn = (guestService as any).connection;
      mockConn.emit("open");

      await connectPromise;

      mockConn.emit("data", { type: "GRAPH_SYNC", payload: { entities: {} } });
      expect(onGraphData).toHaveBeenCalled();

      mockConn.emit("data", { type: "ENTITY_UPDATE", payload: { id: "1" } });
      expect(onEntityUpdate).toHaveBeenCalledWith({ id: "1" });

      mockConn.emit("data", {
        type: "ENTITY_BATCH_UPDATE",
        payload: { "1": {} },
      });
      expect(onBatchUpdate).toHaveBeenCalledWith({ "1": {} });

      mockConn.emit("data", { type: "ENTITY_DELETE", payload: "1" });
      expect(onEntityDelete).toHaveBeenCalledWith("1");

      mockConn.emit("data", { type: "THEME_UPDATE", payload: "cyberpunk" });
      expect(onThemeUpdate).toHaveBeenCalledWith("cyberpunk");
    });

    it("should surface shared token image reveals to the guest session", async () => {
      const revealSpy = vi.spyOn(mapSession, "handleRemoteShowTokenImage");
      const connectPromise = guestService.connectToHost(
        "host-id",
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        "Guest Two",
      );

      const peerInstance = (guestService as any).peer;
      peerInstance.emit("open", "guest-id");

      const mockConn = (guestService as any).connection;
      mockConn.emit("open");

      await connectPromise;

      mockConn.emit("data", {
        type: "SHOW_TOKEN_IMAGE",
        title: "Goblin",
        imagePath: "images/goblin.webp",
      });

      await vi.waitFor(() => {
        expect(revealSpy).toHaveBeenCalledWith("Goblin", "images/goblin.webp");
      });
    });

    it("should hydrate from a compressed session snapshot", async () => {
      const onGraphData = vi.fn();
      const onEntityUpdate = vi.fn();
      const onEntityDelete = vi.fn();
      const onBatchUpdate = vi.fn();
      const onThemeUpdate = vi.fn();
      const syncSpy = vi.spyOn(mapSession, "syncFromRemoteSession");

      const connectPromise = guestService.connectToHost(
        "host-id",
        onGraphData,
        onEntityUpdate,
        onEntityDelete,
        onBatchUpdate,
        onThemeUpdate,
        "Guest Three",
      );

      const peerInstance = (guestService as any).peer;
      peerInstance.emit("open", "guest-id");

      const mockConn = (guestService as any).connection;
      mockConn.emit("open");

      await connectPromise;

      const payload = await encodeSessionSnapshot({
        id: "enc-zip",
        name: "Compressed",
        mapId: "map-1",
        mode: "combat",
        tokens: {},
        initiativeOrder: [],
        initiativeValues: {},
        round: 1,
        turnIndex: 0,
        selection: null,
        sessionFogMask: null,
        lastPing: null,
        measurement: {
          active: false,
          start: null,
          end: null,
        },
        createdAt: 1,
        savedAt: null,
        chatMessages: [],
        gridSize: 50,
        gridUnit: "ft",
        gridDistance: 5,
      });

      mockConn.emit("data", payload);

      await vi.waitFor(() => {
        expect(syncSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "enc-zip",
            name: "Compressed",
          }),
          false,
        );
      });
    });

    it("should install and select the host map on MAP_SYNC", async () => {
      vi.mocked(mapStore.selectMap).mockClear();
      mapStore.activeMapId = "guest-map";

      const connectPromise = guestService.connectToHost(
        "host-id",
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        "Guest Two",
      );

      const peerInstance = (guestService as any).peer;
      peerInstance.emit("open", "guest-id");

      const mockConn = (guestService as any).connection;
      mockConn.emit("open");

      await connectPromise;

      mockConn.emit("data", {
        type: "MAP_SYNC",
        payload: {
          map: {
            id: "map-1",
            name: "Host Map",
            assetPath: "maps/test.webp",
            dimensions: { width: 400, height: 300 },
            pins: [],
            fogOfWar: { maskPath: "maps/test_mask.png" },
          },
          image: {
            mime: "image/webp",
            data: new ArrayBuffer(8),
          },
          fog: {
            mime: "image/png",
            data: new ArrayBuffer(8),
          },
        },
      });

      await vi.waitFor(() => {
        expect(mapStore.selectMap).toHaveBeenCalledWith("map-1");
      });
      expect(vault.maps["map-1"]).toBeDefined();
      expect(vault.maps["map-1"].assetPath).toMatch(/^blob:/);
      expect(vault.maps["map-1"].fogOfWar?.maskPath).toMatch(/^blob:/);
      mapStore.activeMapId = "map-1";
    });

    it("should update only the fog mask on MAP_FOG_SYNC", async () => {
      vault.maps["map-1"] = {
        id: "map-1",
        name: "Host Map",
        assetPath: "maps/test.webp",
        dimensions: { width: 400, height: 300 },
        pins: [],
        fogOfWar: { maskPath: "maps/test_mask.png" },
      };
      mapStore.activeMapId = "map-1";

      const connectPromise = guestService.connectToHost(
        "host-id",
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        "Guest Two",
      );

      const peerInstance = (guestService as any).peer;
      peerInstance.emit("open", "guest-id");

      const mockConn = (guestService as any).connection;
      mockConn.emit("open");
      await connectPromise;

      const originalAssetPath = vault.maps["map-1"].assetPath;

      mockConn.emit("data", {
        type: "MAP_FOG_SYNC",
        payload: {
          mapId: "map-1",
          fog: {
            mime: "image/png",
            data: new ArrayBuffer(8),
          },
        },
      });

      await vi.waitFor(() => {
        expect(vault.maps["map-1"].fogOfWar?.maskPath).toMatch(/^blob:/);
      });
      expect(vault.maps["map-1"].assetPath).toBe(originalAssetPath);
      mapStore.activeMapId = "map-1";
    });

    it("should announce guest name and status on connection", async () => {
      const connectPromise = guestService.connectToHost(
        "host-id",
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        "Morgan",
      );

      const peerInstance = (guestService as any).peer;
      peerInstance.emit("open", "guest-id");

      const mockConn = (guestService as any).connection;
      mockConn.emit("open");

      await connectPromise;

      guestService.updateGuestStatus({
        status: "viewing",
        currentEntityId: "entity-1",
        currentEntityTitle: "Entity 1",
      });

      expect(mockConn.send).toHaveBeenCalledWith({
        type: "GUEST_JOIN",
        payload: { displayName: "Morgan" },
      });
      expect(mockConn.send).not.toHaveBeenCalledWith({
        type: "GUEST_STATUS",
        payload: {
          status: "viewing",
          currentEntityId: "entity-1",
          currentEntityTitle: "Entity 1",
        },
      });

      mockConn.emit("data", {
        type: "GUEST_STATUS",
        payload: {
          peerId: "guest-id",
          displayName: "Morgan",
          status: "connected",
          currentEntityId: null,
          currentEntityTitle: null,
        },
      });

      await vi.waitFor(() => {
        expect(mockConn.send).toHaveBeenCalledWith({
          type: "GUEST_STATUS",
          payload: {
            status: "viewing",
            currentEntityId: "entity-1",
            currentEntityTitle: "Entity 1",
          },
        });
      });
    });

    it("should reset the guest login when the host rejects a duplicate display name", async () => {
      const { uiStore } = await import("../../stores/ui.svelte");
      const { vault } = await import("../../stores/vault.svelte");
      const onJoinRejected = vi.fn();
      const connectPromise = guestService.connectToHost(
        "host-id",
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        "Morgan",
        onJoinRejected,
      );

      const peerInstance = (guestService as any).peer;
      peerInstance.emit("open", "guest-id");

      const mockConn = (guestService as any).connection;
      mockConn.emit("open");

      await connectPromise;

      mockConn.emit("data", {
        type: "GUEST_JOIN_REJECTED",
        payload: {
          reason: "duplicate-display-name",
          displayName: "Morgan",
        },
      });

      await vi.waitFor(() => {
        expect(uiStore.guestUsername).toBeNull();
      });
      expect(onJoinRejected).toHaveBeenCalledWith(
        "duplicate-display-name",
        "Morgan",
      );
      await vi.waitFor(() => {
        expect(vault.status).toBe("idle");
      });
      expect((guestService as any).connection).toBeNull();
    });

    it("should send GUEST_LEAVE before disconnecting", async () => {
      (guestService as any).guestDisplayName = "TestGuest";
      (guestService as any).peer = new MockPeer();
      const mockConn = new MockConnection("host-id");
      mockConn.open = true;
      (guestService as any).connection = mockConn;

      await guestService.leaveSession();

      expect(mockConn.send).toHaveBeenCalledWith({
        type: "GUEST_LEAVE",
        payload: { displayName: "TestGuest" },
      });
      expect((guestService as any).connection).toBeNull();
      expect((guestService as any).peer).toBeNull();
    });

    it("should reject file requests when the host reports a missing file", async () => {
      (guestService as any).connection = new MockConnection("host-id");
      (guestService as any).connection.open = true;

      const fetchPromise = guestService.getFile("images/missing.png");
      const requestId = (guestService as any).connection.send.mock.calls[0][0]
        .requestId;

      (guestService as any).connection.emit("data", {
        type: "FILE_RESPONSE",
        requestId,
        found: false,
      });

      await expect(fetchPromise).rejects.toThrow("File not found on host");
    });
  });

  describe("P2PClientAdapter", () => {
    let adapter: P2PClientAdapter;

    beforeEach(() => {
      vi.clearAllMocks();
      adapter = new P2PClientAdapter("host-id", {
        peerFactory: () => new MockPeer(),
      });
      vi.stubGlobal("URL", {
        createObjectURL: vi.fn().mockReturnValue("blob:url"),
      });
    });

    it("should initialize and connect", async () => {
      const initPromise = adapter.init();

      const peerInstance = (adapter as any).peer;
      peerInstance.emit("open");

      const mockConn = (adapter as any).conn;
      mockConn.emit("open");

      await initPromise;
      expect(mockConn.open).toBe(true);
    });

    it("should handle initialization error", async () => {
      const initPromise = adapter.init();
      const peerInstance = (adapter as any).peer;
      peerInstance.emit("error", new Error("Peer error"));
      await expect(initPromise).rejects.toThrow("Peer error");
    });

    it("should resolve path by fetching file", async () => {
      (adapter as any).conn = new MockConnection("host-id");
      (adapter as any).conn.open = true;

      const resolvePromise = adapter.resolvePath("images/test.png");

      const mockConn = (adapter as any).conn;
      const sendCall = mockConn.send.mock.calls[0][0];
      const requestId = sendCall.requestId;

      (adapter as any).handleMessage({
        type: "FILE_RESPONSE",
        requestId,
        found: true,
        data: new ArrayBuffer(10),
        mime: "image/png",
      });

      const url = await resolvePromise;
      expect(url).toBe("blob:url");
    });

    it("should handle request timeout in fetchFile", async () => {
      vi.useFakeTimers();
      (adapter as any).conn = new MockConnection("host-id");
      (adapter as any).conn.open = true;

      const fetchPromise = (adapter as any).fetchFile("timeout.png");
      vi.advanceTimersByTime(15000);

      await expect(fetchPromise).rejects.toThrow("Request timeout");
      vi.useRealTimers();
    });

    it("should dispose correctly", async () => {
      const mockPeer = new MockPeer();
      const mockConn = new MockConnection("host-id");
      (adapter as any).peer = mockPeer;
      (adapter as any).conn = mockConn;

      await adapter.dispose();

      expect(mockPeer.destroy).toHaveBeenCalled();
      expect(mockConn.close).toHaveBeenCalled();
    });
  });
});
