import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateThumbnail, convertToWebP } from "./image-processing";

describe("image-processing", () => {
  let mockCanvas: any;
  let mockContext: any;
  let mockImage: any;

  let imageDefaults = { width: 1000, height: 800 };

  beforeEach(() => {
    vi.restoreAllMocks();
    imageDefaults = { width: 1000, height: 800 };

    // Mock Canvas and Context
    mockContext = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    };

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      toBlob: vi.fn().mockImplementation((callback, type, _quality) => {
        callback(new Blob(["mock-image-data"], { type }));
      }),
      width: 0,
      height: 0,
    };

    // Mock OffscreenCanvas
    vi.stubGlobal(
      "OffscreenCanvas",
      class {
        constructor(width: number, height: number) {
          mockCanvas.width = width;
          mockCanvas.height = height;
        }
        get width() {
          return mockCanvas.width;
        }
        set width(val) {
          mockCanvas.width = val;
        }
        get height() {
          return mockCanvas.height;
        }
        set height(val) {
          mockCanvas.height = val;
        }

        getContext(type: string) {
          return mockCanvas.getContext(type);
        }
        convertToBlob() {
          return Promise.resolve(
            new Blob(["mock-image-data"], { type: "image/webp" }),
          );
        }
      },
    );

    // Mock Image
    vi.stubGlobal(
      "Image",
      class {
        onload: any = null;
        onerror: any = null;
        src: string = "";
        width: number = imageDefaults.width;
        height: number = imageDefaults.height;
        constructor() {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          mockImage = this;
        }
      },
    );

    // Mock document.createElement
    vi.stubGlobal("document", {
      createElement: vi.fn().mockImplementation((tag) => {
        if (tag === "canvas") return mockCanvas;
        return {};
      }),
    });

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => "mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  describe("generateThumbnail", () => {
    it("should generate a thumbnail blob and maintain aspect ratio (landscape)", async () => {
      const inputBlob = new Blob(["input"], { type: "image/jpeg" });
      const size = 100;

      const promise = generateThumbnail(inputBlob, size);

      // Trigger image load manually
      if (mockImage.onload) {
        mockImage.onload();
      }

      const result = await promise;

      expect(result).toBeInstanceOf(Blob);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(inputBlob);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
      expect(mockCanvas.width).toBe(100);
      expect(mockCanvas.height).toBe(80); // 1000/800 = 100/80
      expect(mockContext.drawImage).toHaveBeenCalled();
    });

    it("should maintain aspect ratio (portrait)", async () => {
      imageDefaults.width = 800;
      imageDefaults.height = 1000;
      const inputBlob = new Blob(["input"], { type: "image/jpeg" });
      const size = 100;

      const promise = generateThumbnail(inputBlob, size);

      if (mockImage.onload) {
        mockImage.onload();
      }

      await promise;

      expect(mockCanvas.width).toBe(80);
      expect(mockCanvas.height).toBe(100);
    });

    it("should not scale up if image is smaller than size", async () => {
      imageDefaults.width = 50;
      imageDefaults.height = 40;
      const inputBlob = new Blob(["input"], { type: "image/jpeg" });
      const size = 100;

      const promise = generateThumbnail(inputBlob, size);

      if (mockImage.onload) {
        mockImage.onload();
      }

      await promise;

      expect(mockCanvas.width).toBe(50);
      expect(mockCanvas.height).toBe(40);
    });

    it("should not scale up if portrait image is smaller than size", async () => {
      imageDefaults.width = 40;
      imageDefaults.height = 50;
      const inputBlob = new Blob(["input"], { type: "image/jpeg" });
      const size = 100;

      const promise = generateThumbnail(inputBlob, size);

      if (mockImage.onload) {
        mockImage.onload();
      }

      await promise;

      expect(mockCanvas.width).toBe(40);
      expect(mockCanvas.height).toBe(50);
    });

    it("should handle error when image fails to load", async () => {
      const inputBlob = new Blob(["input"], { type: "image/jpeg" });
      const promise = generateThumbnail(inputBlob, 100);

      if (mockImage.onerror) {
        mockImage.onerror(new Error("Load failed"));
      }

      await expect(promise).rejects.toThrow("Load failed");
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
    });

    it("should reject if canvas context cannot be initialized", async () => {
      // Mock getContext to return null once
      mockCanvas.getContext = vi.fn().mockReturnValue(null);

      const inputBlob = new Blob(["input"], { type: "image/jpeg" });
      const promise = generateThumbnail(inputBlob, 100);

      if (mockImage.onload) {
        mockImage.onload();
      }

      await expect(promise).rejects.toThrow(
        "Failed to initialize canvas context",
      );
    });

    it("should work when OffscreenCanvas is not available", async () => {
      vi.stubGlobal("OffscreenCanvas", undefined);

      const inputBlob = new Blob(["input"], { type: "image/jpeg" });
      const size = 100;

      const promise = generateThumbnail(inputBlob, size);

      if (mockImage.onload) {
        mockImage.onload();
      }

      const result = await promise;

      expect(result).toBeInstanceOf(Blob);
      expect(mockCanvas.toBlob).toHaveBeenCalled();
    });

    it("should reject if toBlob fails", async () => {
      vi.stubGlobal("OffscreenCanvas", undefined);
      mockCanvas.toBlob.mockImplementation(
        (callback: (blob: Blob | null) => void) => callback(null),
      );

      const inputBlob = new Blob(["input"], { type: "image/jpeg" });
      const promise = generateThumbnail(inputBlob, 100);

      if (mockImage.onload) {
        mockImage.onload();
      }

      await expect(promise).rejects.toThrow("Canvas toBlob failed");
    });
  });

  describe("convertToWebP", () => {
    it("should convert a blob to WebP", async () => {
      const inputBlob = new Blob(["input"], { type: "image/png" });
      const promise = convertToWebP(inputBlob, 0.9);

      if (mockImage.onload) {
        mockImage.onload();
      }

      const result = await promise;

      expect(result).toBeInstanceOf(Blob);
      expect(mockContext.drawImage).toHaveBeenCalled();
    });

    it("should use default quality if not provided", async () => {
      const inputBlob = new Blob(["input"], { type: "image/png" });
      const promise = convertToWebP(inputBlob);

      if (mockImage.onload) {
        mockImage.onload();
      }

      await promise;
      expect(mockContext.drawImage).toHaveBeenCalled();
    });

    it("should handle error when image fails to load during WebP conversion", async () => {
      const inputBlob = new Blob(["input"], { type: "image/png" });
      const promise = convertToWebP(inputBlob);

      if (mockImage.onerror) {
        mockImage.onerror(new Error("WebP Load failed"));
      }

      await expect(promise).rejects.toThrow("WebP Load failed");
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
    });

    it("should reject if canvas context fails during WebP conversion", async () => {
      mockCanvas.getContext.mockReturnValue(null);
      const inputBlob = new Blob(["input"], { type: "image/png" });
      const promise = convertToWebP(inputBlob);

      if (mockImage.onload) {
        mockImage.onload();
      }

      await expect(promise).rejects.toThrow(
        "Failed to initialize canvas context for WebP conversion",
      );
    });

    it("should reject if toBlob fails during WebP conversion", async () => {
      vi.stubGlobal("OffscreenCanvas", undefined);
      mockCanvas.toBlob.mockImplementation(
        (callback: (blob: Blob | null) => void) => callback(null),
      );

      const inputBlob = new Blob(["input"], { type: "image/png" });
      const promise = convertToWebP(inputBlob);

      if (mockImage.onload) {
        mockImage.onload();
      }

      await expect(promise).rejects.toThrow(
        "Canvas toBlob failed during WebP conversion",
      );
    });
  });
});
