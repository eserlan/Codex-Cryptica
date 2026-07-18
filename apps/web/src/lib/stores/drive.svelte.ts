import { appEventBus } from "@codex/events";
import { type CloudSyncMetadata } from "@codex/sync-engine";
import { systemClock } from "$lib/utils/runtime-deps";

export type DriveSyncStatus = "idle" | "syncing" | "error" | "connected";

class DriveStore {
  status = $state<DriveSyncStatus>("idle");
  lastSyncTime = $state<number | null>(null);
  errorMessage = $state<string | null>(null);
  metadata = $state<CloudSyncMetadata | null>(null);

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    appEventBus.subscribe("SYNC:DRIVE_SYNC_STARTED", () => {
      this.status = "syncing";
      this.errorMessage = null;
    });

    appEventBus.subscribe(
      ["SYNC:DRIVE_PUSH_COMPLETE", "SYNC:DRIVE_PULL_COMPLETE"],
      () => {
        this.status = "connected";
        this.lastSyncTime = systemClock.now();
        this.errorMessage = null;
      },
    );

    appEventBus.subscribe("SYNC:DRIVE_SYNC_FAILED", (event) => {
      this.status = "error";
      this.errorMessage = event.payload.error;
    });

    appEventBus.subscribe("SYNC:DRIVE_CONNECTED", (_event) => {
      this.status = "connected";
      this.errorMessage = null;
    });

    appEventBus.subscribe("SYNC:DRIVE_DISCONNECTED", () => {
      this.status = "idle";
      this.metadata = null;
      this.lastSyncTime = null;
    });
  }
}

export const driveStore = new DriveStore();
