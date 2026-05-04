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
import { listVaults } from "../stores/vault/registry";
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

async function findOrCreateFolder(
  token: string,
  name: string,
  parentId?: string,
): Promise<string> {
  const parentClause = parentId
    ? `'${parentId}' in parents`
    : `'root' in parents`;
  const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false and ${parentClause}`;
  const searchRes = await fetch(
    `${DRIVE_FILES_API}?q=${encodeURIComponent(query)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!searchRes.ok)
    throw new Error(`Failed to search Drive for folder "${name}"`);
  const { files } = await searchRes.json();
  if (files.length > 0) return files[0].id;

  const body: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) body.parents = [parentId];
  const createRes = await fetch(DRIVE_FILES_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!createRes.ok) throw new Error(`Failed to create Drive folder "${name}"`);
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
    const rootFolderId = await findOrCreateFolder(token, ROOT_FOLDER_NAME);
    finalFolderId = await findOrCreateFolder(token, vaultName, rootFolderId);
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

/**
 * Lists all vault subfolders inside the CodexCryptica root on Drive.
 */
export async function listDriveVaults(): Promise<
  Array<{ id: string; name: string }>
> {
  const token = await gdriveAuthService.getAccessToken();
  if (!token) throw new Error("Authentication failed");

  const rootFolderId = await findOrCreateFolder(token, ROOT_FOLDER_NAME);
  const query = `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await fetch(
    `${DRIVE_FILES_API}?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error("Failed to list Drive vaults");
  const { files } = await res.json();
  return files as Array<{ id: string; name: string }>;
}

/**
 * Imports a vault from a Drive folder into a local vault.
 * Finds an existing local vault connected to this folder, or creates a new one.
 * Only downloads files that are newer than what's stored locally (via registry diff).
 */
export async function importVaultFromDrive(
  driveFolderId: string,
  folderName: string,
) {
  const db = await getDB();
  const registry = new SyncRegistry(db);
  const metadataService = new CloudSyncMetadataService(registry);

  // Check if any local vault is already connected to this Drive folder
  const localVaults = await listVaults();
  let targetVaultId: string | null = null;

  for (const v of localVaults) {
    const meta = await metadataService.getMetadata(v.id);
    if (meta?.remoteFolderId === driveFolderId) {
      targetVaultId = v.id;
      break;
    }
  }

  if (!targetVaultId) {
    // Create a new local vault and switch to it
    const newId = await vault.createVault(folderName);
    if (!newId) throw new Error("Failed to create local vault");
    targetVaultId = newId;

    await metadataService.saveMetadata({
      vaultId: targetVaultId,
      remoteFolderId: driveFolderId,
      lastSyncTime: 0,
      lastSyncToken: null,
    });

    appEventBus.emit({
      type: "SYNC:DRIVE_CONNECTED",
      domain: "sync",
      payload: { vaultId: targetVaultId, folderId: driveFolderId },
      metadata: { timestamp: Date.now(), vaultId: targetVaultId },
    });
  }

  // Pull — DiffAlgorithm only downloads files newer than local (via registry)
  return runWorkerSync(targetVaultId, "pull");
}
