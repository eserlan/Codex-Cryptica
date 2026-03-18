import { writeOpfsFile, readOpfsBlob } from "../../utils/opfs";

export interface IAssetIO {
  readBlob(path: string[], handle: FileSystemDirectoryHandle): Promise<Blob>;
  writeBlob(
    path: string[],
    blob: Blob,
    handle: FileSystemDirectoryHandle,
  ): Promise<void>;
}

export const assetIOAdapter: IAssetIO = {
  readBlob: (path, handle) => readOpfsBlob(path, handle),
  writeBlob: (path, blob, handle) =>
    writeOpfsFile(path, blob, handle, handle.name),
};
