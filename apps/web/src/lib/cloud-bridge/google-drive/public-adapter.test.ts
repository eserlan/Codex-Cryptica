import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PublicGDriveAdapter } from "./public-adapter";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe.skip("PublicGDriveAdapter", () => {
  let adapter: PublicGDriveAdapter;

  beforeEach(() => {
    adapter = new PublicGDriveAdapter();
    fetchMock.mockClear();
    vi.spyOn(adapter as any, "waitForGapi").mockResolvedValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should throw error if methods unrelated to fetching are called", async () => {
    await expect(adapter.shareFilePublicly("id")).rejects.toThrow();
    await expect(adapter.revokeShare("id")).rejects.toThrow();
  });

  it("should throw error if apiKey is missing", async () => {
    await expect(adapter.fetchPublicFile("fileId", "")).rejects.toThrow("API Key is required");
  });

  it("should fetch file successfully", async () => {
    const mockBlob = new Blob(["content"], { type: "text/plain" });
    fetchMock.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob)
    });

    const result = await adapter.fetchPublicFile("fileId", "key");
    expect(result).toEqual(mockBlob);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://www.googleapis.com/drive/v3/files/fileId?key=key&alt=media"),
      { method: "GET" }
    );
  });

  it("should handle 404 error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found"
    });

    await expect(adapter.fetchPublicFile("fileId", "key")).rejects.toThrow("File Not Found");
  });

  it("should handle 403 error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden"
    });

    await expect(adapter.fetchPublicFile("fileId", "key")).rejects.toThrow("Access Denied");
  });
});
