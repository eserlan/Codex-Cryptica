import type { IAssetIOAdapter, IImageProcessor } from "./asset-manager";

type Job = {
  root: FileSystemDirectoryHandle;
  path: string[];
  source: Blob;
  generation: number;
};

/** Derived artwork, with foreground reads separated from background generation. */
export class LocalThumbnailCache {
  private directories = new WeakMap<
    FileSystemDirectoryHandle,
    Map<string, Promise<FileSystemDirectoryHandle>>
  >();
  private jobs = new Map<string, Job>();
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private running = false;

  constructor(
    private io: IAssetIOAdapter,
    private processor: IImageProcessor,
    private canGenerate: () => boolean = () => true,
  ) {}

  private directory(
    root: FileSystemDirectoryHandle,
    path: string[],
    create = false,
  ) {
    if (!path.length) return Promise.resolve(root);
    let cache = this.directories.get(root);
    if (!cache) {
      cache = new Map();
      this.directories.set(root, cache);
    }
    const key = path.join("/");
    const existing = cache.get(key);
    if (existing) return existing;
    const pending = this.io.getDirectoryHandle(root, path, create);
    cache.set(key, pending);
    void pending.catch(() => cache?.delete(key));
    return pending;
  }

  private async read(root: FileSystemDirectoryHandle, path: string[]) {
    const directory = await this.directory(root, path.slice(0, -1));
    return this.io.readOpfsBlob([path[path.length - 1]], directory);
  }

  async resolve(
    root: FileSystemDirectoryHandle,
    path: string,
    fallback?: FileSystemDirectoryHandle,
  ): Promise<Blob> {
    const generation = this.generation;
    const segments = path
      .replace(/^(\.\/|\/)/, "")
      .split("/")
      .filter(Boolean);
    let source: Blob;
    try {
      source = await this.read(root, segments);
    } catch (error) {
      if (!fallback) throw error;
      source = await this.read(fallback, segments);
    }
    if (generation !== this.generation || /_thumb\.webp$/i.test(path))
      return source;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    // File metadata needs no original-image payload read. Non-file adapters use a hash.
    const revision =
      "lastModified" in source
        ? `${(source as File).lastModified}:${source.size}`
        : await hash(await source.arrayBuffer());
    const name = await hash(
      new TextEncoder().encode(`${path}:${revision}:v1:200`),
    );
    const cachePath = [".cache", "local_thumbnails", `${name}.webp`];
    try {
      const cached = await this.read(root, cachePath);
      this.schedule();
      return cached;
    } catch {
      if (generation === this.generation) {
        this.jobs.set(`${root.name}:${name}`, {
          root,
          path: cachePath,
          source,
          generation,
        });
        this.schedule();
      }
      // Painting an existing image must never wait for derived artwork.
      return source;
    }
  }

  private schedule(delay = 500) {
    if (this.timer !== undefined || this.running || !this.jobs.size) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.generateNext();
    }, delay);
  }

  private async generateNext() {
    if (!this.canGenerate()) {
      this.schedule();
      return;
    }
    const entry = this.jobs.entries().next().value;
    if (!entry) return;
    const [key, job] = entry;
    this.jobs.delete(key);
    this.running = true;
    try {
      const thumbnail = await this.processor.generateThumbnail(job.source, 200);
      if (job.generation !== this.generation) return;
      // Keep paths relative to the vault for the adapter's sync fingerprints.
      await this.io.writeOpfsFile(job.path, thumbnail, job.root, job.root.name);
    } catch {
      // Originals remain usable if decoding or persistent storage fails.
    } finally {
      this.running = false;
      this.schedule(16);
    }
  }

  clear() {
    this.generation++;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.jobs.clear();
    this.directories = new WeakMap();
  }
}

async function hash(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
