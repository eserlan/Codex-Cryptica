/// <reference lib="webworker" />

import { expose } from "comlink";
import {
  SyncService,
  CloudSyncMetadataService,
  GDriveBackend,
  OpfsBackend,
  SyncRegistry,
} from "@codex/sync-engine";
import { openDB } from "idb";

async function getDB() {
  return openDB("CodexCryptica", 19);
}

export interface WorkerAuthProxy {
  getAccessToken(): Promise<string | null>;
  signOut(): Promise<void>;
}

export interface WorkerEventBusProxy {
  emit(event: any): void;
}

export class GDriveSyncWorker {
  async runSync(
    vaultId: string,
    direction: "push" | "pull",
    folderId: string,
    opfsHandle: FileSystemDirectoryHandle,
    authProxy: WorkerAuthProxy,
    eventBusProxy: WorkerEventBusProxy,
  ) {
    console.log(
      `[GDriveSyncWorker] Starting ${direction} for vault: ${vaultId}`,
    );

    eventBusProxy.emit({
      type: "SYNC:DRIVE_SYNC_STARTED",
      domain: "sync",
      payload: { vaultId, direction },
      metadata: { timestamp: Date.now(), vaultId },
    });

    try {
      const db = await getDB();
      const registry = new SyncRegistry(db);
      const syncService = new SyncService(registry);
      const metadataService = new CloudSyncMetadataService(registry);

      const driveBackend = new GDriveBackend(authProxy, vaultId);
      const opfsBackend = new OpfsBackend(opfsHandle, registry);

      driveBackend.setVaultFolderId(folderId);

      const result = await syncService.sync(
        vaultId,
        driveBackend,
        opfsBackend,
        direction,
        undefined,
        undefined,
        (_stats) => {
          // Progress can be emitted here if needed
        },
        undefined,
        10, // concurrency for parallel uploads/downloads
      );

      if (result.error) {
        eventBusProxy.emit({
          type: "SYNC:DRIVE_SYNC_FAILED",
          domain: "sync",
          payload: { vaultId, error: result.error },
          metadata: { timestamp: Date.now(), vaultId },
        });
        throw new Error(result.error);
      } else {
        await metadataService.updateLastSync(vaultId);
        eventBusProxy.emit({
          type:
            direction === "push"
              ? "SYNC:DRIVE_PUSH_COMPLETE"
              : "SYNC:DRIVE_PULL_COMPLETE",
          domain: "sync",
          payload: {
            vaultId,
            [direction === "push" ? "uploaded" : "downloaded"]:
              result.created.length + result.updated.length,
            failed: result.failed.length,
          },
          metadata: { timestamp: Date.now(), vaultId },
        });
        return result;
      }
    } catch (error: any) {
      eventBusProxy.emit({
        type: "SYNC:DRIVE_SYNC_FAILED",
        domain: "sync",
        payload: { vaultId, error: error.message },
        metadata: { timestamp: Date.now(), vaultId },
      });
      throw error;
    }
  }
}

expose(new GDriveSyncWorker());
