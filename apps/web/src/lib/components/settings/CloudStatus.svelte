<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$stores/ui.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";

  let isSyncing = $derived(vault.status === "saving");
  let isConnected = $derived(vault.isCloudConnected);
</script>

<div class="relative font-mono cloud-status-container">
  <button
    class="w-8 h-8 flex items-center justify-center border border-theme-border hover:border-theme-primary rounded transition-all group relative {uiStore.showSettings &&
    uiStore.activeSettingsTab === 'sync'
      ? 'z-[60] border-theme-primary bg-theme-primary/10'
      : 'z-10'}"
    onclick={() => uiStore.toggleSettings("sync")}
    title={isConnected ? "Cloud Storage Connected" : "Cloud Sync Settings"}
    data-testid="cloud-status-button"
  >
    <span
      class="transition-all flex items-center justify-center {isConnected
        ? 'text-theme-primary'
        : 'text-theme-muted group-hover:text-theme-primary'}"
    >
      <span
        class="w-5 h-5 {isSyncing
          ? 'icon-[lucide--zap] animate-pulse'
          : 'icon-[lucide--cloud]'}"
      ></span>
    </span>
    {#if isSyncing}
      <span
        class="text-[8px] text-theme-primary font-bold ml-1 hidden xs:inline animate-pulse"
        >{themeStore.jargon.syncing.toUpperCase()}</span
      >
    {/if}
    {#if isConnected && !isSyncing}
      <span
        class="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-theme-primary rounded-full border border-theme-bg animate-pulse"
      ></span>
    {/if}
  </button>
</div>
