import { DeckService } from "random-source-engine";
import { vault } from "$lib/stores/vault.svelte";
import { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
import { VaultDeckStateStore } from "$lib/stores/deck-state-store";
import { VaultRandomSourceFiles } from "./vault-random-source-files";

export { VaultRandomSourceFiles } from "./vault-random-source-files";
export type { RandomVaultDeps } from "./vault-random-source-files";

const files = new VaultRandomSourceFiles({
  activeVaultId: () => vault.activeVaultId ?? null,
  vaultHandle: async () => (await vault.getActiveVaultHandle()) ?? null,
});

/** Tables and decks of the open vault. */
export const randomSources = new RandomSourceStore(files);

/** Draw state, kept beside the decks in the same vault. */
export const deckService = new DeckService(new VaultDeckStateStore(files));

/** `undefined` until the first load; the vault id it was loaded from after. */
let loadedVaultId: string | null | undefined;

/**
 * Loads the active vault's sources, and reloads after a vault switch.
 *
 * Called on mount by every view that reads sources: a switch replaces the whole
 * collection, and showing another vault's tables would be worse than a reload.
 */
export async function ensureRandomSourcesLoaded(force = false): Promise<void> {
  const vaultId = vault.activeVaultId ?? null;
  if (!force && vaultId === loadedVaultId) return;
  // A view can mount before the vault is open — on a reload, it usually does.
  // Reading then would find nothing and, worse, remember that as loaded.
  if (!vaultId) return;
  loadedVaultId = vaultId;
  await randomSources.load();
}
