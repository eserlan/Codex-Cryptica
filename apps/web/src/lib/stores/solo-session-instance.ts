import { base } from "$app/paths";
import { appEventBus } from "@codex/events";
import { JOURNAL_EVENTS } from "session-journal-engine";
import { goto } from "$app/navigation";
import {
  browserStorage,
  systemClock,
  systemIdGenerator,
} from "$lib/utils/runtime-deps";
import { characterChoices } from "$lib/services/solo-characters";
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
import { createDraftOnlyPromoter } from "./session-journal-promoter";
import { SoloTablePinsStore } from "./solo-table-pins.svelte";
import { randomSources } from "$lib/features/random";
import { vaultRegistry as registry } from "./vault-registry.svelte";
import { SoloThreadsStore } from "./solo-threads.svelte";
import { getVaultDir } from "$lib/utils/opfs";
import {
  opfsVaultFiles,
  type VaultFileAccess,
} from "$lib/services/vault-threads-file";

/**
 * The vault's threads file, read and written through the vault's own OPFS
 * directory. Guests have no vault directory, so their threads are not kept.
 */
function vaultFiles(vaultId: string): VaultFileAccess | null {
  const root = vaultRegistry.rootHandle;
  if (!root || vault.isGuest) return null;
  const files = async () =>
    opfsVaultFiles(await getVaultDir(root, vaultId), vaultId);
  return {
    async read(path) {
      return (await files()).read(path);
    },
    async write(path, text) {
      return (await files()).write(path, text);
    },
  };
}

/** The active vault's threads (spec 174, US3). Production wiring. */
export const soloThreads = new SoloThreadsStore({
  vaultId: () => vaultRegistry.activeVaultId ?? null,
  files: (vaultId) => vaultFiles(vaultId),
  readOnly: () => vault.isGuest,
  entityIds: () => new Set(Object.keys(vault.entities ?? {})),
  ids: systemIdGenerator,
  clock: systemClock,
  publishCapture: (payload) => {
    appEventBus.emit({
      type: JOURNAL_EVENTS.CAPTURE,
      domain: "journal",
      payload,
      metadata: { timestamp: systemClock.now() },
    });
  },
  notify: (message) => notificationStore.notify(message, "info"),
});

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
  openThreads: () =>
    soloThreads.open.map((thread) => ({ id: thread.id, title: thread.title })),
  placeName: () => {
    const mapId = mapStore.activeMapId;
    return mapId ? (vault.entities?.[mapId]?.title ?? null) : null;
  },
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
  characters: () => characterChoices(vault.entities),
  publishCapture: (payload) => {
    appEventBus.emit({
      type: JOURNAL_EVENTS.CAPTURE,
      domain: "journal",
      payload,
      metadata: { timestamp: systemClock.now() },
    });
  },
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

/**
 * Saves a journal result as a draft from the solo bar. Stays on the current
 * screen (FR-002): no entity panel opens and the scratchpad is not closed.
 */
export const soloPromoter = createDraftOnlyPromoter({
  createEntity: (type, title, data) => vault.createEntity(type, title, data),
  notify: (message) => notificationStore.notify(message, "success"),
});

/** Pinned random tables on the solo bar (per vault, on this device). */
export const soloTablePins = new SoloTablePinsStore({
  storage: browserStorage,
  vaultId: () => registry.activeVaultId,
  tableIds: () => randomSources.tables.map((table) => table.id),
});
