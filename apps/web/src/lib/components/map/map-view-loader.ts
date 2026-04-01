import type { Map } from "schema";

export interface MapViewAssetLoaderDeps {
  vault: Pick<
    {
      resolveImageUrl(assetPath: string): Promise<string | undefined>;
      releaseImageUrl(assetPath: string): void;
    },
    "resolveImageUrl" | "releaseImageUrl"
  >;
  mapStore: {
    loadMask(width: number, height: number): Promise<HTMLCanvasElement>;
  };
  createImage: () => HTMLImageElement;
  onClear: () => void;
  onImageLoaded: (image: HTMLImageElement) => void;
  onMaskLoaded: (mask: HTMLCanvasElement) => void;
  onDimensionsLoaded: (width: number, height: number) => Promise<void> | void;
  onError: (message: string, err: unknown) => void;
}

export class MapViewAssetLoader {
  private currentLoadId = 0;
  private currentBlobUrl = "";
  private currentAssetPath = "";

  constructor(private deps: MapViewAssetLoaderDeps) {}

  sync(activeMap: Map | null): () => void {
    this.cancelCurrent();

    if (!activeMap) {
      this.deps.onClear();
      return () => this.cancelCurrent();
    }

    const loadId = ++this.currentLoadId;
    const requestedAssetPath = activeMap.assetPath;
    this.currentAssetPath = requestedAssetPath;
    this.deps.onClear();

    const image = this.deps.createImage();
    image.crossOrigin = "anonymous";

    this.deps.vault
      .resolveImageUrl(requestedAssetPath)
      .then((url) => {
        if (loadId !== this.currentLoadId) {
          if (url) this.deps.vault.releaseImageUrl(requestedAssetPath);
          return;
        }

        if (!url) {
          this.deps.onError(
            "[MapView] Failed to resolve image URL for:",
            activeMap.assetPath,
          );
          return;
        }

        this.currentBlobUrl = url;
        image.src = url;

        image.onload = async () => {
          if (loadId !== this.currentLoadId) return;

          this.deps.onImageLoaded(image);

          try {
            const mask = await this.deps.mapStore.loadMask(
              image.width,
              image.height,
            );
            if (loadId !== this.currentLoadId) return;

            this.deps.onMaskLoaded(mask);
            await this.deps.onDimensionsLoaded(image.width, image.height);
          } catch (err) {
            this.deps.onError("[MapView] Failed to load mask for:", err);
          }
        };

        image.onerror = (err) => {
          if (loadId !== this.currentLoadId) return;
          this.deps.onError("[MapView] Image load failed:", err);
        };
      })
      .catch((err) => {
        if (loadId !== this.currentLoadId) return;
        this.deps.onError("[MapView] Error during resolveImageUrl:", err);
      });

    return () => this.cancelCurrent();
  }

  private cancelCurrent() {
    if (this.currentBlobUrl) {
      this.deps.vault.releaseImageUrl(this.currentAssetPath);
    }

    this.currentLoadId += 1;
    this.currentBlobUrl = "";
    this.currentAssetPath = "";
  }
}
