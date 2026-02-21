<script lang="ts">
  import { cloudConfig } from "$stores/cloud-config";
  import { gdriveAdapter as adapter } from "$stores/gdrive.svelte";
  import { vaultRegistry } from "$stores/vault-registry.svelte";
  import { getDB } from "$lib/utils/idb";
  import { SyncEngine } from "$lib/cloud-bridge/sync-engine/engine";

  let isLoading = $state(false);
  let error = $state<string | null>(null);

  let activeVault = $derived(
    vaultRegistry.availableVaults.find(
      (v) => v.id === vaultRegistry.activeVaultId,
    ),
  );

  let gdriveSyncEnabled = $derived(activeVault?.gdriveSyncEnabled ?? false);
  let gdriveFolderId = $derived(activeVault?.gdriveFolderId ?? null);

  const toggleSync = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const enabled = target.checked;

    if (!activeVault) return;

    isLoading = true;
    error = null;

    try {
      // Initialize a temporary SyncEngine just for the linkage metadata operations
      // Note: Full injection not possible here as we lack adapter instances, so we use dummy ones
      // since linkVaultToDrive only requires the registry dependency now.
      const syncEngine = new SyncEngine({} as any, {} as any, {} as any);

      const registryAdapter = {
        getAllVaults: async () => {
          const db = await getDB();
          return db.getAll("vaults");
        },
        getVault: async (id: string) => {
          const db = await getDB();
          return db.get("vaults", id);
        },
        updateVault: async (vault: any) => {
          const db = await getDB();
          await db.put("vaults", vault);
        },
      };

      if (enabled && !activeVault.gdriveFolderId) {
        if (!adapter.isAuthenticated()) {
          throw new Error("Must connect to Google Drive first.");
        }

        const folderId = await adapter.createFolder(
          `Codex - ${activeVault.name}`,
        );
        await syncEngine.linkVaultToDrive(
          activeVault.id,
          folderId,
          registryAdapter,
        );
      } else if (!enabled) {
        await syncEngine.unlinkVaultFromDrive(activeVault.id, registryAdapter);
      }

      await vaultRegistry.listVaults(); // Refresh store

      // Ensure global config is also enabled so the Sync engine starts
      if (enabled && !$cloudConfig.enabled) {
        cloudConfig.setEnabled(true);
      }
    } catch (e: any) {
      console.error("Failed to toggle vault sync:", e);
      error = e.message;
      // Revert the toggle visually if it failed
      target.checked = !enabled;
    } finally {
      isLoading = false;
    }
  };
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between">
    <div class="flex flex-col">
      <span class="text-xs text-theme-muted uppercase">Vault Sync</span>
      <span class="text-theme-primary font-bold">
        {activeVault?.name || "No Vault Selected"}
      </span>
      {#if gdriveFolderId}
        <span class="text-[10px] text-theme-muted font-mono mt-1">
          Folder ID: {gdriveFolderId}
        </span>
      {/if}
    </div>

    <label class="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={gdriveSyncEnabled}
        onchange={toggleSync}
        disabled={!activeVault || isLoading}
        class="sr-only peer"
      />
      <div
        class="w-8 h-4 bg-theme-bg border border-theme-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-muted after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-theme-primary/20 peer-checked:after:bg-theme-primary peer-disabled:opacity-50"
      ></div>
    </label>
  </div>
  {#if error}
    <div
      class="text-theme-accent text-xs bg-theme-accent/10 p-2 border border-theme-accent/30 rounded"
    >
      {error}
    </div>
  {/if}
</div>
