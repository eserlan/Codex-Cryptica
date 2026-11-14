import type { LocalCloudBackupRecord } from "schema";
import {
  fetchCloudBackupAsset,
  fetchCloudBackupChanges,
  getLocalCloudBackupRecord,
  readRemoteLastPushedAt,
  restoreVaultFromCloudBackup,
  storePulledCloudBackupRecord,
  type ChangeFeedOutcome,
  type MergeEntity,
  type MergeSide,
} from "@codex/cloud-backup-sync";
import { onlineStatus } from "./online.svelte";
import {
  PULL_INTERVAL_MS,
  blockedFrom,
  type Blocked,
  type CloudBackupDepsProvider,
  type CloudBackupViewState,
} from "./cloud-backup-types";
import { planPull } from "./cloud-backup-pull-plan";
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

type Fed = { entities: MergeEntity[]; tombstoneIds: string[] };

const isEntity = (value: unknown): value is MergeEntity =>
  Boolean(value) &&
  typeof (value as MergeEntity).id === "string" &&
  typeof (value as MergeEntity).title === "string";

const bundleEntities = (bundle: unknown): MergeEntity[] => {
  const entities = (bundle as { entities?: unknown })?.entities;
  return Array.isArray(entities) ? entities.filter(isEntity) : [];
};

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
      const tombstoneIds = feed.tombstones.map((tombstone) => tombstone.id);
      return {
        ok: true,
        fed: { entities: feed.entities, tombstoneIds },
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
      fed: { entities: bundleEntities(bundle.value.bundle), tombstoneIds: [] },
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
    const { remote, base, activeVaultId } = this.deps!;
    const held = new Set(
      [...fed.entities.map((entity) => entity.id), ...fed.tombstoneIds].filter(
        (id) => remote!.isEditing(id),
      ),
    );
    const entities = fed.entities.filter((entity) => !held.has(entity.id));
    const tombstoneIds = fed.tombstoneIds.filter((id) => !held.has(id));
    const ids = [...entities.map((entity) => entity.id), ...tombstoneIds];
    const sides = await this.readSides(vaultId, ids, resync);
    // Whatever an open editor holds stays out of the merge and the base.
    const heldBase = [...held].flatMap((id) => sides.base[id] ?? []);
    for (const id of held) {
      delete sides.mine[id];
      delete sides.base[id];
    }

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

    if (resync) await base!.replaceVault(vaultId, [...entities, ...heldBase]);
    else await base!.recordSent(vaultId, entities, tombstoneIds);
    if (plan.notice) this.state.mergeNotice = plan.notice;
    return held.size > 0;
  }

  /** Downloads pulled images the vault lacks; a failure never fails the pull. */
  private async fetchAssets(
    vaultId: string,
    entities: readonly MergeEntity[],
  ): Promise<void> {
    const deps = this.deps!;
    try {
      const record = await getLocalCloudBackupRecord(deps.runtime, vaultId);
      if (!record) return;
      const hashes = await deps.remote!.ensureAssets(
        vaultId,
        entities,
        async (assetId) => {
          try {
            const asset = await fetchCloudBackupAsset(
              deps.runtime,
              record,
              assetId,
            );
            return asset.ok ? asset.value : null;
          } catch {
            return null;
          }
        },
      );
      if (Object.keys(hashes).length > 0) {
        Object.assign(this.uploads.media.hashes, hashes);
        this.uploads.media.save(vaultId);
      }
    } catch (error) {
      console.warn("[CloudBackup] Could not fetch pulled images", error);
    }
  }
}
