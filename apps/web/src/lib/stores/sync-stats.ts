import { writable } from "svelte/store";
import type { SyncStats, SyncState } from "$lib/cloud-bridge";

const initialStats: SyncStats = {
  filesUploaded: 0,
  filesDownloaded: 0,
  errors: 0,
  duration: 0,
  phase: undefined,
  current: undefined,
  total: undefined,
};

const initialState: SyncState = {
  status: "IDLE",
  stats: initialStats,
};

function createSyncStatsStore() {
  const { subscribe, set, update } = writable<SyncState>(initialState);

  return {
    subscribe,
    setStatus: (status: SyncState["status"]) =>
      update((s) => ({ ...s, status })),
    setError: (error: string) =>
      update((s) => ({ ...s, status: "ERROR", lastError: error })),
    updateStats: (partialStats: Partial<SyncStats>) =>
      update((s) => ({
        ...s,
        stats: { ...(s.stats || initialStats), ...partialStats },
      })),
    reset: () => set(initialState),
  };
}

export const syncStats = createSyncStatsStore();
