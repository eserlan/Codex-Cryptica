import type { GDriveSyncConfig } from "@codex/gdrive-sync";

let getConfig: (() => GDriveSyncConfig) | undefined;
type GDriveSyncModule = typeof import("@codex/gdrive-sync");
type GDriveSyncLoader = () => Promise<GDriveSyncModule>;
let loadModule: GDriveSyncLoader = importGDriveSync;
let modulePromise: Promise<GDriveSyncModule> | undefined;

function importGDriveSync() {
  return import("@codex/gdrive-sync");
}

/** Registers the app-specific configuration without loading the Drive worker. */
export function configureGDriveSyncLoader(
  config: () => GDriveSyncConfig,
  loader: GDriveSyncLoader = importGDriveSync,
) {
  getConfig = config;
  loadModule = loader;
  modulePromise = undefined;
}

/** Loads and configures Drive sync only when a user opens a Drive action. */
export function loadGDriveSync() {
  if (!getConfig) {
    return Promise.reject(
      new Error("Google Drive sync is not configured for this app."),
    );
  }

  if (!modulePromise) {
    modulePromise = loadModule()
      .then(async (driveSync) => {
        driveSync.configureGDriveSync(getConfig!());
        await driveSync.initGDriveSync();
        return driveSync;
      })
      .catch((error: unknown) => {
        modulePromise = undefined;
        throw error;
      });
  }

  return modulePromise;
}
