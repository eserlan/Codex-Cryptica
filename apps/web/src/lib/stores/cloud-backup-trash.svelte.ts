import {
  fetchCloudBackupTrash,
  fetchCloudBackupTrashItem,
  type CloudBackupTrashItem,
  type CloudBackupTrashItemOutcome,
  type WholeItem,
} from "@codex/cloud-backup-sync";
import type { DurableVaultChange } from "./vault/registry";
import { createAssetDownloader } from "./cloud-backup-downloader";
import type {
  AssetDownload,
  CloudBackupDepsProvider,
} from "./cloud-backup-types";

export type TrashLoadState =
  "idle" | "loading" | "ready" | "unsupported" | "failed";

type Outcome = "restored" | "gone" | "failed";

type KeptItem = Extract<CloudBackupTrashItemOutcome, { kind: "entity" }>;

/** Lists the shared trash and restores entities, maps and canvases from it on this device. */
export class CloudBackupTrash {
  items = $state<CloudBackupTrashItem[]>([]);
  usedBytes = $state<number | null>(null);
  maxBytes = $state<number | null>(null);
  loadState = $state<TrashLoadState>("idle");
  loadedVaultId = $state<string | null>(null);
  /** Ids being restored right now. Replaced, never mutated, so views update. */
  restoring = $state<ReadonlySet<string>>(new Set());

  /** What the last restore did, for the panel to say. */
  result = $state<{ outcome: Outcome; title: string } | null>(null);
  resultVaultId = $state<string | null>(null);
  private loadRequest = 0;

  constructor(
    private getDeps: CloudBackupDepsProvider,
    private recordChanged: (
      vaultId: string,
      change: DurableVaultChange,
    ) => Promise<void>,
  ) {}

  async load(vaultId: string): Promise<void> {
    const deps = this.getDeps();
    if (!deps) return;
    const request = ++this.loadRequest;
    this.prepareLoad(vaultId);
    this.loadState = "loading";
    const outcome = await fetchCloudBackupTrash(deps.runtime, vaultId);
    if (!this.isCurrentLoad(request, vaultId, deps.activeVaultId())) return;
    this.loadedVaultId = vaultId;
    this.applyLoadOutcome(outcome);
  }

  private prepareLoad(vaultId: string): void {
    if (this.loadedVaultId !== vaultId) {
      this.items = [];
      this.usedBytes = null;
      this.maxBytes = null;
      this.loadedVaultId = null;
    }
    if (this.result && this.resultVaultId !== vaultId) {
      this.result = null;
      this.resultVaultId = null;
    }
  }

  private isCurrentLoad(
    request: number,
    vaultId: string,
    activeVaultId: string | null,
  ): boolean {
    return request === this.loadRequest && activeVaultId === vaultId;
  }

  private applyLoadOutcome(
    outcome: Awaited<ReturnType<typeof fetchCloudBackupTrash>>,
  ): void {
    if (outcome.kind === "items") {
      this.items = outcome.items;
      this.usedBytes = outcome.usedBytes ?? null;
      this.maxBytes = outcome.maxBytes ?? null;
      this.loadState = "ready";
    } else {
      this.items = [];
      this.usedBytes = null;
      this.maxBytes = null;
      this.loadState =
        outcome.kind === "unsupported"
          ? "unsupported"
          : outcome.kind === "off"
            ? "idle"
            : "failed";
    }
  }

  /** Brings the items back. Returns how many were restored. */
  async restore(vaultId: string, ids: readonly string[]): Promise<number> {
    const deps = this.getDeps();
    if (!deps?.remote || !deps.base) return 0;
    const outcomes: Outcome[] = [];
    for (const id of ids) {
      if (this.restoring.has(id) || deps.activeVaultId() !== vaultId) continue;
      outcomes.push(await this.restoreTracked(vaultId, id));
    }
    const restored = outcomes.filter((outcome) => outcome === "restored");
    if (restored.length > 0 || outcomes.includes("gone")) {
      await this.load(vaultId);
    }
    return restored.length;
  }

  private async restoreTracked(vaultId: string, id: string): Promise<Outcome> {
    this.setRestoring(id, true);
    const title = this.items.find((item) => item.id === id)?.title.trim();
    try {
      const outcome = await this.restoreOne(vaultId, id);
      this.result = { outcome, title: title || "Untitled" };
      this.resultVaultId = vaultId;
      return outcome;
    } finally {
      this.setRestoring(id, false);
    }
  }

  private setRestoring(id: string, on: boolean): void {
    const next = new Set(this.restoring);
    if (on) next.add(id);
    else next.delete(id);
    this.restoring = next;
  }

  private async restoreOne(vaultId: string, id: string): Promise<Outcome> {
    const deps = this.getDeps()!;
    const item = await fetchCloudBackupTrashItem(deps.runtime, vaultId, id);
    if (item.kind === "gone") return "gone";
    if (item.kind === "failed") return "failed";
    try {
      const kind = item.tombstone.kind;
      if (kind) return await this.restoreWhole(vaultId, kind, item);
      const { remote, base } = deps;
      const existing = await remote!.readLocal(vaultId, [id]);
      if (existing[id]) {
        // The local copy may be newer; pushing it clears the tombstone too.
        await this.recordChanged(vaultId, { kind: "entity", ids: [id] });
        return "restored";
      }
      await base!.recordSent(vaultId, [], [id]);
      await remote!.apply(vaultId, {
        creates: [item.entity as never],
        updates: [],
        deletes: [],
      });
    } catch (error) {
      console.warn("[CloudBackup] Could not restore from the trash", error);
      return "failed";
    }
    await this.fetchAssets(
      vaultId,
      item.entity as { id: string; title: string },
    );
    return "restored";
  }

  /** Brings a map or canvas back, with the files a map carried. */
  private async restoreWhole(
    vaultId: string,
    kind: "map" | "canvas",
    item: KeptItem,
  ): Promise<Outcome> {
    const { remote, base } = this.getDeps()!;
    const id = item.entity.id;
    const existing = await remote!.readLocalWhole(vaultId, kind, [id]);
    const change: DurableVaultChange =
      kind === "map"
        ? { kind: "maps", ids: [id] }
        : { kind: "canvas", ids: [id] };
    if (!existing[id]) {
      await base!.recordSentWhole(vaultId, kind, [], [id]);
      const applied = await remote!.applyWhole(
        vaultId,
        kind,
        {
          copies: [],
          writes: [{ item: item.entity as WholeItem, assets: item.assets }],
          deletes: [],
        },
        (await this.downloader(vaultId)) ?? (async () => null),
      );
      if (applied.failed.length > 0) {
        console.warn(
          "[CloudBackup] Could not restore map files",
          applied.failed,
        );
      }
    }
    // The next push clears the tombstone.
    await this.recordChanged(vaultId, change);
    return "restored";
  }

  /** Fetches one stored file with this vault's credentials; null on any failure. */
  private downloader(vaultId: string): Promise<AssetDownload | null> {
    return createAssetDownloader(this.getDeps()!.runtime, vaultId);
  }

  /** Downloads the restored entity's images; a failure never fails the restore. */
  private async fetchAssets(
    vaultId: string,
    entity: { id: string; title: string },
  ): Promise<void> {
    const deps = this.getDeps()!;
    try {
      const download = await this.downloader(vaultId);
      if (!download) return;
      await deps.remote!.ensureAssets(vaultId, [entity], download);
    } catch (error) {
      console.warn("[CloudBackup] Could not fetch restored images", error);
    }
  }
}
