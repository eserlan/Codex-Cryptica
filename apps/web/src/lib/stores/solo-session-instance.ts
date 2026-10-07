import { base } from "$app/paths";
import { goto } from "$app/navigation";
import {
  browserStorage,
  systemClock,
  systemIdGenerator,
} from "$lib/utils/runtime-deps";
import { vault } from "./vault.svelte";
import { vaultRegistry } from "./vault-registry.svelte";
import { mapStore } from "./map.svelte";
import { sessionJournalStore } from "./session-journal.svelte";
import { sessionModeStore } from "./ui/session-mode.svelte";
import { modalUIStore } from "./ui/modal-ui.svelte";
import { notificationStore } from "./ui/notification.svelte";
import { isSharedPlayOn } from "./ui/shared-play-state";
import { createSoloPlayGuard } from "./ui/solo-play-guard";
import { SoloSessionStore } from "./solo-session.svelte";

/** Production wiring. Tests build their own stores with fakes instead. */
export const soloSessionStore = new SoloSessionStore({
  storage: browserStorage,
  storageEvents: {
    subscribe(cb) {
      if (typeof window === "undefined") return () => {};
      const handler = (e: StorageEvent) => {
        if (e.key) cb(e.key);
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  },
  ids: systemIdGenerator,
  clock: systemClock,
  vaultId: () => vaultRegistry.activeVaultId,
  mapIds: () => Object.keys(vault.maps ?? {}),
  journal: {
    get current() {
      return sessionJournalStore.current ?? null;
    },
    start: () => sessionJournalStore.start(),
    end: () => sessionJournalStore.end(),
    createSection: (name) => sessionJournalStore.createSection(name),
    renameSection: (id, name) => sessionJournalStore.renameSection(id, name),
    setActiveSection: (id) => sessionJournalStore.setActiveSection(id),
  },
  maps: {
    get activeMapId() {
      return mapStore.activeMapId;
    },
    selectMap: (id) => mapStore.selectMap(id),
    setSoloFog: (on) => {
      mapStore.soloFog = on;
    },
  },
  navigate: (path) => goto(`${base}${path}`),
  isGuest: () => sessionModeStore.isGuestMode || vault.isGuest,
  isSharedPlayOn: () => isSharedPlayOn(),
  notify: (message) => notificationStore.notify(message, "info"),
});

/** Production guard. Call sites use these, never sessionModeStore.sharedMode directly. */
export const soloPlayGuard = createSoloPlayGuard({
  soloActive: () => soloSessionStore.isActive,
  isSharedPlayOn: () => isSharedPlayOn(),
  sharedMode: () => sessionModeStore.sharedMode,
  setSharedMode: (on) => {
    sessionModeStore.sharedMode = on;
  },
  openShare: () => modalUIStore.openShare(),
  notify: (message) => notificationStore.notify(message, "info"),
});
