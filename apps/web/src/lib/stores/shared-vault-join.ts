import {
  LocalCloudBackupRecordSchema,
  type LocalCloudBackupRecord,
} from "schema";
import {
  readRemoteLastPushedAt,
  restoreVaultFromCloudBackup,
  type CloudBackupRuntime,
} from "@codex/cloud-backup-sync";
import type { StorageLike } from "#lib/utils/runtime-deps.js";
import type { CloudBackupBaseStore } from "./cloud-backup-base";
import type { CloudBackupDirtyStore } from "./cloud-backup-dirty";
import { CloudBackupMediaCache } from "./cloud-backup-media-cache";
import { restoreCloudBackupIntoNewVault } from "./cloud-backup-restore";
import type { CloudBackupDeps } from "./cloud-backup-types";
import type { SharedVaultIdentity } from "./shared-vault-identity";
import {
  JOIN_FAILED_MESSAGE,
  JOIN_IMPORT_FAILED_MESSAGE,
  JOIN_NETWORK_MESSAGE,
  LINK_GONE_MESSAGE,
} from "./shared-vault-messages";

export type JoinOutcome =
  | { kind: "joined" | "rejoined"; vaultId: string; message: string }
  /** This device already owns the backup; nothing was requested or changed. */
  | { kind: "owned"; vaultId: string }
  | { kind: "failed"; message: string };

export interface SharedVaultJoinDeps {
  runtime: CloudBackupRuntime;
  restore: NonNullable<CloudBackupDeps["restore"]>;
  /** Whether a vault with this id is still on this device. */
  vaultExists: (vaultId: string) => Promise<boolean>;
  deleteVault: (vaultId: string) => Promise<void>;
  switchVault: (vaultId: string) => Promise<void>;
  base: CloudBackupBaseStore;
  dirty: CloudBackupDirtyStore;
  /** Where the media hash cache lives. */
  storage: StorageLike;
  identity: SharedVaultIdentity;
  /** Starts pulls for the vault now open. */
  hydrate: (vaultId: string) => Promise<void>;
  now?: () => Date;
}

/** The worker's own words, unless it sent none. */
function failureMessage(failure: { error: string; status?: number }): string {
  if (failure.status === 404) return LINK_GONE_MESSAGE;
  return failure.error.startsWith("Request failed (")
    ? JOIN_FAILED_MESSAGE
    : failure.error;
}

const entitiesOf = (bundle: unknown): unknown[] => {
  const entities = (bundle as { entities?: unknown })?.entities;
  return Array.isArray(entities) ? entities : [];
};

/**
 * A member joining a shared vault from the group link. Nothing here runs until
 * the member confirms; every failure leaves the device as it was.
 */
export class SharedVaultJoin {
  constructor(private deps: SharedVaultJoinDeps) {}

  async join(
    link: { backupId: string; editorToken: string },
    displayName: string,
  ): Promise<JoinOutcome> {
    const { identity } = this.deps;
    const name = displayName.trim();
    identity.setDisplayName(name);
    identity.deviceId();
    try {
      const existing = await this.findLinkedRecords(link.backupId);
      const owned = existing.find((record) => record.role !== "editor");
      if (owned) return { kind: "owned", vaultId: owned.vaultId };
      if (existing[0]) return await this.rejoin(existing[0], link, name);
      return await this.joinNew(link, name);
    } catch {
      return { kind: "failed", message: JOIN_NETWORK_MESSAGE };
    }
  }

  /** Records for this backup whose vault is still on this device. */
  private async findLinkedRecords(
    backupId: string,
  ): Promise<LocalCloudBackupRecord[]> {
    const entries = (await this.deps.runtime.storage.list?.()) ?? [];
    const found: LocalCloudBackupRecord[] = [];
    for (const entry of entries) {
      const parsed = LocalCloudBackupRecordSchema.safeParse(entry.record);
      if (!parsed.success || parsed.data.backupId !== backupId) continue;
      if (await this.deps.vaultExists(parsed.data.vaultId)) {
        found.push(parsed.data);
      }
    }
    return found;
  }

  /** The vault is already here: new token, same vault, nothing downloaded. */
  private async rejoin(
    record: LocalCloudBackupRecord,
    link: { backupId: string; editorToken: string },
    name: string,
  ): Promise<JoinOutcome> {
    const { runtime } = this.deps;
    const status = await readRemoteLastPushedAt(runtime, {
      backupId: link.backupId,
      ownerCode: link.editorToken,
      role: "editor",
    });
    if (!status.ok) return { kind: "failed", message: failureMessage(status) };

    const { linkGone: _gone, ...kept } = record;
    await runtime.storage.write(record.vaultId, {
      ...kept,
      ownerCode: link.editorToken,
      role: "editor",
      enabled: true,
      status: "idle",
    });
    await this.deps.switchVault(record.vaultId);
    await this.deps.hydrate(record.vaultId);
    const title = record.vaultTitle ?? "the shared vault";
    return {
      kind: "rejoined",
      vaultId: record.vaultId,
      message: `You rejoined ${title} as ${name}.`,
    };
  }

  private async joinNew(
    link: { backupId: string; editorToken: string },
    name: string,
  ): Promise<JoinOutcome> {
    const { runtime, restore } = this.deps;
    const credentials = {
      backupId: link.backupId,
      ownerCode: link.editorToken,
      role: "editor" as const,
    };
    const material = await restoreVaultFromCloudBackup(runtime, credentials);
    if (!material.ok) {
      return { kind: "failed", message: failureMessage(material) };
    }

    let createdId: string | null = null;
    const target = Object.create(restore) as typeof restore;
    target.createVault = async (title) => {
      createdId = await restore.createVault(title);
      return createdId;
    };
    let restored: Awaited<ReturnType<typeof restoreCloudBackupIntoNewVault>>;
    try {
      restored = await restoreCloudBackupIntoNewVault(
        runtime,
        target,
        credentials,
        material.value,
        { hashAssets: true },
      );
      await this.seedAndLink(restored, material.value, link);
    } catch {
      if (createdId) await this.discard(createdId);
      return { kind: "failed", message: JOIN_IMPORT_FAILED_MESSAGE };
    }
    await this.deps.hydrate(restored.vaultId);
    const { missingAssets } = restored;
    return {
      kind: "joined",
      vaultId: restored.vaultId,
      message:
        `You joined ${restored.vaultTitle} as ${name}.` +
        (missingAssets > 0
          ? ` ${missingAssets} ${missingAssets === 1 ? "image" : "images"} could not be copied.`
          : ""),
    };
  }

  /**
   * Seeds what keeps the first sync from sending the vault straight back, then
   * writes the record last, so a failure before it leaves no link behind.
   */
  private async seedAndLink(
    restored: {
      vaultId: string;
      vaultTitle: string;
      assetHashes?: Record<string, string>;
    },
    material: {
      manifest: { lastPushedAt?: string; revision?: number };
      bundle: unknown;
    },
    link: { backupId: string; editorToken: string },
  ): Promise<void> {
    const { runtime, base, dirty, storage, now } = this.deps;
    const { vaultId } = restored;
    await base.replaceVault(vaultId, entitiesOf(material.bundle));
    const media = new CloudBackupMediaCache(() => storage);
    media.hashes = restored.assetHashes ?? {};
    media.save(vaultId);
    await dirty.clearVault(vaultId);

    const { manifest } = material;
    await runtime.storage.write(vaultId, {
      vaultId,
      backupId: link.backupId,
      ownerCode: link.editorToken,
      role: "editor",
      enabled: true,
      status: "idle",
      lastPushedAt: manifest.lastPushedAt ?? null,
      consentedAt: (now?.() ?? new Date()).toISOString(),
      vaultTitle: restored.vaultTitle,
      ...(typeof manifest.revision === "number"
        ? { revision: manifest.revision }
        : {}),
    });
  }

  /** Removes a half-built vault and anything seeded for it. */
  private async discard(vaultId: string): Promise<void> {
    const { runtime, base, dirty, storage } = this.deps;
    await runtime.storage.clear(vaultId).catch(() => undefined);
    await base.clearVault(vaultId).catch(() => undefined);
    await dirty.clearVault(vaultId).catch(() => undefined);
    try {
      storage.removeItem(`codex.cloud-backup-hashes.${vaultId}`);
    } catch {
      // Nothing to remove.
    }
    await this.deps.deleteVault(vaultId).catch(() => undefined);
  }
}
