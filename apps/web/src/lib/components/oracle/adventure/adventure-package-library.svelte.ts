import type { StoredAdventurePackage } from "@codex/adventure-engine";
import type {
  AdventureArchiveEntry,
  AdventureListResult,
} from "#lib/services/adventure/adventure-session-repository.js";

interface LibraryDependencies {
  getVaultId: () => string;
  isReady: () => boolean;
  isGuest: () => boolean;
  listPackages: (vaultId: string) => Promise<StoredAdventurePackage[]>;
  listSessions: (vaultId: string) => Promise<AdventureListResult>;
  open: (vaultId: string, sessionId: string) => Promise<unknown>;
  resumeArchived: (vaultId: string, sessionId: string) => Promise<unknown>;
  removeApproved: (
    vaultId: string,
    hash: string,
    pinnedHashes: ReadonlySet<string>,
  ) => Promise<
    | { status: "removed"; hash: string; path: string }
    | { status: "refused"; hash: string; path: string; reason: string }
  >;
}

function pinnedSessions(entries: AdventureArchiveEntry[]) {
  const byHash = new Map<string, AdventureArchiveEntry[]>();
  for (const entry of entries) {
    if (entry.loadCondition !== "normal" || !entry.sourcePackage?.hash)
      continue;
    const list = byHash.get(entry.sourcePackage.hash) ?? [];
    list.push(entry);
    byHash.set(entry.sourcePackage.hash, list);
  }
  return byHash;
}

/** Per-surface package catalogue and resume progress; no draft or session ownership. */
export class AdventurePackageLibrary {
  packages = $state<StoredAdventurePackage[]>([]);
  pinnedByHash = $state<Map<string, AdventureArchiveEntry[]>>(new Map());
  resumingId = $state<string | null>(null);
  resumeError = $state<string | null>(null);
  removingHash = $state<string | null>(null);
  removalMessage = $state<string | null>(null);
  removalError = $state<string | null>(null);
  private loadToken = 0;

  constructor(private readonly deps: LibraryDependencies) {}

  private clear(): void {
    this.packages = [];
    this.pinnedByHash = new Map();
  }

  reset(): void {
    this.clear();
    this.loadToken += 1;
  }

  private isCurrent(token: number, vaultId: string): boolean {
    return token === this.loadToken && vaultId === this.deps.getVaultId();
  }

  async refresh(vaultId = this.deps.getVaultId()): Promise<void> {
    if (!this.deps.isReady() || this.deps.isGuest()) {
      this.clear();
      return;
    }
    const token = ++this.loadToken;
    try {
      const [packages, sessions] = await Promise.all([
        this.deps.listPackages(vaultId),
        this.deps.listSessions(vaultId),
      ]);
      if (!this.isCurrent(token, vaultId)) return;
      this.packages = packages;
      this.pinnedByHash = pinnedSessions(sessions.entries);
    } catch {
      if (this.isCurrent(token, vaultId)) this.clear();
    }
  }

  resume = async (entry: AdventureArchiveEntry): Promise<void> => {
    if (this.resumingId) return;
    this.resumingId = entry.id;
    this.resumeError = null;
    try {
      const vaultId = this.deps.getVaultId();
      if (entry.status === "archived")
        await this.deps.resumeArchived(vaultId, entry.id);
      else await this.deps.open(vaultId, entry.id);
    } catch (error) {
      this.resumeError =
        error instanceof Error
          ? error.message
          : "Unable to resume this adventure.";
    } finally {
      this.resumingId = null;
    }
  };

  remove = async (item: StoredAdventurePackage): Promise<void> => {
    if (this.removingHash) return;
    const vaultId = this.deps.getVaultId();
    this.removingHash = item.hash;
    this.removalMessage = null;
    this.removalError = null;
    try {
      const result = await this.deps.removeApproved(
        vaultId,
        item.hash,
        new Set(this.pinnedByHash.keys()),
      );
      if (vaultId !== this.deps.getVaultId()) return;
      if (result.status === "refused") {
        this.removalError = result.reason;
        return;
      }
      this.removalMessage = `Removed "${item.package.title}" v${item.package.version}.`;
      await this.refresh(vaultId);
    } catch (error) {
      if (vaultId === this.deps.getVaultId())
        this.removalError =
          error instanceof Error
            ? error.message
            : "Unable to remove this approved package version.";
    } finally {
      if (vaultId === this.deps.getVaultId()) this.removingHash = null;
    }
  };
}
