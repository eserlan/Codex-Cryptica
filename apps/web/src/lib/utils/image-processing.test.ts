import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
      toBlob: vi
        .fn()
        .mockImplementation(
          (callback: (blob: Blob | null) => void, type, _quality) => {
            callback(new Blob(["mock-image-data"], { type }));
          },
        ),
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
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") return mockCanvas;
      return originalCreateElement(tag);
    });

    // Mock URL methods
    vi.spyOn(URL, "createObjectURL").mockReturnValue("mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
      expect(URL.createObjectURL).toHaveBeenCalledWith(inputBlob);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
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
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
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

    it("should reject if toBlob fails for both webp and png", async () => {
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

    it("should fall back to PNG if webp toBlob returns null", async () => {
      vi.stubGlobal("OffscreenCanvas", undefined);
      mockCanvas.toBlob.mockImplementation(
        (callback: (blob: Blob | null) => void, type: string) => {
          if (type === "image/webp") callback(null);
          else callback(new Blob(["mock-image-data"], { type }));
        },
      );

      const inputBlob = new Blob(["input"], { type: "image/jpeg" });
      const promise = generateThumbnail(inputBlob, 100);

      if (mockImage.onload) {
        mockImage.onload();
      }

      const result = await promise;
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("image/png");
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
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
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

    it("should reject if toBlob fails for both webp and png", async () => {
      vi.stubGlobal("OffscreenCanvas", undefined);
      mockCanvas.toBlob.mockImplementation(
        (callback: (blob: Blob | null) => void) => callback(null),
      );

      const inputBlob = new Blob(["input"], { type: "image/png" });
      const promise = convertToWebP(inputBlob);

      if (mockImage.onload) {
        mockImage.onload();
      }

      await expect(promise).rejects.toThrow("Canvas toBlob failed");
    });

    it("should fall back to PNG if webp toBlob returns null", async () => {
      vi.stubGlobal("OffscreenCanvas", undefined);
      mockCanvas.toBlob.mockImplementation(
        (callback: (blob: Blob | null) => void, type: string) => {
          if (type === "image/webp") callback(null);
          else callback(new Blob(["mock-image-data"], { type }));
        },
      );

      const inputBlob = new Blob(["input"], { type: "image/png" });
      const promise = convertToWebP(inputBlob);

      if (mockImage.onload) {
        mockImage.onload();
      }

      const result = await promise;
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("image/png");
    });

    it("should upscale a small image 2x with nearest-neighbor when autoUpscaleSmall is set", async () => {
      imageDefaults.width = 300;
      imageDefaults.height = 200;
      const inputBlob = new Blob(["input"], { type: "image/png" });
      const promise = convertToWebP(inputBlob, 0.85, {
        autoUpscaleSmall: true,
      });

      if (mockImage.onload) {
        mockImage.onload();
      }

      await promise;

      expect(mockCanvas.width).toBe(600);
      expect(mockCanvas.height).toBe(400);
      expect(mockContext.imageSmoothingEnabled).toBe(false);
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        mockImage,
        0,
        0,
        600,
        400,
      );
    });

    it("should not upscale a small image when autoUpscaleSmall is not set", async () => {
      imageDefaults.width = 300;
      imageDefaults.height = 200;
      const inputBlob = new Blob(["input"], { type: "image/png" });
      const promise = convertToWebP(inputBlob, 0.85);

      if (mockImage.onload) {
        mockImage.onload();
      }

      await promise;

      expect(mockCanvas.width).toBe(300);
      expect(mockCanvas.height).toBe(200);
    });

    it("should not upscale an image that is already large enough", async () => {
      imageDefaults.width = 1200;
      imageDefaults.height = 900;
      const inputBlob = new Blob(["input"], { type: "image/png" });
      const promise = convertToWebP(inputBlob, 0.85, {
        autoUpscaleSmall: true,
      });

      if (mockImage.onload) {
        mockImage.onload();
      }

      await promise;

      expect(mockCanvas.width).toBe(1200);
      expect(mockCanvas.height).toBe(900);
    });
  });
});
