import { type ISyncBackend, type FileMetadata } from "./types";

export class SyncContentComparator {
  async compareContent(
    path: string,
    fsBackend: ISyncBackend,
    opfsBackend: ISyncBackend,
    fsMetadata?: FileMetadata,
    opfsMetadata?: FileMetadata,
    opfsBlob?: Blob,
    fsBlob?: Blob,
    signal?: AbortSignal,
  ): Promise<boolean> {
    try {
      if (signal?.aborted) throw new Error("AbortError");

      const fs =
        fsBlob ||
        (await fsBackend.download(
          path,
          typeof fsMetadata?.handle === "string"
            ? fsMetadata.handle
            : undefined,
        ));

      if (signal?.aborted) throw new Error("AbortError");

      const opfs =
        opfsBlob ||
        (await opfsBackend.download(
          path,
          typeof opfsMetadata?.handle === "string"
            ? opfsMetadata.handle
            : undefined,
        ));

      if (path.endsWith(".md") || path.endsWith(".markdown")) {
        const fsText = await fs.text();
        const opfsText = await opfs.text();
        return fsText === opfsText;
      }

      if (fs.size !== opfs.size) return false;

      const CHUNK_SIZE = 1024 * 1024; // 1 MiB
      for (let offset = 0; offset < fs.size; offset += CHUNK_SIZE) {
        if (signal?.aborted) throw new Error("AbortError");

        const end = Math.min(offset + CHUNK_SIZE, fs.size);
        const fsChunkBuf = await fs.slice(offset, end).arrayBuffer();
        const opfsChunkBuf = await opfs.slice(offset, end).arrayBuffer();

        if (fsChunkBuf.byteLength !== opfsChunkBuf.byteLength) return false;

        const fsArr = new Uint8Array(fsChunkBuf);
        const opfsArr = new Uint8Array(opfsChunkBuf);

        if (!fsArr.every((val, i) => val === opfsArr[i])) {
          return false;
        }
      }

      return true;
    } catch (err: any) {
      if (err.message === "AbortError") throw err;
      return false;
    }
  }
}
