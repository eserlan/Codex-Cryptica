import { browser } from "$app/environment";

/**
 * Single shared reactive source for network online/offline status (#1494).
 *
 * Replaces the hand-rolled `navigator.onLine` + window listener blocks that were
 * being copy-pasted across components (DriveStatus, VaultControls, the SEO
 * generator layout, ...). The value is seeded from `navigator.onLine` at module
 * load on the client — before any component's `onMount` runs — which avoids the
 * brief "assumed online" flash a per-component `onMount` seed produced.
 *
 * The singleton lives for the lifetime of the app, so its listeners are never
 * torn down (by design).
 */
class OnlineStatus {
  #online = $state(browser ? navigator.onLine : true);

  constructor() {
    if (browser) {
      const update = () => {
        this.#online = navigator.onLine;
      };
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
    }
  }

  /** Reactive: `true` when the browser reports a network connection. */
  get current(): boolean {
    return this.#online;
  }
}

export const onlineStatus = new OnlineStatus();
