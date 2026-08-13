<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import {
    exportVaultToZip,
    parseVaultArchive,
    writeArchiveToVault,
    VAULT_ARCHIVE_EXTENSION,
  } from "$lib/utils/vault-archive";

  let isExporting = $state(false);
  let isImporting = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);

  const handleExport = async () => {
    if (!vault.activeVaultId) {
      notificationStore.notify("No active vault to export.", "error");
      return;
    }
    isExporting = true;
    try {
      const count = await exportVaultToZip(
        vault.activeVaultId,
        vault.vaultName || "Vault",
      );
      notificationStore.notify(
        `Backup ready — ${count} file${count === 1 ? "" : "s"} downloaded.`,
        "success",
      );
    } catch (e) {
      console.error("[VaultBackup] Export failed:", e);
      notificationStore.notify(
        e instanceof Error ? e.message : "Failed to export vault.",
        "error",
      );
    } finally {
      isExporting = false;
    }
  };

  const handleImportFile = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset so selecting the same file again re-triggers change.
    input.value = "";
    if (!file) return;

    isImporting = true;
    try {
      const archive = await parseVaultArchive(file);
      const newVaultId = await vaultRegistry.createVault(archive.vaultName);
      const count = await writeArchiveToVault(newVaultId, archive);
      await vault.switchVault(newVaultId);
      notificationStore.notify(
        `Imported "${archive.vaultName}" — ${count} file${count === 1 ? "" : "s"} restored.`,
        "success",
      );
    } catch (e) {
      console.error("[VaultBackup] Import failed:", e);
      notificationStore.notify(
        e instanceof Error ? e.message : "Failed to import backup.",
        "error",
        true,
      );
    } finally {
      isImporting = false;
    }
  };
</script>

<div>
  <h3
    class="text-base font-bold text-theme-primary uppercase font-header tracking-widest mb-4"
  >
    Portable Backup
  </h3>
  <div
    class="bg-theme-bg/50 border border-theme-border p-4 rounded-lg space-y-4"
  >
    <p class="text-[11px] text-theme-muted leading-relaxed">
      Download your entire vault as a single <code class="text-theme-secondary"
        >{VAULT_ARCHIVE_EXTENSION}</code
      >
      file, or restore one into a new vault. This works in every browser — no folder
      permissions needed — so it's the recommended backup if "Save to Folder" isn't
      available (Firefox, Safari, or Brave with the file-system-access flag off).
    </p>

    <div class="grid grid-cols-2 gap-4">
      <button
        onclick={handleExport}
        disabled={isExporting || isImporting}
        aria-busy={isExporting}
        class="flex flex-col items-center gap-2 p-4 rounded-lg border border-theme-border bg-theme-surface hover:border-theme-primary/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span
          class="icon-[lucide--download] h-6 w-6 text-theme-primary group-hover:scale-110 transition-transform"
        ></span>
        <span
          class="text-xs font-bold uppercase tracking-widest text-theme-text"
        >
          {isExporting ? "Preparing..." : "Export Backup"}
        </span>
      </button>

      <button
        onclick={() => fileInput?.click()}
        disabled={isExporting || isImporting}
        aria-busy={isImporting}
        class="flex flex-col items-center gap-2 p-4 rounded-lg border border-theme-border bg-theme-surface hover:border-theme-primary/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span
          class="icon-[lucide--upload] h-6 w-6 text-theme-secondary group-hover:scale-110 transition-transform"
        ></span>
        <span
          class="text-xs font-bold uppercase tracking-widest text-theme-text"
        >
          {isImporting ? "Importing..." : "Import Backup"}
        </span>
      </button>
    </div>

    <input
      bind:this={fileInput}
      type="file"
      accept=".zip,application/zip"
      class="hidden"
      onchange={handleImportFile}
    />
  </div>
</div>
