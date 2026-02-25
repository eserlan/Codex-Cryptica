<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";

  let stats = $state({
    updated: 0,
    created: 0,
    deleted: 0,
    total: 0,
    progress: 0,
  });

  let isSyncing = $derived(vault.status === "saving");
</script>

{#if isSyncing}
  <div
    class="fixed bottom-4 right-4 p-4 bg-bg-surface border border-accent-primary rounded-lg shadow-xl z-50 min-w-[300px]"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="font-bold text-accent-primary">Synchronizing Cloud...</span>
      <span class="text-xs opacity-60">GDrive</span>
    </div>

    <div
      class="w-full bg-accent-primary/10 h-2 rounded-full overflow-hidden mb-3"
    >
      <div
        class="bg-accent-primary h-full transition-all duration-300"
        style="width: {stats.progress}%"
      ></div>
    </div>

    <div class="grid grid-cols-3 text-center text-xs opacity-80">
      <div class="flex flex-col">
        <span class="font-bold">{stats.created}</span>
        <span>New</span>
      </div>
      <div class="flex flex-col">
        <span class="font-bold">{stats.updated}</span>
        <span>Updated</span>
      </div>
      <div class="flex flex-col">
        <span class="font-bold">{stats.deleted}</span>
        <span>Deleted</span>
      </div>
    </div>
  </div>
{/if}
