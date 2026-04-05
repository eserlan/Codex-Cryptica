import { AssetManager } from "@codex/vault-engine";
import { p2pGuestService } from "../../cloud-bridge/p2p/guest-service";
import { uiStore } from "../ui.svelte";
import { base } from "$app/paths";

export interface AssetStoreDependencies {
  assetManager: AssetManager;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveSyncHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  isGuest: () => boolean;
}

export class AssetStore {
  constructor(private deps: AssetStoreDependencies) {}

  async resolveImageUrl(
    path: string,
    fileFetcher?: (path: string) => Promise<Blob>,
  ) {
    // If we are in guest mode, we need to fetch files from the host
    const effectiveFetcher =
      fileFetcher ||
      (this.deps.isGuest()
        ? (p: string) => p2pGuestService.getFile(p)
        : undefined);

    return this.deps.assetManager.resolveImageUrl(
      await this.deps.getActiveVaultHandle(),
      path,
      effectiveFetcher,
      await this.deps.getActiveSyncHandle(),
    );
  }

  releaseImageUrl(path: string) {
    this.deps.assetManager.releaseImageUrl(path);
  }

  async saveImageToVault(
    blob: Blob | File,
    entityId: string,
    originalName?: string,
  ) {
    return this.deps.assetManager.saveImageToVault(
      await this.deps.getActiveVaultHandle(),
      blob,
      entityId,
      originalName,
    );
  }

  async ensureAssetPersisted(
    path: string,
    vaultHandle: FileSystemDirectoryHandle,
  ) {
    // If we are in demo mode, we need a fetcher that knows how to find the sample images
    const fetcher = uiStore.activeDemoTheme
      ? async (p: string) => {
          const url = p.startsWith("vault-samples/")
            ? `${base}/${p}`
            : `${base}/vault-samples/${p}`;
          const r = await fetch(url);
          if (!r.ok) throw new Error(`Failed to fetch sample asset: ${url}`);
          return r.blob();
        }
      : undefined;

    return this.deps.assetManager.ensureAssetPersisted(
      path,
      vaultHandle,
      fetcher,
      await this.deps.getActiveSyncHandle(),
    );
  }

  clear() {
    this.deps.assetManager.clear();
  }
}
