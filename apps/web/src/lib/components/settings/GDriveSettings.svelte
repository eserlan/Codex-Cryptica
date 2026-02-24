<script lang="ts">
  import { cloudConfig } from "$stores/cloud-config";
  import { gdriveAdapter as adapter } from "$stores/gdrive.svelte";
  import { vaultRegistry } from "$stores/vault-registry.svelte";
  import { vault } from "$stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { getDB, type VaultRecord } from "$lib/utils/idb";
  import { SyncEngine } from "$lib/cloud-bridge/sync-engine/engine";
  import GDriveFolderPicker from "./GDriveFolderPicker.svelte";
  import type { RemoteFileMeta } from "$lib/cloud-bridge";

  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let showPicker = $state(false);

  let activeVault = $derived(
    vaultRegistry.availableVaults.find(
      (v) => v.id === vaultRegistry.activeVaultId,
    ),
  );

  let gdriveSyncEnabled = $derived(activeVault?.gdriveSyncEnabled ?? false);
  let gdriveFolderId = $derived(activeVault?.gdriveFolderId ?? null);

  const registryAdapter = {
    getAllVaults: async () => {
      const db = await getDB();
      return db.getAll("vaults");
    },
    getVault: async (id: string) => {
      const db = await getDB();
      return (await db.get("vaults", id)) || null;
    },
    updateVault: async (vault: { id: string } & Partial<VaultRecord>) => {
      const db = await getDB();
      const existing = (await db.get("vaults", vault.id)) || {};
      await db.put("vaults", { ...existing, ...vault } as any);
    },
  };

  const handleFolderSelect = async (folder: RemoteFileMeta) => {
    if (!activeVault) return;
    isLoading = true;
    error = null;
    showPicker = false;

    try {
      const allVaults = await vaultRegistry.listVaults();
      const existingVault = allVaults.find(
        (v) => v.gdriveFolderId === folder.id,
      );

      if (existingVault) {
        // Vault already exists locally for this folder
        if (existingVault.id !== activeVault.id) {
          uiStore.notify(
            `Switching to existing vault: ${existingVault.name}`,
            "info",
          );
          await vault.switchVault(existingVault.id);
        } else {
          uiStore.notify(
            "This vault is already linked to that folder.",
            "info",
          );
        }
        return;
      }

      // No local vault linked to this folder yet.
      // Strip "Codex - " prefix for local name comparison
      const localName = folder.name.replace(/^Codex\s*-\s*/i, "");

      const existingByName = allVaults.find(
        (v) => v.name.toLowerCase() === localName.toLowerCase(),
      );

      if (existingByName) {
        if (!existingByName.gdriveFolderId) {
          // Found an unlinked vault with the same name, use it!
          uiStore.notify(
            `Linking existing local vault: ${existingByName.name}`,
            "info",
          );
          await vaultRegistry.linkVaultToDrive(existingByName.id, folder.id);
          await vault.switchVault(existingByName.id);
        } else {
          // It exists but is already linked to DIFFERENT folder
          // In this case we fall through to create a new one (registry will handle slug uniqueness)
          await vault.createVaultFromDrive(localName, folder.id);
          uiStore.notify(`Created new vault: ${localName}`, "success");
        }
      } else {
        // No vault by this name exists, create fresh
        await vault.createVaultFromDrive(localName, folder.id);
        uiStore.notify(`Created new vault: ${localName}`, "success");
      }

      // Ensure global config is enabled
      if (!$cloudConfig.enabled) {
        cloudConfig.setEnabled(true);
      }
    } catch (e: any) {
      console.error("Failed to link folder:", e);
      error = e.message;
    } finally {
      isLoading = false;
    }
  };

  const toggleSync = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const enabled = target.checked;

    if (!activeVault) return;

    isLoading = true;
    error = null;

    try {
      // Initialize a temporary SyncEngine just for the linkage metadata operations
      const syncEngine = new SyncEngine({} as any, {} as any, {} as any);

      if (enabled && !activeVault.gdriveFolderId) {
        if (!adapter.isAuthenticated()) {
          throw new Error("Must connect to Google Drive first.");
        }

        const rootFolderId = await adapter.getOrCreateCodexRoot();
        const expectedFolderName = `Codex - ${activeVault.name}`;

        // Use atomic(ish) helper to find or create the folder, handling duplicates by name
        const folderId = await adapter.getOrCreateFolder(
          expectedFolderName,
          rootFolderId,
        );

        console.log(
          `[GDriveSettings] Using folder '${expectedFolderName}' (${folderId})`,
        );

        await syncEngine.linkVaultToDrive(
          activeVault.id,
          folderId,
          registryAdapter as any,
        );
      } else if (enabled && activeVault.gdriveFolderId) {
        await registryAdapter.updateVault({
          id: activeVault.id,
          gdriveSyncEnabled: true,
        });
      } else if (!enabled) {
        await syncEngine.unlinkVaultFromDrive(
          activeVault.id,
          registryAdapter as any,
        );
      }

      await vaultRegistry.listVaults(); // Refresh store

      // Ensure global config is also enabled so the Sync engine starts
      if (enabled && !$cloudConfig.enabled) {
        cloudConfig.setEnabled(true);
      }

      // If sync was disabled for this vault, and no vaults remain linked, disable global sync
      if (!enabled) {
        const anyLinked = vaultRegistry.availableVaults.some(
          (vault) => vault.gdriveSyncEnabled,
        );

        if (!anyLinked && $cloudConfig.enabled) {
          cloudConfig.setEnabled(false);
        }
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
        <div class="flex items-center gap-2 mt-1">
          <span class="text-[10px] text-theme-muted font-mono">
            Folder ID: {gdriveFolderId}
          </span>
          <a
            href="https://drive.google.com/drive/u/0/folders/{gdriveFolderId}"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[10px] text-theme-secondary hover:text-theme-primary flex items-center gap-1 hover:underline"
            title="Open in Google Drive"
          >
            Open <span class="icon-[lucide--external-link] w-3 h-3"></span>
          </a>
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-4">
      {#if !gdriveSyncEnabled && !showPicker}
        <button
          class="text-[10px] text-theme-primary hover:text-theme-secondary font-bold uppercase tracking-wider px-2 py-1 border border-theme-primary/30 rounded hover:border-theme-primary transition-all"
          onclick={() => (showPicker = true)}
          disabled={isLoading}
        >
          Link Existing
        </button>
      {/if}

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
  </div>

  {#if showPicker}
    <GDriveFolderPicker
      onSelect={handleFolderSelect}
      onCancel={() => (showPicker = false)}
    />
  {/if}

  {#if error}
    <div
      class="text-theme-accent text-xs bg-theme-accent/10 p-2 border border-theme-accent/30 rounded"
    >
      {error}
    </div>
  {/if}
</div>
