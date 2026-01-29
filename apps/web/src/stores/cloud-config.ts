import { writable } from "svelte/store";
import type { CloudConfig } from "$lib/cloud-bridge";
import { browser } from "$app/environment";

const STORAGE_KEY = "codex-cryptica-cloud-config";

const defaultConfig: CloudConfig = {
  enabled: false,
  provider: "gdrive",
  syncInterval: 300000, // 5 minutes
};

function createCloudConfigStore() {
  // Load from localStorage if available
  let initialValue = defaultConfig;
  if (browser) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        initialValue = { ...defaultConfig, ...JSON.parse(stored) };
      } catch (e) {
        console.error("Failed to parse cloud config", e);
      }
    }
  }

  const { subscribe, set, update } = writable<CloudConfig>(initialValue);

  return {
    subscribe,
    setEnabled: (enabled: boolean) =>
      update((cfg) => {
        const newCfg = { ...cfg, enabled };
        save(newCfg);
        return newCfg;
      }),
    setConnectedEmail: (email: string) =>
      update((cfg) => {
        const newCfg = { ...cfg, connectedEmail: email };
        save(newCfg);
        return newCfg;
      }),
    updateLastSync: (timestamp: number) =>
      update((cfg) => {
        const newCfg = { ...cfg, lastSyncTimestamp: timestamp };
        save(newCfg);
        return newCfg;
      }),
    reset: () => {
      set(defaultConfig);
      save(defaultConfig);
    },
  };
}

function save(config: CloudConfig) {
  if (browser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

export const cloudConfig = createCloudConfigStore();
