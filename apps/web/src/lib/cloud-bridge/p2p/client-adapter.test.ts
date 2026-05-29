import { describe, it, expect, vi, beforeEach } from "vitest";
import { P2PClientAdapter } from "./client-adapter";

describe("P2PClientAdapter", () => {
  let adapter: P2PClientAdapter;
  let mockPeer: any;
  let mockConn: any;

  beforeEach(() => {
    mockConn = {
      on: vi.fn(),
      send: vi.fn(),
      open: true,
    };
    mockPeer = {
      on: vi.fn(),
      connect: vi.fn().mockReturnValue(mockConn),
      destroy: vi.fn(),
    };
    adapter = new P2PClientAdapter("host-1", {
      peerFactory: () => mockPeer,
    });
  });

  it("should reassemble chunked file responses", async () => {
    // Initialize adapter and trigger connection
    const initPromise = adapter.init();
    const peerOpenHandler = mockPeer.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    peerOpenHandler();

    const connOpenHandler = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "open",
    )[1];
    connOpenHandler();

    await initPromise;

    // Start a file fetch
    const fetchPromise = adapter.resolvePath("test.png");

    // Get the request ID from the sent message
    const sentMsg = mockConn.send.mock.calls[0][0];
    const requestId = sentMsg.requestId;

    // Simulate receiving 3 chunks
    const dataHandler = mockConn.on.mock.calls.find(
      (c: any[]) => c[0] === "data",
    )[1];

    const chunk1 = new ArrayBuffer(10);
    const chunk2 = new ArrayBuffer(10);
    const chunk3 = new ArrayBuffer(5);

    dataHandler({
      type: "FILE_RESPONSE",
      requestId,
      found: true,
      mime: "image/png",
      data: chunk1,
      chunkIndex: 0,
      totalChunks: 3,
    });

    dataHandler({
      type: "FILE_RESPONSE",
      requestId,
      found: true,
      mime: "image/png",
      data: chunk2,
      chunkIndex: 1,
      totalChunks: 3,
    });

    dataHandler({
      type: "FILE_RESPONSE",
      requestId,
      found: true,
      mime: "image/png",
      data: chunk3,
      chunkIndex: 2,
      totalChunks: 3,
    });

    const url = await fetchPromise;
    expect(url).toContain("blob:");
    // In a real browser environment, we could check the blob content,
    // but in Vitest we just check that it resolved.
  });
});
