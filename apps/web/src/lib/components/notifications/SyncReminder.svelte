<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { fade, slide } from "svelte/transition";
  import { themeStore } from "$lib/stores/theme.svelte";

  const handleSync = async () => {
    await vault.syncToLocal();
  };

  const handleDismiss = () => {
    vault.dismissSyncReminder();
  };

  const handleSnooze = () => {
    vault.snoozeSyncReminder();
  };
</script>

{#if vault.shouldShowReminder}
  <div
    class="fixed bottom-6 right-6 z-50 max-w-sm w-full"
    transition:slide={{ axis: "y", duration: 300 }}
  >
    <div
      class="bg-theme-surface border border-theme-border rounded-lg shadow-2xl p-4 flex flex-col gap-3 font-mono"
      transition:fade={{ duration: 200 }}
    >
      <div class="flex items-start gap-3">
        <div class="p-2 bg-theme-accent/10 rounded-full text-theme-accent">
          <span class="icon-[lucide--save] w-5 h-5"></span>
        </div>
        <div class="flex-1">
          <h3
            class="text-xs font-bold tracking-widest text-theme-text uppercase"
          >
            Unsynced Changes
          </h3>
          <p class="text-[10px] text-theme-muted mt-1 leading-relaxed">
            You have <span class="text-theme-accent font-bold"
              >{vault.dirtyEntitiesCount}</span
            >
            unsynced {themeStore.resolveJargon(
              "entity",
              vault.dirtyEntitiesCount,
            )}. Sync now to persist your data to your local machine.
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-2 mt-1">
        <button
          onclick={handleSync}
          class="w-full px-3 py-2 bg-theme-accent hover:bg-theme-accent/80 text-theme-bg text-[10px] font-bold tracking-widest rounded transition-colors flex items-center justify-center gap-2"
        >
          <span class="icon-[lucide--download] w-3 h-3"></span>
          SYNC NOW
        </button>
        <div class="flex gap-2">
          <button
            onclick={handleSnooze}
            class="flex-1 px-3 py-2 border border-theme-border text-theme-muted hover:text-theme-primary hover:border-theme-primary text-[10px] font-bold tracking-widest rounded transition-colors flex items-center justify-center gap-2"
            title="Remind me again in 1 hour"
          >
            <span class="icon-[lucide--clock] w-3 h-3"></span>
            SNOOZE (1H)
          </button>
          <button
            onclick={handleDismiss}
            class="flex-1 px-3 py-2 border border-theme-border text-theme-muted hover:text-theme-text hover:border-theme-muted text-[10px] font-bold tracking-widest rounded transition-colors"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
