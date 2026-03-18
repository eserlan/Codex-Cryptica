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
});
