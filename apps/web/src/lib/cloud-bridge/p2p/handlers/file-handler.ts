import { BaseHandler, type P2PHandlerContext } from "./base-handler";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";

export class FileHandler extends BaseHandler {
  canHandle(message: P2PMessage): boolean {
    return message.type === "GET_FILE";
  }

  async handle(
    message: P2PMessage,
    connection: P2PConnection,
    context: P2PHandlerContext,
  ): Promise<void> {
    if (message.type !== "GET_FILE") return;

    const { path, requestId } = message;
    const { vault } = context;

    try {
      console.log(`[P2P Host] Handling file request for: ${path}`);
      const vaultHandle = await vault.getActiveVaultHandle();

      if (!vaultHandle) {
        console.error("[P2P Host] No active vault handle!");
        connection.send({ type: "FILE_RESPONSE", requestId, found: false });
        return;
      }

      const parts = path.split("/").filter((p) => p && p !== "." && p !== "..");
      let fileHandle: FileSystemFileHandle | undefined;

      try {
        if (parts.length === 1) {
          fileHandle = await vaultHandle.getFileHandle(parts[0]);
        } else if (parts[0] === "images" && parts.length === 2) {
          let imgDir: FileSystemDirectoryHandle | undefined;
          try {
            imgDir = await vaultHandle.getDirectoryHandle("images");
            fileHandle = await imgDir.getFileHandle(parts[1]);
          } catch {
            if (!imgDir) {
              connection.send({
                type: "FILE_RESPONSE",
                requestId,
                found: false,
              });
              return;
            }

            // Fuzzy match logic
            const requestedName = parts[1];
            if (requestedName.match(/\.(jpg|jpeg|png)$/i)) {
              const webpName = requestedName.replace(
                /\.(jpg|jpeg|png)$/i,
                ".webp",
              );
              fileHandle = await imgDir
                .getFileHandle(webpName)
                .catch(() => undefined);
            }

            if (!fileHandle) {
              const requestedBase =
                requestedName.substring(0, requestedName.lastIndexOf(".")) ||
                requestedName;
              const files = [];
              for await (const [name] of (imgDir as any).entries())
                files.push(name);
              const fuzzyMatch = files.find(
                (f) =>
                  f.startsWith(requestedBase) &&
                  (f.endsWith(".webp") ||
                    f.endsWith(".png") ||
                    f.endsWith(".jpg")),
              );
              if (fuzzyMatch) {
                fileHandle = await imgDir.getFileHandle(fuzzyMatch);
              }
            }
          }
        }
      } catch (err) {
        console.error(`[P2P Host] Error accessing path: ${path}`, err);
      }

      if (fileHandle) {
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();

        // FR-007: Binary/ArrayBuffer streaming with 16KB chunk size
        const CHUNK_SIZE = 16 * 1024;
        const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);

        if (totalChunks <= 1) {
          connection.send({
            type: "FILE_RESPONSE",
            requestId,
            found: true,
            mime: file.type,
            data: arrayBuffer,
            chunkIndex: 0,
            totalChunks: 1,
          });
        } else {
          for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
            const chunk = arrayBuffer.slice(start, end);

            connection.send({
              type: "FILE_RESPONSE",
              requestId,
              found: true,
              mime: file.type,
              data: chunk,
              chunkIndex: i,
              totalChunks,
            });

            // Brief yield to keep UI responsive if many chunks
            if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
          }
        }
      } else {
        connection.send({ type: "FILE_RESPONSE", requestId, found: false });
      }
    } catch (err) {
      console.error("[P2P Host] Failed to serve file:", path, err);
      connection.send({ type: "FILE_RESPONSE", requestId, found: false });
    }
  }
}
