/**
 * Gate for group sharing of a vault (shared vault slice 7).
 *
 * On only when `VITE_SHARED_VAULT` is exactly "true", or in a development
 * build when the local switch is set. It is deliberately never switched on by
 * the staging hostname: the staging build is promoted to production as the
 * same artifact. There is no general feature-flag system in the app.
 */
export const SHARED_VAULT_DEV_SWITCH = "codex_shared_vault";

function devSwitchOn(): boolean {
  if (!import.meta.env?.DEV || typeof localStorage === "undefined")
    return false;
  try {
    return localStorage.getItem(SHARED_VAULT_DEV_SWITCH) === "true";
  } catch {
    return false;
  }
}

export function isSharedVaultEnabled(): boolean {
  return import.meta.env?.VITE_SHARED_VAULT === "true" || devSwitchOn();
}
