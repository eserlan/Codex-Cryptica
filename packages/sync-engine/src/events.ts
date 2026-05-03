import { type AppEventDefinition } from "@codex/events";

declare module "@codex/events" {
  interface AppEventRegistry {
    // Local Sync Completion Events
    "SYNC:LOCAL_PUSH_COMPLETE": AppEventDefinition<"sync", { vaultId: string }>;
    "SYNC:LOCAL_PULL_COMPLETE": AppEventDefinition<"sync", { vaultId: string }>;

    // Drive Sync Life-cycle Events
    "SYNC:DRIVE_CONNECTED": AppEventDefinition<
      "sync",
      { vaultId: string; folderId: string; folderName?: string }
    >;
    "SYNC:DRIVE_DISCONNECTED": AppEventDefinition<"sync", { vaultId: string }>;
    "SYNC:DRIVE_SYNC_STARTED": AppEventDefinition<
      "sync",
      { vaultId: string; direction: "push" | "pull" }
    >;
    "SYNC:DRIVE_PUSH_COMPLETE": AppEventDefinition<
      "sync",
      { vaultId: string; uploaded: number; failed: number }
    >;
    "SYNC:DRIVE_PULL_COMPLETE": AppEventDefinition<
      "sync",
      { vaultId: string; downloaded: number; failed: number }
    >;
    "SYNC:DRIVE_SYNC_FAILED": AppEventDefinition<
      "sync",
      { vaultId: string; error: string; reconnectRequired?: boolean }
    >;
  }
}
