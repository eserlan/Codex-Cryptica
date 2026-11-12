import type { VaultStore } from "../vault.svelte";
import { debugStore } from "../debug.svelte";

/** Preserve the vault across hot reloads and expose it for development captures. */
export function getVaultSingleton(createVault: () => VaultStore): VaultStore {
  const VAULT_KEY = "__codex_vault_instance__";

  const vault: VaultStore =
    (globalThis as any)[VAULT_KEY] ??
    ((globalThis as any)[VAULT_KEY] = createVault());

  if (
    typeof window !== "undefined" &&
    (import.meta.env.DEV ||
      (globalThis as { __CODEX_PERFORMANCE_CAPTURE__?: boolean })
        .__CODEX_PERFORMANCE_CAPTURE__ === true)
  ) {
    (window as any).vault = vault;
    debugStore.log("[VaultStore] Module loaded, vault attached to window");
  }

  return vault;
}
