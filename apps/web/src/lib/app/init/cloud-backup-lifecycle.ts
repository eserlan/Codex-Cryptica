import { vault } from "#lib/stores/vault.svelte.js";
import { cloudBackupStore } from "#lib/stores/cloud-backup.svelte.js";
import { onDurableVaultChange } from "#lib/stores/vault/registry.js";
import { vaultEventBus } from "#lib/stores/vault/events.svelte.js";
import { configureCloudBackup } from "./cloud-backup-config";

/** Configure backup and restore the current vault's opt-in state. */
export function initializeCloudBackup(): () => void {
  configureCloudBackup();
  // Read any existing opt-in back so a reload shows the vault's real backup
  // state rather than "off" and a fresh consent prompt (spec 162, FR-020).
  const hydrateCloudBackup = () => {
    const activeVaultId = vault.activeVaultId;
    if (activeVaultId) void cloudBackupStore.hydrate(activeVaultId);
  };
  hydrateCloudBackup();
  window.addEventListener("vault-switched", hydrateCloudBackup);

  return () => {
    window.removeEventListener("vault-switched", hydrateCloudBackup);
    cloudBackupStore.destroy();
  };
}

/** Subscribe to durable edits and disk sync without scheduling uploads for reads. */
export function registerCloudBackupChanges(): () => void {
  // Automatic cloud backup (#3189): durable writes schedule a debounced
  // guarded push, and lifecycle events flush it. The subscription lives for
  // the app lifetime; the store itself stays inert while backup is off.
  // Each write also records what it touched (#3354), so a push can send only
  // the changes. Files re-read from disk join the next upload without
  // scheduling one on their own.
  const unsubDurableChanges = onDurableVaultChange((changedVaultId, change) => {
    void cloudBackupStore.recordLocalChange(changedVaultId, change);
  });
  const unsubSyncedChanges = vaultEventBus.subscribe((event) => {
    if (event.type !== "SYNC_CHUNK_READY") return;
    void cloudBackupStore.recordLocalChange(
      event.vaultId,
      { kind: "entity", ids: event.newOrChangedIds },
      { schedule: false },
    );
  }, "cloud-backup-sync-chunks");
  cloudBackupStore.startAutoSyncListeners();

  return () => {
    unsubDurableChanges();
    unsubSyncedChanges();
  };
}
