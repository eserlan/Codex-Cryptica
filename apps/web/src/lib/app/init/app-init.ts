import { browser } from "$app/env";
import "../event-registrations";
import { requestPersistentStorage } from "#lib/utils/persistent-storage.js";
import { initOracleEventListeners } from "../../listeners/oracle-events";
import { initSessionJournalCapture } from "../../listeners/session-journal-events";
import { registerFlushSavesOnHide } from "./flush-saves-on-hide";
import { vault } from "#lib/stores/vault.svelte.js";
import { registerGlobalErrorListeners } from "./global-errors";
import { registerVaultSwitchListener } from "./vault-switch";
import {
  initializeCloudBackup,
  registerCloudBackupChanges,
} from "./cloud-backup-lifecycle";

/**
 * Sets up global error and rejection handlers.
 * Returns a cleanup function.
 */
export function initializeGlobalListeners(_calendarStore?: any) {
  if (!browser) return () => {};

  // OPFS and IndexedDB share one evictable origin bucket unless we ask for a
  // persistence grant, which nothing did until #2619.
  void requestPersistentStorage();

  // Initialize Oracle action listeners
  const unsubOracle: () => void = initOracleEventListeners();
  // Rolls, draws and table results go into the active Session Journal.
  const unsubJournalCapture: () => void = initSessionJournalCapture();

  const cleanupErrors = registerGlobalErrorListeners();
  const cleanupVaultSwitch = registerVaultSwitchListener();

  const cleanupCloudBackup = initializeCloudBackup();

  // Debounced entity writes are otherwise lost if the app closes inside the
  // debounce window — see #2584.
  const unsubFlushSaves = registerFlushSavesOnHide({
    flushPendingSaves: () => vault.flushPendingSaves(),
  });

  const cleanupCloudBackupChanges = registerCloudBackupChanges();

  return () => {
    unsubOracle();
    unsubJournalCapture();
    unsubFlushSaves();
    cleanupCloudBackupChanges();
    cleanupCloudBackup();
    cleanupErrors();
    cleanupVaultSwitch();
  };
}

export { bootSystem } from "./core-boot";
export { setupWindowGlobals } from "./window-globals";

export {
  collectVaultShellUrls,
  registerServiceWorker,
  type VaultServiceWorkerSession,
} from "./service-worker";
