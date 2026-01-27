import SyncWorker from "$workers/sync?worker";
import { cloudConfig } from "$stores/cloud-config";
import { get } from "svelte/store";
import { vault } from "$lib/stores/vault.svelte";
import { browser } from "$app/environment";
import type { CloudConfig } from "./index";

export class WorkerBridge {
  // worker will be undefined in SSR
  private worker!: Worker;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    if (browser) {
      this.worker = new SyncWorker();
      this.setupListeners();
    }

    if (browser) {
      // Setup periodic sync based on config only if enabled
      const unsub = cloudConfig.subscribe((config: CloudConfig) => {
        if (this.syncIntervalId) clearInterval(this.syncIntervalId);
        if (config.enabled && config.syncInterval > 0) {
          this.syncIntervalId = setInterval(
            () => this.startSync(),
            config.syncInterval,
          );
        }
      });
      this.unsubscribers.push(unsub);
    }
  }

  public destroy() {
    this.unsubscribers.forEach(u => u());
    if (this.syncIntervalId) clearInterval(this.syncIntervalId);
    this.worker.terminate();
  }

  private setupListeners() {
    this.worker.onmessage = (event) => {
      const { type, payload } = event.data;

      // Since this is a class-based bridge, we'll import the store directly
      // but we need to handle the store update carefully.
      import("$stores/sync-stats").then(({ syncStats }) => {
        switch (type) {
          case "SYNC_STATUS":
            syncStats.setStatus(payload);
            break;
          case "SYNC_COMPLETE":
            syncStats.updateStats({
              filesUploaded: payload.uploads,
              filesDownloaded: payload.downloads,
            });
            cloudConfig.updateLastSync(Date.now());
            break;
          case "SYNC_ERROR":
            syncStats.setError(payload);
            break;
        }
      });
    };
  }

  async startSync() {
    console.group("[WorkerBridge] startSync");
    const config = get(cloudConfig) as CloudConfig;
    console.log("[WorkerBridge] Config:", config);

    if (!config.enabled) {
      console.warn("Sync aborted: config.enabled is false");
      console.groupEnd();
      return;
    }

    // Check gapi token directly
    const tokenObj =
      typeof gapi !== "undefined" && gapi.client ? gapi.client.getToken() : null;
    const token = tokenObj?.access_token;

    console.log("[WorkerBridge] GAPI Token Status:", {
      defined: typeof gapi !== 'undefined',
      hasClient: typeof gapi !== 'undefined' && !!gapi.client,
      tokenObj: tokenObj ? "PRESENT" : "NULL",
      accessToken: token ? "PRESENT (hidden)" : "MISSING"
    });

    if (!token) {
      console.warn("Sync aborted: no gapi access token found");
      console.groupEnd();
      return;
    }

    const email = config.connectedEmail;
    const storageKey = `gdrive_folder_id:${email}`;
    const folderId = localStorage.getItem(storageKey);
    const rootHandle = vault.rootHandle;

    console.log("[WorkerBridge] Sync Parameters:", {
      email,
      folderId,
      hasRootHandle: !!rootHandle,
    });


    console.log("Posting INIT_SYNC + START_SYNC to worker...");
    // Send single initialization + start command to avoid race condition
    this.worker.postMessage({
      type: "INIT_SYNC",
      payload: {
        accessToken: token,
        folderId: folderId || undefined,
        rootHandle: rootHandle
      }
    });

    this.worker.postMessage({ type: "START_SYNC" });
    console.groupEnd();
  }
}

export const workerBridge = new WorkerBridge();
