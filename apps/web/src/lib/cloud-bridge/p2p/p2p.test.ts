import { beforeEach, describe, expect, it, vi } from "vitest";
import { P2PHostService } from "./host-service.svelte";
import { P2PGuestService } from "./guest-service";
import { P2PClientAdapter } from "./client-adapter";
import { vault } from "../../stores/vault.svelte";

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
    id = "mock-peer-id";
    open = true;

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
      hostService = new P2PHostService();
    });

    it("should start hosting and return a peer ID", async () => {
      const idPromise = hostService.startHosting();
      const peerInstance = (hostService as any).peer;
      peerInstance.emit("open", "mock-peer-id");
      const id = await idPromise;
      expect(id).toBe("mock-peer-id");
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
      guestService = new P2PGuestService();
    });

    it("should handle connection timeout", async () => {
      vi.useFakeTimers();
      const connectPromise = guestService.connectToHost(
        "host-id",
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );

      vi.advanceTimersByTime(15000);

      await expect(connectPromise).rejects.toThrow("Connection timed out");
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
      );
      await expect(promise).rejects.toThrow("Peer init error");
    });

    it("should handle various message types on connection", async () => {
      const onGraphData = vi.fn();
      const onEntityUpdate = vi.fn();
      const onEntityDelete = vi.fn();
      const onBatchUpdate = vi.fn();

      const connectPromise = guestService.connectToHost(
        "host-id",
        onGraphData,
        onEntityUpdate,
        onEntityDelete,
        onBatchUpdate,
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
    });
  });

  describe("P2PClientAdapter", () => {
    let adapter: P2PClientAdapter;

    beforeEach(() => {
      vi.clearAllMocks();
      adapter = new P2PClientAdapter("host-id");
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
