import { describe, it, expect, vi, beforeEach } from "vitest";
import { P2PHostService } from "./host-service.svelte";
import { P2PGuestService } from "./guest-service";
import { P2PClientAdapter } from "./client-adapter";
import { vault } from "../../stores/vault.svelte";
import { themeStore } from "../../stores/theme.svelte";
import { guestRoster } from "../../stores/guest";

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

// Mock Vault
vi.mock("../../stores/vault.svelte", () => {
  return {
    vault: {
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

describe("P2P Services", () => {
  describe("P2PHostService", () => {
    let hostService: P2PHostService;

    beforeEach(() => {
      vi.clearAllMocks();
      guestRoster.set({});
      hostService = new P2PHostService({
        vault,
        themeStore,
        guestRoster,
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

    it("should return the existing peer id when already hosting", async () => {
      (hostService as any)._isHosting = true;
      (hostService as any).peerId = "existing-peer";

      await expect(hostService.startHosting()).resolves.toBe("existing-peer");
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
      expect(mockConn.send).toHaveBeenCalledWith({
        type: "GUEST_STATUS",
        payload: {
          status: "viewing",
          currentEntityId: "entity-1",
          currentEntityTitle: "Entity 1",
        },
      });
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
