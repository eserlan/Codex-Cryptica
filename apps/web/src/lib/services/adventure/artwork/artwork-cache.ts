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

  private async readStreamedBlob(
    response: Response,
    variant: ArtworkVariant,
    signal: AbortSignal,
  ): Promise<Blob | null> {
    if (
      !response.ok ||
      response.type === "opaque" ||
      response.headers.get("content-type")?.split(";")[0].trim() !==
        variant.mime ||
      !response.body
    )
      return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await abortable(reader.read(), signal);
        if (part.done) break;
        size += part.value.byteLength;
        if (signal.aborted || size > variant.bytes) {
          await reader.cancel();
          return null;
        }
        chunks.push(part.value);
      }
    } finally {
      if (signal.aborted) void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    return new Blob(chunks as BlobPart[], { type: variant.mime });
  }

  private async loadUnshared(
    variant: ArtworkVariant,
    signal: AbortSignal,
  ): Promise<Blob | null> {
    if (
      signal.aborted ||
      variant.bytes <= 0 ||
      variant.bytes > 384 * 1024 ||
      !/^https:\/\/assets\.codexcryptica\.com\/adventure-artwork\/[a-zA-Z0-9_/-]+\.webp$/.test(
        variant.url,
      )
    )
      return null;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 8000);
    let release: (() => void) | null = null;
    try {
      const cached = await this.readCachedBlob(variant, controller.signal);
      if (cached) return cached;
      if (controller.signal.aborted) return null;
      release = await this.slots.acquire(controller.signal);
      if (!release || controller.signal.aborted) return null;
      const response = await abortable(
        this.deps.fetch(variant.url, {
          signal: controller.signal,
          credentials: "omit",
          referrerPolicy: "no-referrer",
          redirect: "error",
        }),
        controller.signal,
      );
      const blob = await this.readStreamedBlob(
        response,
        variant,
        controller.signal,
      );
      if (
        !blob ||
        controller.signal.aborted ||
        !(await abortable(this.valid(blob, variant), controller.signal)) ||
        controller.signal.aborted
      )
        return null;
      await abortable(
        this.deps.write(variant.url, blob).catch(() => {}),
        controller.signal,
      );
      return controller.signal.aborted ? null : blob;
    } catch {
      return null;
    } finally {
      release?.();
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    }
  }
}
