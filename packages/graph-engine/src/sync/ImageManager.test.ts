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
    const releaseImageUrl = vi.fn();
    let notifyBatchApplied: () => void;
    const batchApplied = new Promise<void>((resolve) => {
      notifyBatchApplied = resolve;
    });

    // Setup node data
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return "path/to/image.png";
      if (key === "resolvedImage") return null;
      return null;
    });

    manager.sync({
      showImages: true,
      resolveImageUrl,
      releaseImageUrl,
      onBatchApplied: notifyBatchApplied,
    });

    await batchApplied;

    expect(mockStyle.update).toHaveBeenCalled();
    expect(mockNode.data).toHaveBeenCalledWith("resolvedImage", "blob:url");
  });

  it("should clear the local urlCache when clearImages is called", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn().mockResolvedValue("blob:url1");
    const releaseImageUrl = vi.fn();
    let notifyFirstBatch: () => void;
    const firstBatchApplied = new Promise<void>((resolve) => {
      notifyFirstBatch = resolve;
    });

    // 1st Sync
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return "path/to/image.png";
      if (key === "resolvedImage") return null;
      return null;
    });

    manager.sync({
      showImages: true,
      resolveImageUrl,
      releaseImageUrl,
      onBatchApplied: notifyFirstBatch,
    });

    await firstBatchApplied;

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
    let notifySecondBatch: () => void;
    const secondBatchApplied = new Promise<void>((resolve) => {
      notifySecondBatch = resolve;
    });
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return "path/to/image.png";
      if (key === "resolvedImage") return null;
      return null;
    });

    manager.sync({
      showImages: true,
      resolveImageUrl,
      releaseImageUrl,
      onBatchApplied: notifySecondBatch,
    });

    await secondBatchApplied;

    expect(resolveImageUrl).toHaveBeenCalledTimes(2);
    expect(mockNode.data).toHaveBeenCalledWith("resolvedImage", "blob:url2");
  });

  it("should resolve silhouette when node has no custom image", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn();
    const releaseImageUrl = vi.fn();
    const resolveSilhouetteUrl = vi
      .fn()
      .mockReturnValue("data:image/svg+xml;utf8,test-svg");
    let notifyBatch: () => void;
    const batchApplied = new Promise<void>((resolve) => {
      notifyBatch = resolve;
    });

    // Setup node data without image
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return null;
      if (key === "thumbnail") return null;
      if (key === "resolvedImage") return null;
      return null;
    });

    manager.sync({
      showImages: true,
      resolveImageUrl,
      releaseImageUrl,
      resolveSilhouetteUrl,
      onBatchApplied: notifyBatch,
    });

    await batchApplied;

    expect(resolveSilhouetteUrl).toHaveBeenCalledWith(mockNode);
    expect(mockNode.data).toHaveBeenCalledWith(
      "resolvedImage",
      "data:image/svg+xml;utf8,test-svg",
    );
    expect(mockNode.data).toHaveBeenCalledWith("isSilhouette", true);
    expect(mockStyle.update).toHaveBeenCalled();
  });

  it("should re-resolve visual when silhouette override changes", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn();
    const releaseImageUrl = vi.fn();
    const resolveSilhouetteUrl = vi
      .fn()
      .mockReturnValue("data:image/svg+xml;utf8,updated-svg");
    let notifyBatch: () => void;
    const batchApplied = new Promise<void>((resolve) => {
      notifyBatch = resolve;
    });

    // Setup node that was previously resolved with "fantasy-warrior-male", now updated to "location-inn-tavern"
    mockNode.data.mockImplementation((key: string) => {
      if (key === "resolvedImage") return "data:image/svg+xml;utf8,old-svg";
      if (key === "isSilhouette") return true;
      if (key === "appliedSilhouetteKey") return "fantasy-warrior-male";
      if (key === "silhouette") return "location-inn-tavern";
      return null;
    });

    manager.sync({
      showImages: true,
      resolveImageUrl,
      releaseImageUrl,
      resolveSilhouetteUrl,
      onBatchApplied: notifyBatch,
    });

    await batchApplied;

    expect(resolveSilhouetteUrl).toHaveBeenCalledWith(mockNode);
    expect(mockNode.data).toHaveBeenCalledWith(
      "resolvedImage",
      "data:image/svg+xml;utf8,updated-svg",
    );
    expect(mockNode.data).toHaveBeenCalledWith(
      "appliedSilhouetteKey",
      expect.stringContaining("location-inn-tavern"),
    );
  });
});
