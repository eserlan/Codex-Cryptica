import { wrap, proxy } from "comlink";
import { appEventBus } from "@codex/events";
import {
  CloudSyncMetadataService,
  GDriveBackend,
  SyncRegistry,
} from "@codex/sync-engine";
import { gdriveAuthService } from "./gdrive-auth";
import { getDB } from "../utils/idb";
import { vault } from "../stores/vault.svelte";
import type { GDriveSyncWorker } from "../workers/gdrive-sync.worker";

let workerInstance: any = null;
let isSyncing = false;

function getWorker() {
  if (!workerInstance) {
    const worker = new Worker(
      new URL("../workers/gdrive-sync.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerInstance = wrap<GDriveSyncWorker>(worker);
  }
  return workerInstance;
}

/**
 * Initializes the Google Drive sync service.
 * This should be called once during app startup.
 */
export async function initGDriveSync() {
  console.log(
    "[GDriveSync] Service initialized and ready for manual sync events",
  );
}

const ROOT_FOLDER_NAME = "CodexCryptica";
const DRIVE_FILES_API = "https://www.googleapis.com/drive/v3/files";

/**
 * Finds the "CodexCryptica" root folder in Drive, or creates it if missing.
 */
async function getOrCreateRootFolder(token: string): Promise<string> {
  const query = `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`;
  const searchRes = await fetch(
    `${DRIVE_FILES_API}?q=${encodeURIComponent(query)}&fields=files(id)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!searchRes.ok) throw new Error("Failed to search for root Drive folder");
  const { files } = await searchRes.json();
  if (files.length > 0) return files[0].id;

  const createRes = await fetch(DRIVE_FILES_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: ROOT_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!createRes.ok) throw new Error("Failed to create root Drive folder");
  const data = await createRes.json();
  return data.id;
}

/**
 * Connects a vault to a Google Drive folder inside the "CodexCryptica" root.
 * Creates the folder if no ID is provided.
 */
export async function connectVaultToDrive(vaultId: string, folderId?: string) {
  console.log(
    `[GDriveSync] connectVaultToDrive() for vault: ${vaultId}, folderId: ${folderId}`,
  );
  const token = await gdriveAuthService.getAccessToken();
  if (!token) throw new Error("Authentication failed");

  const db = await getDB();
  const registry = new SyncRegistry(db);
  const metadataService = new CloudSyncMetadataService(registry);
  const driveBackend = new GDriveBackend(gdriveAuthService, vaultId);

  let finalFolderId = folderId;

  if (!finalFolderId) {
    const vaultName = vault.activeVaultRecord?.name || "Unnamed Vault";
    const rootFolderId = await getOrCreateRootFolder(token);

    const response = await fetch(DRIVE_FILES_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: vaultName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [rootFolderId],
      }),
    });

    if (!response.ok) throw new Error("Failed to create Drive vault folder");
    const data = await response.json();
    finalFolderId = data.id;
  } else {
    // Validate existing folder
    driveBackend.setVaultFolderId(finalFolderId);
    await driveBackend.connect();
  }

  await metadataService.saveMetadata({
    vaultId,
    remoteFolderId: finalFolderId!,
    lastSyncTime: 0,
    lastSyncToken: null,
  });

  appEventBus.emit({
    type: "SYNC:DRIVE_CONNECTED",
    domain: "sync",
    payload: { vaultId, folderId: finalFolderId! },
    metadata: { timestamp: Date.now(), vaultId },
  });
}

/**
 * Disconnects a vault from Google Drive.
 */
export async function disconnectVaultFromDrive(vaultId: string) {
  const db = await getDB();
  const registry = new SyncRegistry(db);
  const metadataService = new CloudSyncMetadataService(registry);

  await metadataService.clearMetadata(vaultId);

  appEventBus.emit({
    type: "SYNC:DRIVE_DISCONNECTED",
    domain: "sync",
    payload: { vaultId },
    metadata: { timestamp: Date.now(), vaultId },
  });
}

/**
 * Runs a sync operation via the Web Worker
 */
async function runWorkerSync(vaultId: string, direction: "push" | "pull") {
  if (isSyncing || (typeof navigator !== "undefined" && !navigator.onLine))
    return;

  const db = await getDB();
  const ms = new CloudSyncMetadataService(new SyncRegistry(db));
  const metadata = await ms.getMetadata(vaultId);

  if (!metadata || !metadata.remoteFolderId) {
    throw new Error("Google Drive not connected for this vault");
  }

  const opfsHandle =
    vault.activeVaultId === vaultId
      ? await vault.getActiveVaultHandle()
      : await vault.getSpecificVaultHandle(vaultId);

  if (!opfsHandle) {
    throw new Error("Failed to resolve vault storage handle");
  }

  isSyncing = true;
  try {
    const worker = getWorker();

    const authProxy = proxy({
      getAccessToken: async () => await gdriveAuthService.getAccessToken(),
      signOut: async () => await gdriveAuthService.signOut(),
    });

    const eventBusProxy = proxy({
      emit: (event: any) => appEventBus.emit(event),
    });

    await worker.runSync(
      vaultId,
      direction,
      metadata.remoteFolderId,
      opfsHandle,
      authProxy,
      eventBusProxy,
    );
  } finally {
    isSyncing = false;
  }
}

/**
 * Manually pushes the active vault to Google Drive.
 */
export async function pushVaultToDrive(vaultId: string) {
  return runWorkerSync(vaultId, "push");
}

/**
 * Manually pulls the active vault from Google Drive.
 */
export async function pullVaultFromDrive(vaultId: string) {
  return runWorkerSync(vaultId, "pull");
}
