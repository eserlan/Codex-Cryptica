import type { P2PClientTransport } from "./transport/client-transport";
import { systemClock } from "$lib/utils/runtime-deps";

const FILE_REQUEST_TIMEOUT_MS = 15_000;

type RequestState = {
  chunks: ArrayBuffer[];
  receivedCount: number;
  totalChunks: number;
  mime: string;
};

/**
 * Out-of-band request/response client for guest file fetches. Subscribes to
 * the transport directly so the main dispatcher never sees file traffic, and
 * reassembles `FILE_RESPONSE` chunks into a single Blob per request.
 */
export class GuestFileClient {
  constructor(private readonly transport: P2PClientTransport) {}

  async getFile(path: string): Promise<Blob> {
    if (!this.transport.connected) {
      throw new Error("Not connected to host");
    }

    const requestId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `req-${systemClock.now()}-${Math.random()}`;

    return new Promise<Blob>((resolve, reject) => {
      let state: RequestState | null = null;
      let settled = false;

      const cleanup = () => {
        this.transport.off("data", handler);
        this.transport.off("close", onClose);
        this.transport.off("error", onError);
        clearTimeout(timeoutHandle);
      };

      const settleResolve = (blob: Blob) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(blob);
      };

      const settleReject = (err: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      };

      const timeoutHandle = setTimeout(
        () => settleReject(new Error("File request timed out")),
        FILE_REQUEST_TIMEOUT_MS,
      );

      const handler = (data: any) => {
        if (data?.type !== "FILE_RESPONSE" || data.requestId !== requestId) {
          return;
        }

        if (!data.found) {
          settleReject(new Error("File not found on host"));
          return;
        }

        const totalChunks: number = data.totalChunks ?? 1;
        const chunkIndex: number = data.chunkIndex ?? 0;
        const mime: string = data.mime || "application/octet-stream";

        if (totalChunks === 1) {
          settleResolve(new Blob([data.data], { type: mime }));
          return;
        }

        if (!state) {
          state = {
            chunks: new Array(totalChunks),
            receivedCount: 0,
            totalChunks,
            mime,
          };
        }

        if (!state.chunks[chunkIndex]) {
          state.chunks[chunkIndex] = data.data;
          state.receivedCount++;
        }

        if (state.receivedCount === state.totalChunks) {
          settleResolve(new Blob(state.chunks, { type: state.mime }));
        }
      };

      const onClose = () =>
        settleReject(new Error("Transport closed during file request"));
      const onError = () =>
        settleReject(new Error("Transport error during file request"));

      this.transport.on("data", handler);
      this.transport.on("close", onClose);
      this.transport.on("error", onError);

      this.transport.send({ type: "GET_FILE", path, requestId });
    });
  }
}
