import { loadPublishRegistryFromDisk } from "./io";
import { getPublishRegistry, savePublishRegistry } from "./registry";

/** Reconciles disk publication metadata and notifies independently registered loaders. */
export class PublishRegistryLoader {
  #loaders = new Set<
    (vId: string, handle: FileSystemDirectoryHandle) => Promise<void>
  >();

  register(
    loader: (vId: string, handle: FileSystemDirectoryHandle) => Promise<void>,
  ): () => void {
    this.#loaders.add(loader);
    return () => {
      this.#loaders.delete(loader);
    };
  }

  async load(vId: string, handle: FileSystemDirectoryHandle) {
    try {
      const diskRegistry = await loadPublishRegistryFromDisk(handle);
      if (diskRegistry) {
        const idbRegistry = await getPublishRegistry(vId);
        if (
          !idbRegistry ||
          diskRegistry.publishedAt > (idbRegistry.publishedAt ?? "")
        ) {
          await savePublishRegistry(diskRegistry);
        }
      }
    } catch (e) {
      console.error(
        "[Vault] Failed to reconcile publish registry from disk:",
        e,
      );
    }
    for (const loader of this.#loaders) {
      try {
        await loader(vId, handle);
      } catch (e) {
        console.error("[Vault] Publish registry loader failed:", e);
      }
    }
  }
}
