import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GuestFileClient } from "./guest-file-client";
import { MockClientTransport } from "./transport/mock-client-transport";

const decodeBlob = async (blob: Blob): Promise<Uint8Array> =>
  new Uint8Array(await blob.arrayBuffer());

describe("GuestFileClient", () => {
  let transport: MockClientTransport;
  let client: GuestFileClient;

  beforeEach(async () => {
    transport = new MockClientTransport();
    await transport.connect("host");
    client = new GuestFileClient(transport);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws when transport is not connected", async () => {
    transport.disconnect();
    await expect(client.getFile("img.png")).rejects.toThrow(
      "Not connected to host",
    );
  });

  it("resolves a single-chunk response", async () => {
    const promise = client.getFile("img.png");
    const sent = transport.sent[transport.sent.length - 1];
    expect(sent.type).toBe("GET_FILE");
    expect(sent.path).toBe("img.png");

    transport.simulateData({
      type: "FILE_RESPONSE",
      requestId: sent.requestId,
      found: true,
      mime: "image/png",
      data: new Uint8Array([1, 2, 3]).buffer,
    });

    const blob = await promise;
    expect(blob.type).toBe("image/png");
    const bytes = await decodeBlob(blob);
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("reassembles chunks arriving out of order", async () => {
    const promise = client.getFile("big.bin");
    const req = transport.sent[transport.sent.length - 1];

    transport.simulateData({
      type: "FILE_RESPONSE",
      requestId: req.requestId,
      found: true,
      mime: "application/octet-stream",
      data: new Uint8Array([4, 5]).buffer,
      chunkIndex: 1,
      totalChunks: 3,
    });
    transport.simulateData({
      type: "FILE_RESPONSE",
      requestId: req.requestId,
      found: true,
      mime: "application/octet-stream",
      data: new Uint8Array([6]).buffer,
      chunkIndex: 2,
      totalChunks: 3,
    });
    transport.simulateData({
      type: "FILE_RESPONSE",
      requestId: req.requestId,
      found: true,
      mime: "application/octet-stream",
      data: new Uint8Array([1, 2, 3]).buffer,
      chunkIndex: 0,
      totalChunks: 3,
    });

    const blob = await promise;
    const bytes = await decodeBlob(blob);
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("rejects with timeout after 15s and removes listeners", async () => {
    vi.useFakeTimers();
    const promise = client.getFile("img.png");
    const before = countListeners(transport);

    vi.advanceTimersByTime(15_000);

    await expect(promise).rejects.toThrow("File request timed out");
    expect(countListeners(transport)).toBeLessThan(before);
  });

  it("rejects when host responds with found:false", async () => {
    const promise = client.getFile("missing");
    const req = transport.sent[transport.sent.length - 1];
    transport.simulateData({
      type: "FILE_RESPONSE",
      requestId: req.requestId,
      found: false,
    });
    await expect(promise).rejects.toThrow("File not found on host");
  });

  it("ignores FILE_RESPONSE for other requestIds", async () => {
    const promise = client.getFile("img.png");
    const req = transport.sent[transport.sent.length - 1];

    transport.simulateData({
      type: "FILE_RESPONSE",
      requestId: "other",
      found: true,
      data: new Uint8Array([9]).buffer,
    });
    transport.simulateData({
      type: "FILE_RESPONSE",
      requestId: req.requestId,
      found: true,
      data: new Uint8Array([1]).buffer,
    });

    const blob = await promise;
    const bytes = await decodeBlob(blob);
    expect(Array.from(bytes)).toEqual([1]);
  });

  it("rejects if transport closes mid-request", async () => {
    const promise = client.getFile("img.png");
    transport.simulateClose();
    await expect(promise).rejects.toThrow(/closed/);
  });

  it("uses custom IdGenerator when provided in constructor", async () => {
    const mockIdGen = { uuid: vi.fn().mockReturnValue("custom-req-id-123") };
    const customClient = new GuestFileClient(transport, {
      idGenerator: mockIdGen,
    });
    const promise = customClient.getFile("test.png");
    const sent = transport.sent[transport.sent.length - 1];

    expect(mockIdGen.uuid).toHaveBeenCalled();
    expect(sent.requestId).toBe("custom-req-id-123");

    transport.simulateData({
      type: "FILE_RESPONSE",
      requestId: "custom-req-id-123",
      found: true,
      data: new Uint8Array([1]).buffer,
    });
    await promise;
  });
});

function countListeners(transport: MockClientTransport): number {
  // Access via any to inspect internal registry size
  const listeners = (transport as any).listeners ?? {};
  return Object.values(listeners).reduce(
    (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0),
    0,
  );
}
