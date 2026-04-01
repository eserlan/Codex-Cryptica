import { describe, expect, it, vi } from "vitest";
import { MapViewAssetLoader } from "./map-view-loader";

function createImageMock() {
  let srcValue = "";
  const image: any = {
    width: 640,
    height: 480,
    crossOrigin: "",
    onload: undefined,
    onerror: undefined,
    get src() {
      return srcValue;
    },
    set src(value: string) {
      srcValue = value;
    },
  };
  return image as HTMLImageElement;
}

describe("MapViewAssetLoader", () => {
  it("loads an asset, mask, and dimensions", async () => {
    const onClear = vi.fn();
    const onImageLoaded = vi.fn();
    const onMaskLoaded = vi.fn();
    const onDimensionsLoaded = vi.fn();
    const onError = vi.fn();
    const releaseImageUrl = vi.fn();
    const resolveImageUrl = vi.fn(async () => "blob:asset");
    const loadMask = vi.fn(async () => document.createElement("canvas"));
    let createdImage: HTMLImageElement | null = null;

    const loader = new MapViewAssetLoader({
      vault: { resolveImageUrl, releaseImageUrl },
      mapStore: { loadMask },
      createImage: () => (createdImage = createImageMock()),
      onClear,
      onImageLoaded,
      onMaskLoaded,
      onDimensionsLoaded,
      onError,
    });

    const cleanup = loader.sync({
      id: "map-1",
      name: "Map 1",
      assetPath: "maps/map-1.webp",
      dimensions: { width: 0, height: 0 },
      pins: [],
      fogOfWar: { maskPath: "maps/map-1_mask.png" },
    });

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(resolveImageUrl).toHaveBeenCalledWith("maps/map-1.webp");
    expect(createdImage).not.toBeNull();
    const image = createdImage as unknown as HTMLImageElement;
    expect(image.crossOrigin).toBe("anonymous");

    await vi.waitFor(() => {
      expect(image.onload).toBeTypeOf("function");
    });

    await image.onload?.(new Event("load") as any);

    await vi.waitFor(() => {
      expect(onImageLoaded).toHaveBeenCalledTimes(1);
      expect(loadMask).toHaveBeenCalledWith(640, 480);
      expect(onMaskLoaded).toHaveBeenCalledTimes(1);
      expect(onDimensionsLoaded).toHaveBeenCalledWith(640, 480);
    });

    cleanup();
    expect(releaseImageUrl).toHaveBeenCalledWith("maps/map-1.webp");
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports the originally requested path when resolution resolves after edits", async () => {
    const onError = vi.fn();
    let resolveImageUrlPromise!: (value: string | undefined) => void;
    const resolveImageUrl = vi.fn(
      () =>
        new Promise<string | undefined>((resolve) => {
          resolveImageUrlPromise = resolve;
        }),
    );

    const loader = new MapViewAssetLoader({
      vault: {
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
      },
      mapStore: {
        loadMask: vi.fn(),
      },
      createImage: createImageMock,
      onClear: vi.fn(),
      onImageLoaded: vi.fn(),
      onMaskLoaded: vi.fn(),
      onDimensionsLoaded: vi.fn(),
      onError,
    });

    const activeMap = {
      id: "map-1",
      name: "Map 1",
      assetPath: "maps/map-1.webp",
      dimensions: { width: 0, height: 0 },
      pins: [],
      fogOfWar: { maskPath: "maps/map-1_mask.png" },
    };

    loader.sync(activeMap);
    activeMap.assetPath = "maps/map-1-updated.webp";
    resolveImageUrlPromise(undefined);

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError).toHaveBeenCalledWith(
      "[MapView] Failed to resolve image URL for:",
      "maps/map-1.webp",
    );
  });

  it("reports failures when the image cannot be resolved", async () => {
    const onError = vi.fn();
    const loader = new MapViewAssetLoader({
      vault: {
        resolveImageUrl: vi.fn(async () => undefined),
        releaseImageUrl: vi.fn(),
      },
      mapStore: {
        loadMask: vi.fn(),
      },
      createImage: createImageMock,
      onClear: vi.fn(),
      onImageLoaded: vi.fn(),
      onMaskLoaded: vi.fn(),
      onDimensionsLoaded: vi.fn(),
      onError,
    });

    loader.sync({
      id: "map-1",
      name: "Map 1",
      assetPath: "maps/map-1.webp",
      dimensions: { width: 0, height: 0 },
      pins: [],
      fogOfWar: { maskPath: "maps/map-1_mask.png" },
    });

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it("releases a resolved blob url when the image errors", async () => {
    const onError = vi.fn();
    const onClear = vi.fn();
    const onImageLoaded = vi.fn();
    const onMaskLoaded = vi.fn();
    const onDimensionsLoaded = vi.fn();
    const releaseImageUrl = vi.fn();
    const resolveImageUrl = vi.fn(async () => "blob:asset");
    let createdImage: HTMLImageElement | null = null;

    const loader = new MapViewAssetLoader({
      vault: { resolveImageUrl, releaseImageUrl },
      mapStore: {
        loadMask: vi.fn(),
      },
      createImage: () => (createdImage = createImageMock()),
      onClear,
      onImageLoaded,
      onMaskLoaded,
      onDimensionsLoaded,
      onError,
    });

    loader.sync({
      id: "map-1",
      name: "Map 1",
      assetPath: "maps/map-1.webp",
      dimensions: { width: 0, height: 0 },
      pins: [],
      fogOfWar: { maskPath: "maps/map-1_mask.png" },
    });

    await vi.waitFor(() => expect(createdImage).not.toBeNull());
    const image = createdImage as unknown as HTMLImageElement;
    await image.onerror?.(new Event("error") as any);

    expect(releaseImageUrl).toHaveBeenCalledWith("maps/map-1.webp");
    expect(onError).toHaveBeenCalledWith(
      "[MapView] Image load failed:",
      expect.any(Event),
    );
  });

  it("reports a dimension persistence failure separately from mask loading", async () => {
    const onError = vi.fn();
    const onClear = vi.fn();
    const onImageLoaded = vi.fn();
    const onMaskLoaded = vi.fn();
    const releaseImageUrl = vi.fn();
    const resolveImageUrl = vi.fn(async () => "blob:asset");
    let createdImage: HTMLImageElement | null = null;

    const loader = new MapViewAssetLoader({
      vault: { resolveImageUrl, releaseImageUrl },
      mapStore: {
        loadMask: vi.fn(async () => document.createElement("canvas")),
      },
      createImage: () => (createdImage = createImageMock()),
      onClear,
      onImageLoaded,
      onMaskLoaded,
      onDimensionsLoaded: vi.fn(async () => {
        throw new Error("persist failed");
      }),
      onError,
    });

    loader.sync({
      id: "map-1",
      name: "Map 1",
      assetPath: "maps/map-1.webp",
      dimensions: { width: 0, height: 0 },
      pins: [],
      fogOfWar: { maskPath: "maps/map-1_mask.png" },
    });

    await vi.waitFor(() => expect(createdImage).not.toBeNull());
    const image = createdImage as unknown as HTMLImageElement;
    await image.onload?.(new Event("load") as any);

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        "[MapView] Failed to persist map dimensions for:",
        expect.any(Error),
      );
    });
  });
});
