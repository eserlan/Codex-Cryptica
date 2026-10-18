import { sessionModeStore } from "./session-mode.svelte";
import { p2pHost } from "../../cloud-bridge/p2p/host-service.svelte";

/** Reads whether shared play (Shared Mode or hosting) is on. */
export interface SharedPlayReader {
  sharedMode(): boolean;
  hosting(): boolean;
}

export const productionSharedPlayReader: SharedPlayReader = {
  sharedMode: () => sessionModeStore.sharedMode,
  hosting: () => p2pHost.isHosting,
};

/**
 * True while the vault is shared with other people. This module imports
 * neither the solo session store nor the guard, so they can both use it
 * without an import cycle.
 */
export function isSharedPlayOn(
  reader: SharedPlayReader = productionSharedPlayReader,
): boolean {
  return reader.sharedMode() || reader.hosting();
}
