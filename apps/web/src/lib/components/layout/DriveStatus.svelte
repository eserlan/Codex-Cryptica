<script lang="ts">
  import { driveStore } from "$lib/stores/drive.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  let isOnline = $state(true);

  onMount(() => {
    if (browser) {
      isOnline = navigator.onLine;
      const updateOnlineStatus = () => (isOnline = navigator.onLine);
      window.addEventListener("online", updateOnlineStatus);
      window.addEventListener("offline", updateOnlineStatus);
      return () => {
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
      };
    }
  });

  const getStatusColor = () => {
    if (!isOnline) return "text-theme-muted grayscale";
    if (driveStore.status === "syncing")
      return "text-theme-primary animate-pulse";
    if (driveStore.status === "error") return "text-red-500";
    if (driveStore.status === "connected") return "text-green-500";
    return "text-theme-muted";
  };

  const getStatusLabel = () => {
    if (!isOnline) return "Offline";
    if (driveStore.status === "syncing") return "Syncing to Drive...";
    if (driveStore.status === "error")
      return `Drive Error: ${driveStore.errorMessage}`;
    if (driveStore.status === "connected") return "Mirrored to Google Drive";
    return "Google Drive Disconnected";
  };
</script>

{#if !uiStore.isDemoMode && !uiStore.isGuestMode}
  <button
    onclick={() => uiStore.toggleSettings("vault")}
    class="flex items-center justify-center p-1.5 rounded-md hover:bg-theme-primary/10 transition-all group relative"
    title={getStatusLabel()}
    aria-label="Google Drive Sync Status"
  >
    <span
      class="icon-[lucide--cloud] h-5 w-5 {getStatusColor()} transition-colors"
    ></span>

    {#if driveStore.status === "syncing"}
      <span
        class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-theme-primary rounded-full animate-ping"
      ></span>
    {/if}

    {#if driveStore.status === "error"}
      <span
        class="absolute -bottom-0.5 -right-0.5 icon-[lucide--alert-circle] h-2.5 w-2.5 text-red-500"
      ></span>
    {/if}
  </button>
{/if}
