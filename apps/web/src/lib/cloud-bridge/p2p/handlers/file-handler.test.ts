import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileHandler } from "./file-handler";

describe("FileHandler", () => {
  let handler: FileHandler;
  let mockContext: any;
  let mockConn: any;

  beforeEach(() => {
    handler = new FileHandler();
    mockContext = {
      vault: {
        getActiveVaultHandle: vi.fn(),
      },
    };
    mockConn = { peer: "g1", send: vi.fn() };
  });

  it("should handle GET_FILE", async () => {
    const mockFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 1024,
        type: "image/png",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      }),
    };
    const mockVaultHandle = {
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    };
    mockContext.vault.getActiveVaultHandle.mockResolvedValue(mockVaultHandle);

    const msg = {
      type: "GET_FILE",
      path: "test.png",
      requestId: "req1",
    } as any;
    await handler.handle(msg, mockConn, mockContext);

    expect(mockConn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "FILE_RESPONSE",
        requestId: "req1",
        found: true,
        mime: "image/png",
      }),
    );
  });

  it("should handle file not found", async () => {
    mockContext.vault.getActiveVaultHandle.mockResolvedValue({
      getFileHandle: vi.fn().mockRejectedValue(new Error("Not found")),
    });

    const msg = {
      type: "GET_FILE",
      path: "missing.png",
      requestId: "req2",
    } as any;
    await handler.handle(msg, mockConn, mockContext);

    expect(mockConn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "FILE_RESPONSE",
        requestId: "req2",
        found: false,
      }),
    );
  });

  it("should chunk large files into 16KB pieces", async () => {
    const largeSize = 40 * 1024; // 40KB -> 3 chunks (16, 16, 8)
    const mockFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: largeSize,
        type: "image/png",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(largeSize)),
      }),
    };
    const mockVaultHandle = {
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    };
    mockContext.vault.getActiveVaultHandle.mockResolvedValue(mockVaultHandle);

    const msg = {
      type: "GET_FILE",
      path: "large.png",
      requestId: "req3",
    } as any;
    await handler.handle(msg, mockConn, mockContext);

    // Expect 3 calls to send
    expect(mockConn.send).toHaveBeenCalledTimes(3);
    expect(mockConn.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        chunkIndex: 0,
        totalChunks: 3,
      }),
    );
    expect(mockConn.send).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        chunkIndex: 1,
        totalChunks: 3,
      }),
    );
    expect(mockConn.send).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        chunkIndex: 2,
        totalChunks: 3,
      }),
    );
  });

  it("should handle GET_FILE for subdirectories (e.g. audio/test.wav)", async () => {
    const mockFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 2048,
        type: "audio/wav",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(2048)),
      }),
    };
    const mockAudioDirHandle = {
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    };
    const mockVaultHandle = {
      getDirectoryHandle: vi.fn().mockResolvedValue(mockAudioDirHandle),
    };
    mockContext.vault.getActiveVaultHandle.mockResolvedValue(mockVaultHandle);

    const msg = {
      type: "GET_FILE",
      path: "audio/test.wav",
      requestId: "reqSub",
    } as any;
    await handler.handle(msg, mockConn, mockContext);

    expect(mockVaultHandle.getDirectoryHandle).toHaveBeenCalledWith("audio");
    expect(mockAudioDirHandle.getFileHandle).toHaveBeenCalledWith("test.wav");
    expect(mockConn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "FILE_RESPONSE",
        requestId: "reqSub",
        found: true,
        mime: "audio/wav",
      }),
    );
  });
});
