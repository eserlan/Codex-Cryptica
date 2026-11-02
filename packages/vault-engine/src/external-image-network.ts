import type { ImageProbe } from "./asset-types";
import { type Clock, systemClock } from "./runtime";
import { ExternalImageFiles, externalCacheName } from "./external-image-files";

/** An external image that has not answered by now is treated as unreachable. */
const EXTERNAL_FETCH_TIMEOUT_MS = 8_000;

/**
 * How long an unreachable external image is left alone. Long enough that a
 * graph re-sync does not retry every blocked image, short enough that an image
 * that was only briefly down is tried again.
 */
const EXTERNAL_FAILURE_TTL_MS = 5 * 60_000;

/**
 * How long an external image that could not be loaded at all is left alone
 * across sessions. A host that answers 404 without CORS headers never shows us
 * the status, so the link cannot be called dead (and is never deleted), but
 * asking again on every load only adds a console error each time. A link that
 * was merely down is tried again after this.
 */
const UNREACHABLE_TTL_MS = 24 * 60 * 60_000;

/**
 * How long a host that serves images but sends no CORS headers is remembered
 * across sessions. The CORS fetch for such a host can never succeed (and so a
 * thumbnail can never be made), but it fails with a console error for every
 * image on every load. A host that later adds CORS is noticed after this.
 */
const NO_CORS_HOST_TTL_MS = 7 * 24 * 60 * 60_000;

const probeImageLoad: ImageProbe = (url) =>
  new Promise((resolve) => {
    if (typeof Image === "undefined") return resolve("unknown");
    const image = new Image();
    const finish = (result: "loaded" | "failed" | "unknown") => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };
    const timer = setTimeout(
      () => finish("unknown"),
      EXTERNAL_FETCH_TIMEOUT_MS,
    );
    image.onload = () => finish("loaded");
    image.onerror = () => finish("failed");
    image.src = url;
  });

/** External-image fetching, host scouting, and expiring failure markers. */
export class ExternalImageNetwork {
  /**
   * When each unreachable external image last failed, by URL. `opaque` marks a
   * failure whose status was hidden from us (a network or CORS error), as
   * opposed to a timeout or an HTTP error we could read.
   */
  private failedExternal = new Map<
    string,
    {
      at: number;
      opaque: boolean;
      /** What loading it as a plain image showed, once that was asked. */
      probe?: "loaded" | "failed" | "unknown";
    }
  >();
  /** Hosts known to serve images without CORS headers, and when they were learned. */
  private corslessHosts = new Map<string, number>();
  /** Hosts whose marker has already been looked for on disk this session. */
  private corslessChecked = new Set<string>();
  /**
   * The first attempt at each host, so a batch of images from one host waits for
   * that one attempt to say whether the host allows CORS instead of every image
   * failing on its own.
   */
  private hostScouts = new Map<string, Promise<void>>();
  /**
   * When each URL was marked unreachable, so the marker is read from disk once.
   * Held with its time, not as a bare set, so it expires with the same
   * 24 hours as the marker file; reset by `clear()` like the other state.
   */
  private unreachableThisSession = new Map<string, number>();
  /** URLs confirmed to be permanently missing (404/410). */
  private deadExternal = new Set<string>();

  constructor(
    private files: ExternalImageFiles,
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
    private clock: Clock = systemClock,
    private onDeadExternalImage?: (url: string) => void,
    private probeImage: ImageProbe = probeImageLoad,
  ) {}

  setOnDeadExternalImage(handler: ((url: string) => void) | undefined) {
    this.onDeadExternalImage = handler;
  }

  isDeadExternal(url: string): boolean {
    return this.deadExternal.has(url);
  }

  private hasRecentFailure(url: string): boolean {
    const failure = this.failedExternal.get(url);
    if (failure === undefined) return false;
    if (this.clock.now() - failure.at < EXTERNAL_FAILURE_TTL_MS) return true;
    this.failedExternal.delete(url);
    return false;
  }

  async fetchExternal(
    url: string,
    vaultHandle?: FileSystemDirectoryHandle,
  ): Promise<Blob | null> {
    if (this.deadExternal.has(url) || this.hasRecentFailure(url)) return null;
    try {
      const response = await this.fetcher(url, {
        mode: "cors",
        signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.noteDeadStatus(url, response.status);
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.blob();
    } catch (error) {
      await this.recordFailure(url, error, vaultHandle);
      return null;
    }
  }

  private noteDeadStatus(url: string, status: number): void {
    if (status !== 404 && status !== 410) return;
    this.deadExternal.add(url);
    this.onDeadExternalImage?.(url);
  }

  private async recordFailure(
    url: string,
    error: unknown,
    vaultHandle?: FileSystemDirectoryHandle,
  ): Promise<void> {
    const failure: NonNullable<ReturnType<typeof this.failedExternal.get>> = {
      at: this.clock.now(),
      opaque: error instanceof TypeError,
    };
    this.failedExternal.set(url, failure);
    if (!failure.opaque || !vaultHandle) return;
    failure.probe = await this.probeImage(url);
    if (failure.probe === "loaded") {
      await this.markHostWithoutCors(vaultHandle, url);
    }
  }

  private async unreachableMarkerName(url: string): Promise<string> {
    return (await externalCacheName(url)).replace(/\.cache$/, ".unreachable");
  }

  async isMarkedUnreachable(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<boolean> {
    if (this.isFreshInSession(url)) return true;
    const markedAt = await this.readFreshMarker(
      vaultHandle,
      this.unreachableMarkerName(url),
    );
    if (markedAt === undefined) return false;
    this.unreachableThisSession.set(url, markedAt);
    return true;
  }

  private async readFreshMarker(
    root: FileSystemDirectoryHandle,
    name: Promise<string>,
    ttl: number = UNREACHABLE_TTL_MS,
  ): Promise<number | undefined> {
    try {
      const marker = await this.files.read(root, await name);
      const markedAt = Number(await marker.text());
      if (this.isFreshMarkerTime(markedAt, ttl)) return markedAt;
    } catch {
      // Missing or unreadable markers do not suppress an image.
    }
  }

  private isFreshMarkerTime(
    markedAt: number,
    ttl: number = UNREACHABLE_TTL_MS,
  ): boolean {
    if (!Number.isFinite(markedAt)) return false;
    const age = this.clock.now() - markedAt;
    return age >= 0 && age < ttl;
  }

  isFreshInSession(url: string): boolean {
    const markedAt = this.unreachableThisSession.get(url);
    if (markedAt === undefined) return false;
    if (this.isFreshMarkerTime(markedAt)) return true;
    this.unreachableThisSession.delete(url);
    return false;
  }

  async markUnreachable(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<void> {
    this.unreachableThisSession.set(url, this.clock.now());
    await this.files
      .write(
        vaultHandle,
        await this.unreachableMarkerName(url),
        String(this.clock.now()),
      )
      .catch(() => {});
  }

  cannotBeLoadedAtAll(url: string): boolean {
    return this.failedExternal.get(url)?.probe === "failed";
  }

  private hostOf(url: string): string | null {
    try {
      return new URL(url).host.toLowerCase() || null;
    } catch {
      return null;
    }
  }

  private async noCorsMarkerName(host: string): Promise<string> {
    return (await externalCacheName(`host:${host}`)).replace(
      /\.cache$/,
      ".nocors",
    );
  }

  private async isHostWithoutCors(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<boolean> {
    const host = this.hostOf(url);
    if (!host) return false;
    const learned = this.corslessHosts.get(host);
    if (learned !== undefined) {
      if (this.isFreshMarkerTime(learned, NO_CORS_HOST_TTL_MS)) return true;
      this.corslessHosts.delete(host);
    }
    if (this.corslessChecked.has(host)) return false;
    this.corslessChecked.add(host);
    const markedAt = await this.readFreshMarker(
      vaultHandle,
      this.noCorsMarkerName(host),
      NO_CORS_HOST_TTL_MS,
    );
    if (markedAt === undefined) return false;
    this.corslessHosts.set(host, markedAt);
    return true;
  }

  private async markHostWithoutCors(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<void> {
    const host = this.hostOf(url);
    if (!host) return;
    const now = this.clock.now();
    this.corslessHosts.set(host, now);
    this.corslessChecked.add(host);
    await this.files
      .write(vaultHandle, await this.noCorsMarkerName(host), String(now))
      .catch(() => {});
  }

  async fetchFromHost(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<Blob | null> {
    const host = this.hostOf(url);
    if (!host) return this.fetchExternal(url, vaultHandle);

    const scout = this.hostScouts.get(host);
    if (scout) {
      await scout;
      if (await this.isHostWithoutCors(vaultHandle, url)) return null;
      return this.fetchExternal(url, vaultHandle);
    }

    // Become the scout before any await, so an image that arrives while this
    // one is still reading the marker from disk waits instead of also trying.
    let finished!: () => void;
    this.hostScouts.set(
      host,
      new Promise<void>((resolve) => (finished = resolve)),
    );
    try {
      if (await this.isHostWithoutCors(vaultHandle, url)) return null;
      return await this.fetchExternal(url, vaultHandle);
    } finally {
      finished();
    }
  }

  clear() {
    this.failedExternal.clear();
    this.corslessHosts.clear();
    this.corslessChecked.clear();
    this.hostScouts.clear();
    this.deadExternal.clear();
    this.unreachableThisSession.clear();
  }
}
