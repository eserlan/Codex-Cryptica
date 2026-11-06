import type { AssetStore } from "./asset-store.svelte";

interface AssetAccessDependencies {
  isGuest: () => boolean;
  resolveGuestImage: (path: string) => string | undefined;
  assets: () => Pick<
    AssetStore,
    | "resolveImageUrl"
    | "resolveThumbnailUrl"
    | "releaseImageUrl"
    | "releaseThumbnailUrl"
  >;
}

/** Keeps snapshot image URLs separate from the host's asset caches. */
export class VaultAssetAccess {
  constructor(private deps: AssetAccessDependencies) {}
  resolveImageUrl(
    path: string,
    fetcher?: (path: string) => Promise<Blob>,
  ): Promise<string> {
    return this.deps.isGuest()
      ? this.resolveGuestImage(path)
      : this.deps.assets().resolveImageUrl(path, fetcher);
  }
  resolveThumbnailUrl(path: string): Promise<string> {
    return this.deps.isGuest()
      ? this.resolveGuestImage(path)
      : this.deps.assets().resolveThumbnailUrl(path);
  }
  releaseImageUrl(path: string) {
    this.deps.assets().releaseImageUrl(path);
  }
  releaseThumbnailUrl(path: string) {
    if (!this.deps.isGuest()) this.deps.assets().releaseThumbnailUrl(path);
  }
  private resolveGuestImage(path: string): Promise<string> {
    return Promise.resolve(this.deps.resolveGuestImage(path) || "");
  }
}
