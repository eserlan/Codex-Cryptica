<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";

  let isSyncing = $derived(vault.status === "saving");
  let title = $derived(
    vault.syncType === "cloud" ? "Cloud Synchronization" : "Local Folder Sync",
  );
  let provider = $derived(
    vault.syncType === "cloud" ? "Google Drive" : "FileSystem",
  );
</script>

{#if isSyncing}
  <div
    class="fixed bottom-4 right-4 p-4 bg-bg-surface border border-accent-primary rounded-lg shadow-xl z-50 min-w-[300px]"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="font-bold text-accent-primary">{title}...</span>
      <span class="text-xs opacity-60">{provider}</span>
    </div>

    <div
      class="w-full bg-accent-primary/10 h-2 rounded-full overflow-hidden mb-3"
    >
      <div
        class="bg-accent-primary h-full transition-all duration-300"
        style="width: {vault.syncStats.progress}%"
      ></div>
    </div>

    <div class="grid grid-cols-4 text-center text-xs opacity-80">
      <div class="flex flex-col">
        <span class="font-bold">{vault.syncStats.created}</span>
        <span>New</span>
      </div>
      <div class="flex flex-col">
        <span class="font-bold">{vault.syncStats.updated}</span>
        <span>Updated</span>
      </div>
      <div class="flex flex-col">
        <span class="font-bold">{vault.syncStats.deleted}</span>
        <span>Deleted</span>
      </div>
      <div class="flex flex-col">
        <span class="font-bold text-red-500">{vault.syncStats.failed}</span>
        <span>Failed</span>
      </div>
    </div>

    {#if vault.errorMessage}
      <div
        class="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-500 leading-tight truncate"
      >
        {vault.errorMessage}
      </div>
    {/if}
  </div>
{/if}
