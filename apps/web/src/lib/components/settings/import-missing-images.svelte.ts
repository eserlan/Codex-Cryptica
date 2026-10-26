import type { MissingImageReference, CCImportPackage } from "@codex/importer";
import { resolveMissingImage } from "@codex/importer";
import { pickDirectory, isFileSystemAccessSupported } from "$lib/utils/fs";
import type { notificationStore as defaultNotificationStore } from "$lib/stores/ui/notification.svelte";

export interface MissingImagesHandlerDeps {
  notificationStore: typeof defaultNotificationStore;
  getVaultFilesPackage: () => CCImportPackage | null;
  setVaultFilesPackage: (pkg: CCImportPackage) => void;
  getMissingImageRefs: () => MissingImageReference[];
  setMissingImageRefs: (refs: MissingImageReference[]) => void;
  reprepareVaultFilesSession: () => Promise<void>;
}

export class ImportMissingImagesHandler {
  private resolvingImagePaths = new Set<string>();

  constructor(private deps: MissingImagesHandlerDeps) {}

  handleAddMissingImageFile = async (
    ref: MissingImageReference,
    file: File,
  ) => {
    await this.applyMissingImageResolution(ref, { addedFile: file });
  };

  handleResolveMissingImageFromFolder = async (ref: MissingImageReference) => {
    if (!isFileSystemAccessSupported()) {
      this.deps.notificationStore.notify(
        "This browser can't grant folder access for locating missing images. Add the image file directly instead.",
        "error",
      );
      return;
    }

    let folderHandle: FileSystemDirectoryHandle;
    try {
      folderHandle = await pickDirectory({ mode: "read" });
    } catch {
      return; // user cancelled folder picker
    }

    await this.applyMissingImageResolution(ref, {
      sourceFolderHandle: folderHandle,
    });
  };

  private async applyMissingImageResolution(
    ref: MissingImageReference,
    input: { addedFile?: File; sourceFolderHandle?: FileSystemDirectoryHandle },
  ) {
    const pkg = this.deps.getVaultFilesPackage();
    if (!pkg) return;
    if (this.resolvingImagePaths.has(ref.path)) return;
    this.resolvingImagePaths.add(ref.path);

    try {
      const resolvedDrafts = await resolveMissingImage(ref, input);

      const updatedRefs = this.deps.getMissingImageRefs().map((r) =>
        r.path === ref.path
          ? {
              ...r,
              resolution: resolvedDrafts
                ? input.addedFile
                  ? ("added-directly" as const)
                  : ("resolved-from-folder" as const)
                : ("still-missing" as const),
            }
          : r,
      );
      this.deps.setMissingImageRefs(updatedRefs);

      if (!resolvedDrafts) return;

      this.deps.setVaultFilesPackage({
        ...pkg,
        assetDrafts: [...pkg.assetDrafts, ...resolvedDrafts],
      });

      await this.deps.reprepareVaultFilesSession();
    } finally {
      this.resolvingImagePaths.delete(ref.path);
    }
  }
}
