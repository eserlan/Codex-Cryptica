import type { CloudBackupTombstone, LocalCloudBackupRecord } from "schema";
import {
  fetchCloudBackupChanges,
  getLocalCloudBackupRecord,
  readRemoteLastPushedAt,
  restoreVaultFromCloudBackup,
  storePulledCloudBackupRecord,
  type ChangeFeedOutcome,
  type FeedWholeItem,
  type MergeEntity,
  type MergeSide,
  type WholeItem,
  type WholeSide,
} from "@codex/cloud-backup-sync";
import { onlineStatus } from "./online.svelte";
import { createAssetDownloader } from "./cloud-backup-downloader";
import {
  PULL_INTERVAL_MS,
  blockedFrom,
  type Blocked,
  type CloudBackupDepsProvider,
  type AssetDownload,
  type CloudBackupViewState,
  type MergeNotice,
  type PulledWholeChanges,
} from "./cloud-backup-types";
import { collectAssetPaths } from "#lib/services/cloud-backup-payload.js";
import { planPull, planWholePull } from "./cloud-backup-pull-plan";
import type { WholeKind } from "./cloud-backup-base";
import type { CloudBackupMediaCache } from "./cloud-backup-media-cache";

export type PullOutcome =
  | { kind: "done" }
  /** Open editors held entries back; the revision did not advance. */
  | { kind: "held" }
  /** An older worker without the change feed. */
  | { kind: "unsupported" }
  | { kind: "off" }
  /** An editor's link is gone or its device is over the cap; sync stops. */
  | { kind: "blocked"; blocked: Blocked }
  | { kind: "failed"; error: string };

type PullState = Pick<
  CloudBackupViewState,
  "status" | "autoState" | "lastPushedAt" | "mergeNotice" | "syncStopped"
>;

function failureOutcome(failure: {
  error: string;
  status?: number;
  code?: string;
  linkGone?: true;
}): PullOutcome {
  const blocked = blockedFrom(failure);
  return blocked
    ? { kind: "blocked", blocked }
    : { kind: "failed", error: failure.error };
}

type Fed = {
  entities: MergeEntity[];
  tombstones: CloudBackupTombstone[];
  maps: FeedWholeItem[];
  canvases: FeedWholeItem[];
  mapTombstones: CloudBackupTombstone[];
  canvasTombstones: CloudBackupTombstone[];
};

const isWholeItem = (value: unknown): value is WholeItem =>
  Boolean(value) &&
  typeof (value as WholeItem).id === "string" &&
  typeof (value as WholeItem).name === "string";

/** A resync's maps or canvases, with the files the bundle's manifest lists for each. */
const bundleWholeItems = (
  bundle: unknown,
  key: "maps" | "canvases",
): FeedWholeItem[] => {
  const section = (bundle as Record<string, unknown>)?.[key];
  const manifest = (bundle as { assetManifest?: unknown })?.assetManifest;
  const listed = Array.isArray(manifest)
    ? (manifest as { assetId: string; path: string; mimeType: string }[])
    : [];
  return (Array.isArray(section) ? section : [])
    .filter(isWholeItem)
    .map((item) => {
      const assets =
        key === "maps"
          ? listed.filter((entry) =>
              collectAssetPaths([], [item]).includes(entry.path),
            )
          : [];
      return { item, ...(assets.length > 0 ? { assets } : {}) };
    });
};

const isEntity = (value: unknown): value is MergeEntity =>
  Boolean(value) &&
  typeof (value as MergeEntity).id === "string" &&
  typeof (value as MergeEntity).title === "string";

const bundleEntities = (bundle: unknown): MergeEntity[] => {
  const entities = (bundle as { entities?: unknown })?.entities;
  return Array.isArray(entities) ? entities.filter(isEntity) : [];
};

/** Splits a feed into what an open editor holds and what the merge may touch. */
function splitHeld<T>(
  items: readonly T[],
  idOf: (item: T) => string,
  tombstones: readonly CloudBackupTombstone[],
  isHeld: (id: string) => boolean,
): {
  held: Set<string>;
  kept: T[];
  tombstones: CloudBackupTombstone[];
  tombstoneIds: string[];
} {
  const held = new Set(
    [...items.map(idOf), ...tombstones.map((t) => t.id)].filter(isHeld),
  );
  const open = tombstones.filter((t) => !held.has(t.id));
  return {
    held,
    kept: items.filter((item) => !held.has(idOf(item))),
    tombstones: open,
    tombstoneIds: open.map((t) => t.id),
  };
}

/** Takes the held ids out of the sides, and returns their bases. */
function dropHeld<T>(
  sides: { mine: Record<string, unknown>; base: Record<string, T> },
  held: ReadonlySet<string>,
): NonNullable<T>[] {
  const heldBase = [...held]
    .map((id) => sides.base[id])
    .filter((base): base is NonNullable<T> => !!base);
  for (const id of held) {
    delete sides.mine[id];
    delete sides.base[id];
  }
  return heldBase;
}

/** Pulls other devices' entity changes and merges them into the local vault. */
export class CloudBackupPulls {
  running = false;
  private unsupported = false;
  private vaultId: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeEditing: (() => void) | null = null;
  private listening = false;

  constructor(
    private state: PullState,
    private getDeps: CloudBackupDepsProvider,
    private uploads: { pushing: boolean; media: CloudBackupMediaCache },
    private onSettled: () => void,
    private onBlocked: (vaultId: string, blocked: Blocked) => void = () => {},
  ) {}

  private get deps() {
    return this.getDeps();
  }

  /** Starts the background pull for a vault and pulls once at once. */
  start(vaultId: string): void {
    this.stop();
    const deps = this.deps;
    if (!deps?.remote || !deps.base) return;
    this.unsupported = false;
    this.vaultId = vaultId;
    this.timer = setInterval(() => {
      if (document.visibilityState === "visible") void this.pullNow();
    }, deps.pullIntervalMs ?? PULL_INTERVAL_MS);
    this.unsubscribeEditing = deps.remote.onEditingReleased(
      () => void this.pullNow(),
    );
    this.listening = true;
    document.addEventListener("visibilitychange", this.handleVisibility);
    window.addEventListener("focus", this.handleWake);
    window.addEventListener("online", this.handleWake);
    void this.pullNow();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.unsubscribeEditing?.();
    this.unsubscribeEditing = null;
    this.vaultId = null;
    if (!this.listening) return;
    this.listening = false;
    document.removeEventListener("visibilitychange", this.handleVisibility);
    window.removeEventListener("focus", this.handleWake);
    window.removeEventListener("online", this.handleWake);
  }

  private handleVisibility = (): void => {
    if (document.visibilityState === "visible") void this.pullNow();
  };

  private handleWake = (): void => {
    void this.pullNow();
  };

  /** Nothing is stopping a pull: not paused, off, pushing or already pulling. */
  private idle(): boolean {
    const { status, autoState } = this.state;
    const paused =
      status === "off" || autoState === "conflict" || this.state.syncStopped;
    return (
      !paused && !this.unsupported && !this.uploads.pushing && !this.running
    );
  }

  private canPullNow(vaultId: string | null): vaultId is string {
    const deps = this.deps;
    return Boolean(
      deps?.remote &&
      vaultId &&
      this.idle() &&
      deps.activeVaultId() === vaultId &&
      onlineStatus.current,
    );
  }

  /** A background pull; skipped whenever it would get in the way. */
  async pullNow(): Promise<void> {
    if (this.canPullNow(this.vaultId)) await this.run(this.vaultId);
  }

  /** The pull a rejected push waits for. */
  async pullForPush(): Promise<PullOutcome> {
    const vaultId = this.deps?.activeVaultId();
    if (!vaultId || !this.deps?.remote) return { kind: "off" };
    if (this.unsupported) return { kind: "unsupported" };
    if (this.running) return { kind: "failed", error: "A pull is running." };
    return this.run(vaultId);
  }

  private async run(vaultId: string): Promise<PullOutcome> {
    this.running = true;
    let outcome: PullOutcome;
    try {
      outcome = await this.execute(vaultId);
    } catch (error) {
      outcome = {
        kind: "failed",
        error: error instanceof Error ? error.message : "Pull failed.",
      };
    } finally {
      this.running = false;
    }
    if (outcome.kind === "unsupported") this.unsupported = true;
    if (outcome.kind === "blocked") this.onBlocked(vaultId, outcome.blocked);
    if (!this.uploads.pushing) this.onSettled();
    return outcome;
  }

  private async execute(vaultId: string): Promise<PullOutcome> {
    const deps = this.deps!;
    const record = await getLocalCloudBackupRecord(deps.runtime, vaultId);
    if (!record?.enabled || record.linkGone || !deps.base) {
      return { kind: "off" };
    }
    const read = await this.readFeed(record, vaultId);
    if ("outcome" in read) return read.outcome;
    const loaded = await this.loadFed(record, read.feed, read.statusAt);
    if (!loaded.ok) return failureOutcome(loaded);
    const { fed, revision, lastPushedAt } = loaded;
    const held = await this.merge(
      vaultId,
      fed,
      read.feed.kind === "resync",
      this.authorName(record),
    );
    if (held) return { kind: "held" };
    await storePulledCloudBackupRecord(deps.runtime, vaultId, {
      revision,
      lastPushedAt,
    });
    if (lastPushedAt) this.state.lastPushedAt = lastPushedAt;
    return { kind: "done" };
  }

  /** The remote timestamp and the feed, or the outcome that ends the pull. */
  private async readFeed(
    record: LocalCloudBackupRecord,
    vaultId: string,
  ): Promise<
    | {
        feed: Extract<ChangeFeedOutcome, { kind: "changes" | "resync" }>;
        statusAt: string | null;
      }
    | { outcome: PullOutcome }
  > {
    const { runtime } = this.deps!;
    const status = await readRemoteLastPushedAt(runtime, record);
    if (!status.ok) return { outcome: failureOutcome(status) };
    const feed = await fetchCloudBackupChanges(runtime, vaultId);
    if (feed.kind === "failed") return { outcome: failureOutcome(feed) };
    if (feed.kind === "linkGone") {
      return { outcome: { kind: "blocked", blocked: { kind: "linkGone" } } };
    }
    if (feed.kind === "changes" || feed.kind === "resync") {
      return { feed, statusAt: status.value };
    }
    return { outcome: feed };
  }

  /** The entries to merge; a resync reads them from the whole backup. */
  private async loadFed(
    record: LocalCloudBackupRecord,
    feed: Extract<ChangeFeedOutcome, { kind: "changes" | "resync" }>,
    statusAt: string | null,
  ): Promise<
    | { ok: true; fed: Fed; revision: number; lastPushedAt: string | null }
    | {
        ok: false;
        error: string;
        status?: number;
        code?: string;
        linkGone?: true;
      }
  > {
    if (feed.kind === "changes") {
      return {
        ok: true,
        fed: {
          entities: feed.entities,
          tombstones: feed.tombstones,
          maps: feed.maps,
          canvases: feed.canvases,
          mapTombstones: feed.mapTombstones,
          canvasTombstones: feed.canvasTombstones,
        },
        revision: feed.revision,
        lastPushedAt: statusAt,
      };
    }
    const bundle = await restoreVaultFromCloudBackup(
      this.deps!.runtime,
      record,
    );
    if (!bundle.ok) return bundle;
    const { manifest } = bundle.value;
    return {
      ok: true,
      fed: {
        entities: bundleEntities(bundle.value.bundle),
        tombstones: [],
        maps: bundleWholeItems(bundle.value.bundle, "maps"),
        canvases: bundleWholeItems(bundle.value.bundle, "canvases"),
        mapTombstones: [],
        canvasTombstones: [],
      },
      revision: manifest.revision ?? feed.revision,
      lastPushedAt: manifest.lastPushedAt,
    };
  }

  /** The local and base copies of what the feed touches (all, for a resync). */
  private async readSides(
    vaultId: string,
    ids: readonly string[],
    resync: boolean,
  ): Promise<{ mine: MergeSide; base: MergeSide }> {
    const { remote, base } = this.deps!;
    const mine = await remote!.readLocal(vaultId, resync ? null : ids);
    if (this.deps?.activeVaultId() !== vaultId)
      throw new Error("The vault changed.");
    const rows = resync
      ? await base!.list(vaultId)
      : await Promise.all(
          ids.map(async (id) => ({ id, entity: await base!.get(vaultId, id) })),
        );
    const baseSide: MergeSide = {};
    for (const row of rows) {
      if (row.entity) baseSide[row.id] = row.entity as MergeEntity;
    }
    return { mine, base: baseSide };
  }

  /** A member's conflict copies carry their own name, not "this device". */
  private authorName(record: LocalCloudBackupRecord): string | undefined {
    return record.role === "editor" ? this.deps?.displayName?.() : undefined;
  }

  /** Merges and applies a feed; true when open editors held entries back. */
  private async merge(
    vaultId: string,
    fed: Fed,
    resync: boolean,
    copyAuthorName?: string,
  ): Promise<boolean> {
    const entityPart = await this.mergeEntities(
      vaultId,
      fed,
      resync,
      copyAuthorName,
    );
    const maps = await this.mergeWhole(
      vaultId,
      "map",
      { items: fed.maps, tombstones: fed.mapTombstones },
      resync,
      copyAuthorName,
    );
    const canvases = await this.mergeWhole(
      vaultId,
      "canvas",
      { items: fed.canvases, tombstones: fed.canvasTombstones },
      resync,
      copyAuthorName,
    );
    if (resync) {
      await this.deps!.base!.replaceVault(vaultId, entityPart.baseEntities, {
        maps: maps.baseItems,
        canvases: canvases.baseItems,
      });
    }
    const notices = [entityPart.notice, maps.notice, canvases.notice].filter(
      (notice): notice is MergeNotice => notice !== null,
    );
    if (notices.length > 0) {
      this.state.mergeNotice = {
        merged: notices.reduce((total, notice) => total + notice.merged, 0),
        copies: notices.flatMap((notice) => notice.copies),
      };
    }
    return entityPart.held || maps.held || canvases.held;
  }

  private async mergeEntities(
    vaultId: string,
    fed: Fed,
    resync: boolean,
    copyAuthorName?: string,
  ): Promise<{
    held: boolean;
    notice: MergeNotice | null;
    baseEntities: MergeEntity[];
  }> {
    const { remote, base, activeVaultId } = this.deps!;
    const { held, kept, tombstones, tombstoneIds } = splitHeld(
      fed.entities,
      (entity) => entity.id,
      fed.tombstones,
      (id) => remote!.isEditing(id),
    );
    const entities = kept;
    const ids = [...entities.map((entity) => entity.id), ...tombstoneIds];
    const sides = await this.readSides(vaultId, ids, resync);
    // Whatever an open editor holds stays out of the merge and the base.
    const heldBase = dropHeld(sides, held);

    const plan = planPull({
      entities,
      tombstoneIds,
      ...sides,
      resync,
      newId: remote!.newId,
      ...(copyAuthorName ? { copyAuthorName } : {}),
    });
    if (activeVaultId() !== vaultId) throw new Error("The vault changed.");
    await this.fetchAssets(vaultId, [
      ...plan.changes.updates,
      ...plan.changes.creates,
    ]);
    if (activeVaultId() !== vaultId) throw new Error("The vault changed.");
    await remote!.apply(vaultId, plan.changes);
    if (activeVaultId() !== vaultId) throw new Error("The vault changed.");

    if (!resync) {
      await base!.recordSent(vaultId, entities, tombstoneIds);
      this.notifyDeletes(vaultId, tombstones, plan.changes.deletes);
    }
    return {
      held: held.size > 0,
      notice: plan.notice,
      baseEntities: [...entities, ...heldBase],
    };
  }

  /** The local and base copies of the maps or canvases the feed touches. */
  private async readWholeSides(
    vaultId: string,
    kind: WholeKind,
    ids: readonly string[],
    resync: boolean,
  ): Promise<{ mine: WholeSide; base: WholeSide }> {
    const { remote, base } = this.deps!;
    const mine = await remote!.readLocalWhole(
      vaultId,
      kind,
      resync ? null : ids,
    );
    if (this.deps?.activeVaultId() !== vaultId)
      throw new Error("The vault changed.");
    const stored = resync
      ? await base!.listWhole(vaultId, kind)
      : Object.fromEntries(
          await Promise.all(
            ids.map(async (id) => [
              id,
              await base!.getWhole(vaultId, kind, id),
            ]),
          ),
        );
    const baseSide: WholeSide = {};
    for (const [id, item] of Object.entries(stored)) {
      if (item) baseSide[id] = item as WholeItem;
    }
    return { mine, base: baseSide };
  }

  /** Ids of maps with a pending change the content does not show, such as a fog edit. */
  private async dirtyMapIds(vaultId: string): Promise<Set<string>> {
    const rows = (await this.deps!.dirty?.snapshot(vaultId)) ?? [];
    return new Set(
      rows
        .filter((row) => row.kind === "maps" && row.id !== "*")
        .map((row) => row.id),
    );
  }

  /** Merges and applies the feed's maps or canvases as whole items. */
  private async mergeWhole(
    vaultId: string,
    kind: WholeKind,
    fed: { items: FeedWholeItem[]; tombstones: CloudBackupTombstone[] },
    resync: boolean,
    copyAuthorName?: string,
  ): Promise<{
    held: boolean;
    notice: MergeNotice | null;
    baseItems: WholeItem[];
  }> {
    const { remote, base, activeVaultId } = this.deps!;
    const { held, kept, tombstones, tombstoneIds } = splitHeld(
      fed.items,
      (entry) => entry.item.id,
      fed.tombstones,
      (id) => remote!.isWholeOpen(kind, id),
    );
    const items = kept;
    const ids = [...items.map((entry) => entry.item.id), ...tombstoneIds];
    const sides = await this.readWholeSides(vaultId, kind, ids, resync);
    const heldBase = dropHeld(sides, held);

    const plan = planWholePull({
      items,
      tombstoneIds,
      ...sides,
      mineDirty: kind === "map" ? await this.dirtyMapIds(vaultId) : new Set(),
      resync,
      newId: remote!.newWholeId,
      hasFiles: (entry) => this.hasFiles(kind, entry),
      ...(copyAuthorName ? { copyAuthorName } : {}),
    });
    if (activeVaultId() !== vaultId) throw new Error("The vault changed.");
    const { copies, writes, deletes } = plan.changes;
    if (copies.length + writes.length + deletes.length > 0) {
      await this.applyWhole(vaultId, kind, plan.changes);
    }

    if (!resync) {
      await base!.recordSentWhole(
        vaultId,
        kind,
        items.map((entry) => entry.item),
        tombstoneIds,
      );
      this.notifyDeletes(vaultId, tombstones, deletes);
    }
    return {
      held: held.size > 0,
      notice: plan.notice,
      baseItems: [...items.map((entry) => entry.item), ...heldBase],
    };
  }

  /** Whether the files a map names are already here, going by the media cache. */
  private hasFiles(kind: WholeKind, entry: FeedWholeItem): boolean {
    if (kind === "canvas") return true;
    const { hashes } = this.uploads.media;
    if (entry.assets) return entry.assets.every((a) => a.assetId in hashes);
    return collectAssetPaths([], [entry.item]).length === 0;
  }

  /** Writes merged maps or canvases; a file that cannot be downloaded is reported, not fatal. */
  private async applyWhole(
    vaultId: string,
    kind: WholeKind,
    changes: PulledWholeChanges,
  ): Promise<void> {
    const deps = this.deps!;
    const download = (await this.downloader(vaultId)) ?? (async () => null);
    const { hashes, failed } = await deps.remote!.applyWhole(
      vaultId,
      kind,
      changes,
      download,
    );
    if (deps.activeVaultId() !== vaultId) throw new Error("The vault changed.");
    this.rememberHashes(vaultId, hashes);
    if (failed.length > 0) {
      console.warn("[CloudBackup] Could not download map files", failed);
    }
  }

  /** Tells the user about deletes this pull applied, which a resync never does. */
  private notifyDeletes(
    vaultId: string,
    tombstones: readonly CloudBackupTombstone[],
    deleted: readonly string[],
  ): void {
    const applied = tombstones.filter((tombstone) =>
      deleted.includes(tombstone.id),
    );
    if (applied.length > 0) this.deps?.notifyDeletes?.(vaultId, applied);
  }

  /** Fetches one stored file with this vault's credentials; null on any failure. */
  private downloader(vaultId: string): Promise<AssetDownload | null> {
    return createAssetDownloader(this.deps!.runtime, vaultId);
  }

  private rememberHashes(
    vaultId: string,
    hashes: Record<string, string>,
  ): void {
    if (Object.keys(hashes).length === 0) return;
    Object.assign(this.uploads.media.hashes, hashes);
    this.uploads.media.save(vaultId);
  }

  /** Downloads pulled images the vault lacks; a failure never fails the pull. */
  private async fetchAssets(
    vaultId: string,
    entities: readonly MergeEntity[],
  ): Promise<void> {
    const deps = this.deps!;
    try {
      const download = await this.downloader(vaultId);
      if (!download) return;
      this.rememberHashes(
        vaultId,
        await deps.remote!.ensureAssets(vaultId, entities, download),
      );
    } catch (error) {
      console.warn("[CloudBackup] Could not fetch pulled images", error);
    }
  }
}
