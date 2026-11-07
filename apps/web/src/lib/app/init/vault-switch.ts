import { vault } from "#lib/stores/vault.svelte.js";

// The vault's game-system profile (#3943) sets generator and sheet defaults.
async function initSystemProfile() {
  try {
    const { systemProfileStore } =
      await import("#lib/stores/system-profile.svelte.js");
    await systemProfileStore.init(vault.activeVaultId);
  } catch (err) {
    console.error(
      "[AppInit] Failed to load the vault's game system profile:",
      err,
    );
  }
}

async function handleVaultSwitched() {
  void initSystemProfile();
  try {
    const { calendarStore } = await import("#lib/stores/calendar.svelte.js");
    const { timelineStore } = await import("#lib/stores/timeline.svelte.js");
    await calendarStore.init();
    timelineStore.resetVaultGuard();
    void timelineStore.init();
  } catch (err) {
    console.error(
      "[AppInit] Failed to initialize calendar store on vault switch:",
      err,
    );
  }
}

export function registerVaultSwitchListener(): () => void {
  const onVaultSwitched = () => handleVaultSwitched();
  window.addEventListener("vault-switched", onVaultSwitched);
  return () => window.removeEventListener("vault-switched", onVaultSwitched);
}
