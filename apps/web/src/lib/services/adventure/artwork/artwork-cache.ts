import { FetchSlots } from "./fetch-slots";

/** Stop waiting on storage, decoding or streams that do not honour abort themselves. */
function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("Artwork operation aborted"));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    operation
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

export interface ArtworkVariant {
  url: string;
  mime: "image/webp";
  bytes: number;
  width: number;
  height: number;
  sha256: string;
}
export interface ArtworkCacheDependencies {
  read(url: string): Promise<Blob | null>;
  write(url: string, blob: Blob): Promise<void>;
  touch?(url: string): Promise<void>;
  fetch(url: string, init: RequestInit): Promise<Response>;
  digest(bytes: ArrayBuffer): Promise<string>;
  dimensions(blob: Blob): Promise<{ width: number; height: number }>;
}
/** Validates bytes before use; storage policy and concurrency are composed separately. */
export class ArtworkCache {
  private readonly slots = new FetchSlots(2);
  private readonly inflight = new Map<
    string,
    {
      controller: AbortController;
      promise: Promise<Blob | null>;
      subscribers: number;
    }
  >();
  constructor(private readonly deps: ArtworkCacheDependencies) {}
  private async valid(blob: Blob, variant: ArtworkVariant): Promise<boolean> {
    if (blob.type !== variant.mime || blob.size !== variant.bytes) return false;
    try {
      const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
      if (
        header.length < 12 ||
        String.fromCharCode(...header.slice(0, 4)) !== "RIFF" ||
        String.fromCharCode(...header.slice(8, 12)) !== "WEBP"
      )
        return false;
      const dimensions = await this.deps.dimensions(blob);
      return (
        dimensions.width === variant.width &&
        dimensions.height === variant.height &&
        (await this.deps.digest(await blob.arrayBuffer())) === variant.sha256
      );
    } catch {
      return false;
    }
  }
  load(variant: ArtworkVariant, signal: AbortSignal): Promise<Blob | null> {
    if (signal.aborted) return Promise.resolve(null);
    const key = JSON.stringify([
      variant.url,
      variant.sha256,
      variant.bytes,
      variant.width,
      variant.height,
      variant.mime,
    ]);
    let entry = this.inflight.get(key);
    if (!entry) {
      const controller = new AbortController();
      const created = {
        controller,
        promise: Promise.resolve(null) as Promise<Blob | null>,
        subscribers: 0,
      };
      created.promise = this.loadUnshared(variant, controller.signal).finally(
        () => {
          if (this.inflight.get(key) === created) this.inflight.delete(key);
        },
      );
      entry = created;
      this.inflight.set(key, entry);
    }
    const shared = entry;
    shared.subscribers++;
    return new Promise((resolve) => {
      let finished = false;
      const finish = (value: Blob | null) => {
        if (finished) return;
        finished = true;
        signal.removeEventListener("abort", cancel);
        shared.subscribers--;
        if (shared.subscribers === 0 && this.inflight.get(key) === shared) {
          this.inflight.delete(key);
          shared.controller.abort();
        }
        resolve(value);
      };
      const cancel = () => finish(null);
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) cancel();
      void shared.promise.then(finish, () => finish(null));
    });
  }
  private async readCachedBlob(
    variant: ArtworkVariant,
    signal: AbortSignal,
  ): Promise<Blob | null> {
    const cached = await abortable(
      this.deps.read(variant.url).catch(() => null),
      signal,
    );
    if (!cached || !(await abortable(this.valid(cached, variant), signal))) {
      return null;
    }
    if (signal.aborted) return null;
    if (this.deps.touch) {
      await abortable(
        this.deps.touch(variant.url).catch(() => {}),
        signal,
      );
    }
    return signal.aborted ? null : cached;
  }

  private isAllowedVariant(
    variant: ArtworkVariant,
    signal: AbortSignal,
  ): boolean {
    if (signal.aborted || variant.bytes <= 0 || variant.bytes > 384 * 1024) {
      return false;
    }
    return /^https:\/\/assets\.codexcryptica\.com\/adventure-artwork\/[a-zA-Z0-9_/-]+\.webp$/.test(
      variant.url,
    );
  }

  private isValidStreamResponse(
    response: Response,
    mime: ArtworkVariant["mime"],
  ): boolean {
    if (!response.ok || response.type === "opaque" || !response.body) {
      return false;
    }
    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim();
    return contentType === mime;
  }

  private async readBoundedChunks(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    maxBytes: number,
    signal: AbortSignal,
  ): Promise<Uint8Array[] | null> {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await abortable(reader.read(), signal);
      if (part.done) return chunks;
      size += part.value.byteLength;
      if (signal.aborted || size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(part.value);
    }
  }

  private async readStreamedBlob(
    response: Response,
    variant: ArtworkVariant,
    signal: AbortSignal,
  ): Promise<Blob | null> {
    if (!this.isValidStreamResponse(response, variant.mime) || !response.body) {
      return null;
    }
    const reader = response.body.getReader();
    try {
      const chunks = await this.readBoundedChunks(
        reader,
        variant.bytes,
        signal,
      );
      return chunks
        ? new Blob(chunks as BlobPart[], { type: variant.mime })
        : null;
    } finally {
      if (signal.aborted) void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }

  private async validateAndWriteBlob(
    blob: Blob,
    variant: ArtworkVariant,
    signal: AbortSignal,
  ): Promise<Blob | null> {
    if (signal.aborted) return null;
    if (!(await abortable(this.valid(blob, variant), signal))) return null;
    if (signal.aborted) return null;
    await abortable(
      this.deps.write(variant.url, blob).catch(() => {}),
      signal,
    );
    return signal.aborted ? null : blob;
  }

  private async fetchAndCacheBlob(
    variant: ArtworkVariant,
    signal: AbortSignal,
  ): Promise<Blob | null> {
    const response = await abortable(
      this.deps.fetch(variant.url, {
        signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error",
      }),
      signal,
    );
    const blob = await this.readStreamedBlob(response, variant, signal);
    if (!blob) return null;
    return await this.validateAndWriteBlob(blob, variant, signal);
  }

  private async loadWithTimeout(
    variant: ArtworkVariant,
    signal: AbortSignal,
  ): Promise<Blob | null> {
    const cached = await this.readCachedBlob(variant, signal);
    if (cached) return cached;
    if (signal.aborted) return null;
    const release = await this.slots.acquire(signal);
    if (!release) return null;
    try {
      if (signal.aborted) return null;
      return await this.fetchAndCacheBlob(variant, signal);
    } finally {
      release();
    }
  }

  private async loadUnshared(
    variant: ArtworkVariant,
    signal: AbortSignal,
  ): Promise<Blob | null> {
    if (!this.isAllowedVariant(variant, signal)) return null;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 8000);
    try {
      return await this.loadWithTimeout(variant, controller.signal);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    }
  }
}
