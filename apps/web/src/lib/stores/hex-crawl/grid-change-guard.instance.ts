import { countHexRecords, normalizeHexCrawlState } from "hex-crawl-engine";
import { vault } from "#lib/stores/vault.svelte.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { GridChangeGuard } from "./grid-change-guard.svelte";

/** The app-wide grid change guard, wired to the vault and the confirmation dialog. */
export const hexGridChangeGuard = new GridChangeGuard({
  confirm: (options) => notificationStore.confirm(options),
  getRecordCount: (mapId) =>
    countHexRecords(normalizeHexCrawlState(vault.maps?.[mapId]?.hexCrawl)),
});
