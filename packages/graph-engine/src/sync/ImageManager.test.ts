import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphImageManager } from "./ImageManager";

describe("GraphImageManager", () => {
  let mockCy: any;
  let mockNode: any;
  let mockStyle: any;

  beforeEach(() => {
    mockStyle = {
      update: vi.fn(),
    };
    mockNode = {
      id: vi.fn().mockReturnValue("node1"),
      data: vi.fn(),
      removeData: vi.fn(),
    };
    mockCy = {
      destroyed: vi.fn().mockReturnValue(false),
      nodes: vi.fn().mockReturnValue({
        filter: vi.fn().mockReturnValue([mockNode]),
      }),
      batch: vi.fn((fn) => fn()),
      style: vi.fn().mockReturnValue(mockStyle),
    };
  });

  it("should update style after applying images", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn().mockResolvedValue("blob:url");

    // Setup node data
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return "path/to/image.png";
      if (key === "resolvedImage") return null;
      return null;
    });

    manager.sync({
      showImages: true,
      resolveImageUrl,
    });

    // Wait for the async processing in ImageManager
    await vi.waitFor(
      () => {
        expect(mockStyle.update).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    expect(mockNode.data).toHaveBeenCalledWith("resolvedImage", "blob:url");
  });

  it("should clear the local urlCache when clearImages is called", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn().mockResolvedValue("blob:url1");
    const releaseImageUrl = vi.fn();

    // 1st Sync
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return "path/to/image.png";
      if (key === "resolvedImage") return null;
      return null;
    });

    manager.sync({ showImages: true, resolveImageUrl, releaseImageUrl });

    await vi.waitFor(() => expect(resolveImageUrl).toHaveBeenCalledTimes(1), {
      timeout: 1000,
    });

    // Setup node for being "resolved" for the clear step
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return "path/to/image.png";
      if (key === "resolvedImage") return "blob:url1";
      return null;
    });

    // Clear Images
    manager.sync({ showImages: false, resolveImageUrl, releaseImageUrl });
    expect(releaseImageUrl).toHaveBeenCalledWith("path/to/image.png");

    // 2nd Sync - should call resolveImageUrl again because cache was cleared
    resolveImageUrl.mockResolvedValue("blob:url2");
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return "path/to/image.png";
      if (key === "resolvedImage") return null;
      return null;
    });

    manager.sync({ showImages: true, resolveImageUrl, releaseImageUrl });

    await vi.waitFor(() => expect(resolveImageUrl).toHaveBeenCalledTimes(2), {
      timeout: 1000,
    });

    expect(mockNode.data).toHaveBeenCalledWith("resolvedImage", "blob:url2");
  });
});
