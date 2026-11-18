import type {
  AdventureJsonV1,
  AdventureSession,
  StoredAdventurePackage,
} from "@codex/adventure-engine";
import { adventurePackageRepository } from "./adventure-package-storage.js";

type PackageLoader = (
  vaultId: string,
  hash: string,
) => Promise<StoredAdventurePackage | null>;

type PackageSessionKey = Pick<AdventureSession, "id" | "vaultId"> & {
  sourcePackage?: Pick<NonNullable<AdventureSession["sourcePackage"]>, "hash">;
};

const MAX_CACHED_PACKAGE_SESSIONS = 5;

/** Keeps each session's pinned package in memory so turns load it once. */
export class AdventurePackageContextCache {
  private readonly cache = new Map<string, AdventureJsonV1>();

  constructor(
    private readonly loader: PackageLoader = (vaultId, hash) =>
      adventurePackageRepository.loadStored(vaultId, hash),
  ) {}

  private key(session: PackageSessionKey): string | undefined {
    const hash = session.sourcePackage?.hash;
    return hash ? `${session.vaultId}:${session.id}:${hash}` : undefined;
  }

  peek(session: PackageSessionKey): AdventureJsonV1 | undefined {
    const key = this.key(session);
    if (!key) return undefined;
    const cached = this.cache.get(key);
    if (cached) this.touch(key, cached);
    return cached;
  }

  async load(session: PackageSessionKey): Promise<AdventureJsonV1> {
    const key = this.key(session);
    if (!key) throw new Error("adventure-package-unavailable");
    const cached = this.peek(session);
    if (cached) return cached;
    let stored: StoredAdventurePackage | null;
    try {
      stored = await this.loader(session.vaultId, session.sourcePackage!.hash);
    } catch {
      throw new Error("adventure-package-unavailable");
    }
    if (!stored) throw new Error("adventure-package-unavailable");
    this.touch(key, stored.package);
    return stored.package;
  }

  private touch(key: string, pkg: AdventureJsonV1): void {
    this.cache.delete(key);
    this.cache.set(key, pkg);
    while (this.cache.size > MAX_CACHED_PACKAGE_SESSIONS) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
  }
}

export const adventurePackageContextCache = new AdventurePackageContextCache();
