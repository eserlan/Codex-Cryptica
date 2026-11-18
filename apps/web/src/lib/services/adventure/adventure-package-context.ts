import {
  checkAdventurePackagePin,
  type AdventureJsonV1,
  type AdventureSession,
  type StoredAdventurePackage,
} from "@codex/adventure-engine";
import { adventurePackageRepository } from "./adventure-package-storage.js";

type PackageLoader = (
  vaultId: string,
  hash: string,
) => Promise<StoredAdventurePackage | null>;

type ApprovedLister = (vaultId: string) => Promise<StoredAdventurePackage[]>;

export type PackagePinStatus =
  | { status: "available" }
  | {
      status: "unavailable";
      reason: "missing" | "unreadable" | "mismatch";
      otherVersionAvailable: boolean;
    };

type PackageSessionKey = Pick<AdventureSession, "id" | "vaultId"> & {
  sourcePackage?: Pick<NonNullable<AdventureSession["sourcePackage"]>, "hash">;
};

/** Keeps each session's pinned package in memory so turns load it once. */
export class AdventurePackageContextCache {
  private readonly cache = new Map<string, AdventureJsonV1>();

  constructor(
    private readonly loader: PackageLoader = (vaultId, hash) =>
      adventurePackageRepository.loadStored(vaultId, hash),
    private readonly listApproved: ApprovedLister = (vaultId) =>
      adventurePackageRepository.listApproved(vaultId),
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

  /**
   * Re-reads the pinned package (never from the cache) and checks it still
   * matches the session's pin. The session itself is never changed.
   */
  async verifyPin(
    session: PackageSessionKey & Pick<AdventureSession, "sourcePackage">,
  ): Promise<PackagePinStatus> {
    const ref = session.sourcePackage!;
    const key = this.key(session)!;
    let stored: StoredAdventurePackage | null;
    try {
      stored = await this.loader(session.vaultId, ref.hash);
    } catch {
      return this.unavailable(session, key, "unreadable");
    }
    const check = checkAdventurePackagePin(ref, stored);
    if (!check.ok) return this.unavailable(session, key, check.reason);
    this.cache.set(key, stored!.package);
    return { status: "available" };
  }

  private async unavailable(
    session: PackageSessionKey & Pick<AdventureSession, "sourcePackage">,
    key: string,
    reason: "missing" | "unreadable" | "mismatch",
  ): Promise<PackagePinStatus> {
    this.cache.delete(key);
    return {
      status: "unavailable",
      reason,
      otherVersionAvailable: await this.hasOtherVersion(session),
    };
  }

  private async hasOtherVersion(
    session: Pick<AdventureSession, "vaultId" | "sourcePackage">,
  ): Promise<boolean> {
    const ref = session.sourcePackage!;
    try {
      const approved = await this.listApproved(session.vaultId);
      return approved.some(
        (entry) =>
          entry.package.id === ref.packageId && entry.hash !== ref.hash,
      );
    } catch {
      return false;
    }
  }
}

export const adventurePackageContextCache = new AdventurePackageContextCache();
