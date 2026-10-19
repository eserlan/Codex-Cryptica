import { untrack } from "svelte";

export interface MapAssetSyncDeps<M> {
  /** Changes only when the map's image must be (re)loaded. */
  signature: () => string | null;
  activeMap: () => M | null;
  /** Starts loading `map`'s assets; returns a function that cancels it. */
  sync: (map: M | null) => () => void;
}

/**
 * Loads the active map's assets whenever its signature changes, and lets the
 * user retry a failed load. Call during component initialisation.
 *
 * Only the signature may re-run the effect. While the vault starts, the map
 * registry is re-set and the active map re-selected, so the active map
 * becomes a new object with the same signature. If that re-ran the effect,
 * its cleanup would cancel the image load and the signature check would skip
 * restarting it, leaving the map on "Synthesizing Spatial Asset..." for good.
 */
export function syncMapAssets<M>(deps: MapAssetSyncDeps<M>) {
  let retryNonce = $state(0);
  let lastSignature: string | null = null;
  // Derived, so an equal signature from a new map object does not notify.
  const currentSignature = $derived(deps.signature());

  $effect(() => {
    void retryNonce;
    const signature = currentSignature;
    if (signature === lastSignature) return;
    lastSignature = signature;
    return untrack(() => deps.sync(deps.activeMap()));
  });

  return {
    /** Forget the last signature so the asset loads again. */
    retry() {
      lastSignature = null;
      retryNonce += 1;
    },
  };
}
