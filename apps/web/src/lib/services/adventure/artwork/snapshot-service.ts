import type { ArtworkAssociation } from "schema";
type Snapshot = Extract<
  NonNullable<ArtworkAssociation["override"]>,
  { kind: "snapshot" }
>;
interface Dependencies {
  id(): string;
  /** Must atomically fail if the path already exists. */
  writeNew(path: string, blob: Blob): Promise<void>;
  read(path: string): Promise<Blob>;
  remove(path: string): Promise<void>;
  dimensions(blob: Blob): Promise<{ width: number; height: number }>;
  digest(data: ArrayBuffer): Promise<string>;
}
function validSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  if (mime === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/webp")
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  return false;
}
const MIME_EXTENSIONS: Record<string, "png" | "jpg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function isValidImageBlob(source: Blob, signal: AbortSignal): boolean {
  return !signal.aborted && source.size >= 1 && source.size <= 16 * 1024 * 1024;
}

function resolveExtension(
  source: Blob,
  signal: AbortSignal,
): "png" | "jpg" | "webp" {
  const ext = MIME_EXTENSIONS[source.type] ?? null;
  if (!ext || !isValidImageBlob(source, signal)) {
    throw new Error("Invalid image");
  }
  return ext;
}

function isValidDimensions(width: number, height: number): boolean {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) {
    return false;
  }
  return width >= 1 && height >= 1 && width * height <= 32_000_000;
}

/** Copies exact private bytes; cleanup is limited to this new uncommitted path. */
export class ArtworkSnapshotService {
  constructor(private readonly deps: Dependencies) {}
  private async readVerifiedBytes(source: Blob): Promise<ArrayBuffer> {
    const data = await source.arrayBuffer();
    if (!validSignature(new Uint8Array(data), source.type)) {
      throw new Error("Invalid image signature");
    }
    return data;
  }
  private async readVerifiedDimensions(
    source: Blob,
    signal: AbortSignal,
  ): Promise<{ width: number; height: number }> {
    const { width, height } = await this.deps.dimensions(source);
    if (!isValidDimensions(width, height) || signal.aborted) {
      throw new Error("Invalid image dimensions");
    }
    return { width, height };
  }
  private async computeDigestAndId(
    data: ArrayBuffer,
    signal: AbortSignal,
  ): Promise<{ sha256: string; id: string }> {
    const sha256 = await this.deps.digest(data);
    if (!/^[a-f0-9]{64}$/.test(sha256) || signal.aborted) {
      throw new Error("Invalid image digest");
    }
    const id = this.deps.id();
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error("Invalid image identifier");
    }
    return { sha256, id };
  }
  private async verifyWrittenCopy(
    path: string,
    expectedSize: number,
    sha256: string,
    signal: AbortSignal,
  ): Promise<void> {
    const copy = await this.deps.read(path);
    if (copy.size !== expectedSize || signal.aborted) {
      throw new Error("Snapshot verification failed");
    }
    const copyDigest = await this.deps.digest(await copy.arrayBuffer());
    if (copyDigest !== sha256 || signal.aborted) {
      throw new Error("Snapshot verification failed");
    }
  }
  private async writeAndVerify(
    path: string,
    source: Blob,
    sha256: string,
    signal: AbortSignal,
  ): Promise<void> {
    await this.deps.writeNew(path, source);
    try {
      await this.verifyWrittenCopy(path, source.size, sha256, signal);
    } catch (error) {
      await this.deps.remove(path).catch(() => {});
      throw error;
    }
  }
  async preserve(source: Blob, signal: AbortSignal): Promise<Snapshot> {
    const ext = resolveExtension(source, signal);
    const data = await this.readVerifiedBytes(source);
    const { width, height } = await this.readVerifiedDimensions(source, signal);
    const { sha256, id } = await this.computeDigestAndId(data, signal);
    const path = `images/artwork_${id}.${ext}`;
    await this.writeAndVerify(path, source, sha256, signal);
    return {
      kind: "snapshot",
      path,
      mime: source.type as Snapshot["mime"],
      bytes: source.size,
      width,
      height,
      sha256,
    };
  }
}
