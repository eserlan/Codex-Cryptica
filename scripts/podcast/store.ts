import { ASSET_URL } from "./episode";
import { runCommand, type CommandRunner } from "./audio";

export const BUCKET = "codex-cryptica-statics";
export const IMMUTABLE = "public, max-age=31536000, immutable";
/** Short-lived so Patreon's poller and our own reads see new episodes quickly. */
export const REVALIDATE = "public, max-age=60";

/** Public R2 objects under `assets.codexcryptica.com`, addressed by key. */
export interface PodcastStore {
  /** Byte length of a public object, or undefined when it does not exist. */
  size(key: string): Promise<number | undefined>;
  /** Text of a public object, or undefined when it does not exist. */
  read(key: string): Promise<string | undefined>;
  put(
    key: string,
    path: string,
    contentType: string,
    cacheControl: string,
  ): Promise<void>;
  /** Checks HEAD and a byte range the way a podcast client fetches them. */
  verify(key: string, bytes: number, contentType: string): Promise<void>;
}

export const publicUrl = (key: string): string => `${ASSET_URL}/${key}`;

const HEADERS = {
  "User-Agent": "CodexCrypticaPodcast/1.0",
  "Accept-Encoding": "identity",
};

export class R2PodcastStore implements PodcastStore {
  constructor(
    private readonly fetcher: typeof fetch = (input, init) =>
      fetch(input, init),
    private readonly run: CommandRunner = runCommand,
  ) {}

  /** A unique query bypasses the edge cache, so a stale or cached 404 is never trusted. */
  private fresh(key: string): string {
    return `${publicUrl(key)}?fresh=${Date.now()}`;
  }

  async size(key: string): Promise<number | undefined> {
    const response = await this.fetcher(this.fresh(key), {
      method: "HEAD",
      headers: HEADERS,
    });
    if (response.status === 404) return undefined;
    if (!response.ok)
      throw new Error(`HEAD ${key} returned HTTP ${response.status}`);
    const size = Number(response.headers.get("content-length"));
    if (!Number.isSafeInteger(size) || size <= 0)
      throw new Error(`HEAD ${key} returned no usable content length`);
    return size;
  }

  async read(key: string): Promise<string | undefined> {
    const response = await this.fetcher(this.fresh(key), { headers: HEADERS });
    // Anything but a clean 404 is an error: treating it as empty would let a
    // transient failure overwrite the episode index with a single episode.
    if (response.status === 404) return undefined;
    if (!response.ok)
      throw new Error(`GET ${key} returned HTTP ${response.status}`);
    return response.text();
  }

  async put(
    key: string,
    path: string,
    contentType: string,
    cacheControl: string,
  ): Promise<void> {
    if (!/^podcast\/answers\/[A-Za-z0-9._/-]+$/.test(key))
      throw new Error(`Refusing to write outside podcast/answers/: ${key}`);
    const output = await this.run([
      "bunx",
      "wrangler",
      "r2",
      "object",
      "put",
      `${BUCKET}/${key}`,
      "--file",
      path,
      "--content-type",
      contentType,
      "--cache-control",
      cacheControl,
      "--remote",
    ]);
    // stdout is reserved for the final JSON result line.
    if (output.trim()) console.error(output.trim());
  }

  async verify(key: string, bytes: number, contentType: string): Promise<void> {
    const url = this.fresh(key);
    const head = await this.fetcher(url, { method: "HEAD", headers: HEADERS });
    verifyResponse(head, "head", bytes, contentType);
    const range = await this.fetcher(url, {
      headers: { ...HEADERS, Range: "bytes=0-1023" },
    });
    verifyResponse(range, "range", bytes, contentType);
  }
}

export function verifyResponse(
  response: Response,
  kind: "head" | "range",
  bytes: number,
  contentType: string,
): void {
  const expected = kind === "head" ? 200 : 206;
  if (response.status !== expected)
    throw new Error(`${kind} returned HTTP ${response.status}`);
  if (
    !(response.headers.get("content-type") ?? "")
      .toLowerCase()
      .startsWith(contentType)
  )
    throw new Error(`${kind}: unexpected content type`);
  if (
    kind === "head" &&
    Number(response.headers.get("content-length")) !== bytes
  )
    throw new Error("head: incorrect content length");
  if (
    kind === "range" &&
    response.headers.get("content-range") !==
      `bytes 0-${Math.min(1023, bytes - 1)}/${bytes}`
  )
    throw new Error("range: invalid content range");
}
