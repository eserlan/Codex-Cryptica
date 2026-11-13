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
/** Copies exact private bytes; cleanup is limited to this new uncommitted path. */
export class ArtworkSnapshotService {
  constructor(private readonly deps: Dependencies) {}
  async preserve(source: Blob, signal: AbortSignal): Promise<Snapshot> {
    const ext =
      source.type === "image/png"
        ? "png"
        : source.type === "image/jpeg"
          ? "jpg"
          : source.type === "image/webp"
            ? "webp"
            : null;
    if (
      !ext ||
      source.size < 1 ||
      source.size > 16 * 1024 * 1024 ||
      signal.aborted
    )
      throw new Error("Invalid image");
    const data = await source.arrayBuffer();
    if (!validSignature(new Uint8Array(data), source.type))
      throw new Error("Invalid image signature");
    const { width, height } = await this.deps.dimensions(source);
    if (
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width < 1 ||
      height < 1 ||
      width * height > 32_000_000 ||
      signal.aborted
    )
      throw new Error("Invalid image dimensions");
    const sha256 = await this.deps.digest(data);
    if (!/^[a-f0-9]{64}$/.test(sha256) || signal.aborted)
      throw new Error("Invalid image digest");
    const id = this.deps.id();
    if (!/^[a-zA-Z0-9_-]+$/.test(id))
      throw new Error("Invalid image identifier");
    const path = `images/artwork_${id}.${ext}`;
    await this.deps.writeNew(path, source);
    try {
      const copy = await this.deps.read(path);
      if (
        copy.size !== source.size ||
        (await this.deps.digest(await copy.arrayBuffer())) !== sha256 ||
        signal.aborted
      )
        throw new Error("Snapshot verification failed");
      return {
        kind: "snapshot",
        path,
        mime: source.type as Snapshot["mime"],
        bytes: source.size,
        width,
        height,
        sha256,
      };
    } catch (error) {
      await this.deps.remove(path).catch(() => {});
      throw error;
    }
  }
}
