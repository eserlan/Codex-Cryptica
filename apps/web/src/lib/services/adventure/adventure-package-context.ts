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

/** Keeps each session's pinned package in memory so turns load it once. */
export class AdventurePackageContextCache {
  private readonly cache = new Map<string, AdventureJsonV1>();

  constructor(
    private readonly loader: PackageLoader = (vaultId, hash) =>
      adventurePackageRepository.loadStored(vaultId, hash),
  ) {}

  private key(session: PackageSessionKey): string | undefined {
    const hash = session.sourcePackage?.hash;
    return hash ? `${session.id}:${hash}` : undefined;
  }

  peek(session: PackageSessionKey): AdventureJsonV1 | undefined {
    const key = this.key(session);
    return key ? this.cache.get(key) : undefined;
  }

  async load(session: PackageSessionKey): Promise<AdventureJsonV1> {
    const key = this.key(session);
    if (!key) throw new Error("adventure-package-unavailable");
    const cached = this.cache.get(key);
    if (cached) return cached;
    let stored: StoredAdventurePackage | null;
    try {
      stored = await this.loader(session.vaultId, session.sourcePackage!.hash);
    } catch {
      throw new Error("adventure-package-unavailable");
    }
    if (!stored) throw new Error("adventure-package-unavailable");
    this.cache.set(key, stored.package);
    return stored.package;
  }
}

export const adventurePackageContextCache = new AdventurePackageContextCache();
