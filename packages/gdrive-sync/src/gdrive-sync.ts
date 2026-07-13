import { wrap, proxy } from "comlink";
import {
  CloudSyncMetadataService,
  GDriveBackend,
  SyncRegistry,
} from "@codex/sync-engine";
import { gdriveAuthService } from "./gdrive-auth";
import type { GDriveSyncWorker } from "./gdrive-sync.worker";

export interface GDriveSyncConfig {
  getDB: () => Promise<any>;
  /** Passed into the worker's own openDB(...) call so it stays in sync with the host app's IndexedDB name/version rather than hard-coding them. */
  dbName: string;
  dbVersion: number;
  appEventBus: { emit: (event: any) => void };
  vault: {
    activeVaultId: string | null;
    activeVaultRecord: { name: string } | null;
    createVault: (name: string) => Promise<string | null>;
    switchVault: (vaultId: string) => Promise<void>;
    getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | null>;
    getSpecificVaultHandle: (
      vaultId: string,
    ) => Promise<FileSystemDirectoryHandle | null>;
  };
  listVaults: () => Promise<Array<{ id: string; name: string }>>;
}

let config: GDriveSyncConfig | null = null;

export function configureGDriveSync(c: GDriveSyncConfig) {
  config = c;
}

function getConfig(): GDriveSyncConfig {
  if (!config) {
    throw new Error(
      "GDriveSync service has not been configured. Call configureGDriveSync first.",
    );
  }
  return config;
}

let workerInstance: any = null;
let isSyncing = false;

function getWorker() {
  if (!workerInstance) {
    const worker = new Worker(
      new URL("./gdrive-sync.worker.ts", import.meta.url),
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
 * Thin client for the Drive REST calls this module makes. Owns the only `fetch`
 * usages here so the network seam is constructor-injectable (Constitution VIII);
 * the module functions below delegate to the {@link driveRest} singleton.
 */
export class DriveRestClient {
  constructor(
    // Injected for tests; default wraps the global `fetch` lazily.
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  private authHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Escapes a value for safe interpolation inside a single-quoted Drive query
   * term. Without this, names containing `'` (e.g. "O'Reilly") produce an
   * invalid query and fail to match existing folders (creating duplicates).
   */
  private escapeQueryValue(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  async findOrCreateFolder(
    token: string,
    name: string,
    parentId?: string,
  ): Promise<string> {
    const parentClause = parentId
      ? `'${parentId}' in parents`
      : `'root' in parents`;
    const query = `name='${this.escapeQueryValue(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false and ${parentClause}`;
    const searchRes = await this.fetcher(
      `${DRIVE_FILES_API}?q=${encodeURIComponent(query)}&fields=files(id)`,
      { headers: this.authHeaders(token) },
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
    const createRes = await this.fetcher(DRIVE_FILES_API, {
      method: "POST",
      headers: {
        ...this.authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!createRes.ok)
      throw new Error(`Failed to create Drive folder "${name}"`);
    const data = await createRes.json();
    return data.id;
  }

  /** Lists immediate subfolders of `parentId`, ordered by name. */
  async listSubfolders(
    token: string,
    parentId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const res = await this.fetcher(
      `${DRIVE_FILES_API}?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name`,
      { headers: this.authHeaders(token) },
    );
    if (!res.ok) throw new Error("Failed to list Drive vaults");
    const { files } = await res.json();
    return files as Array<{ id: string; name: string }>;
  }

  /** Raw folder-metadata response so callers keep their status-specific errors. */
  async getFolderMetadataResponse(
    token: string,
    folderId: string,
  ): Promise<Response> {
    return this.fetcher(
      `${DRIVE_FILES_API}/${folderId}?fields=id,name,trashed`,
      {
        headers: this.authHeaders(token),
      },
    );
  }
}

export const driveRest = new DriveRestClient();

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

  const cfg = getConfig();
  const db = await cfg.getDB();
  const registry = new SyncRegistry(db);
  const metadataService = new CloudSyncMetadataService(registry);
  const driveBackend = new GDriveBackend(gdriveAuthService, vaultId);

  let finalFolderId = folderId;

  if (!finalFolderId) {
    const vaultName = cfg.vault.activeVaultRecord?.name || "Unnamed Vault";
    const rootFolderId = await driveRest.findOrCreateFolder(
      token,
      ROOT_FOLDER_NAME,
    );
    finalFolderId = await driveRest.findOrCreateFolder(
      token,
      vaultName,
      rootFolderId,
    );
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

  cfg.appEventBus.emit({
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
  const cfg = getConfig();
  const db = await cfg.getDB();
  const registry = new SyncRegistry(db);
  const metadataService = new CloudSyncMetadataService(registry);

  await metadataService.clearMetadata(vaultId);

  cfg.appEventBus.emit({
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

  const cfg = getConfig();
  const db = await cfg.getDB();
  const ms = new CloudSyncMetadataService(new SyncRegistry(db));
  const metadata = await ms.getMetadata(vaultId);

  if (!metadata || !metadata.remoteFolderId) {
    throw new Error("Google Drive not connected for this vault");
  }

  const opfsHandle =
    cfg.vault.activeVaultId === vaultId
      ? await cfg.vault.getActiveVaultHandle()
      : await cfg.vault.getSpecificVaultHandle(vaultId);

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
      emit: (event: any) => cfg.appEventBus.emit(event),
    });

    await worker.runSync(
      vaultId,
      direction,
      metadata.remoteFolderId,
      opfsHandle,
      authProxy,
      eventBusProxy,
      cfg.dbName,
      cfg.dbVersion,
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

  const rootFolderId = await driveRest.findOrCreateFolder(
    token,
    ROOT_FOLDER_NAME,
  );
  return driveRest.listSubfolders(token, rootFolderId);
}

/**
 * Extracts a Google Drive folder ID from a share URL or returns the input as-is
 * if it already looks like a bare folder ID.
 *
 * Handles formats:
 *   https://drive.google.com/drive/folders/FOLDER_ID
 *   https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
 *   https://drive.google.com/drive/u/0/folders/FOLDER_ID
 */
export function parseDriveFolderUrl(input: string): string | null {
  const trimmed = input.trim();
  // Try URL parse first
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  } catch {
    // Not a URL — treat as bare ID
  }
  // Bare folder ID: alphanumeric + dashes/underscores, 20–60 chars
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(trimmed)) return trimmed;
  return null;
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
  const cfg = getConfig();
  const db = await cfg.getDB();
  const registry = new SyncRegistry(db);
  const metadataService = new CloudSyncMetadataService(registry);

  // Check if any local vault is already connected to this Drive folder
  const localVaults = await cfg.listVaults();
  let targetVaultId: string | null = null;

  const vaultMetas = await Promise.all(
    localVaults.map(async (v) => ({
      id: v.id,
      meta: await metadataService.getMetadata(v.id),
    })),
  );
  const matchingVault = vaultMetas.find(
    (vm) => vm.meta?.remoteFolderId === driveFolderId,
  );
  if (matchingVault) targetVaultId = matchingVault.id;

  if (!targetVaultId) {
    // Create a new local vault and switch to it
    const newId = await cfg.vault.createVault(folderName);
    if (!newId) throw new Error("Failed to create local vault");
    targetVaultId = newId;

    await metadataService.saveMetadata({
      vaultId: newId,
      remoteFolderId: driveFolderId,
      lastSyncTime: 0,
      lastSyncToken: null,
    });

    cfg.appEventBus.emit({
      type: "SYNC:DRIVE_CONNECTED",
      domain: "sync",
      payload: { vaultId: newId, folderId: driveFolderId },
      metadata: { timestamp: Date.now(), vaultId: newId },
    });
  } else if (cfg.vault.activeVaultId !== targetVaultId) {
    // Switch to the existing matching vault so the user is taken to it
    await cfg.vault.switchVault(targetVaultId);
  }

  // Pull — DiffAlgorithm only downloads files newer than local (via registry)
  return runWorkerSync(targetVaultId!, "pull");
}

/**
 * Joins a vault shared by another user via a Drive folder link or bare folder ID.
 * Requests the broader "drive" scope so the app can read folders it didn't create,
 * fetches the folder name, then delegates to importVaultFromDrive.
 */
export async function joinSharedVault(urlOrId: string): Promise<void> {
  const folderId = parseDriveFolderUrl(urlOrId);
  if (!folderId)
    throw new Error("Could not extract a folder ID from that link.");

  // drive scope is required to read folders owned by another user.
  // drive.file only covers files this app created in the current user's Drive.
  const token = await gdriveAuthService.getTokenWithScope(
    "https://www.googleapis.com/auth/drive",
  );

  // Fetch folder metadata to get its name
  const res = await driveRest.getFolderMetadataResponse(token, folderId);
  if (!res.ok) {
    if (res.status === 404 || res.status === 403) {
      throw new Error(
        "Folder not found or not shared with you. Ask the vault owner to share the folder.",
      );
    }
    throw new Error("Failed to access the shared Drive folder.");
  }
  const folder = await res.json();
  if (folder.trashed) throw new Error("That folder has been deleted.");

  await importVaultFromDrive(folderId, folder.name);
}
