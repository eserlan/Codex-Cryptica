<script lang="ts">
  import { driveStore } from "$lib/stores/drive.svelte";
  import { onlineStatus } from "$lib/stores/online.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  const getStatusColor = () => {
    if (!onlineStatus.current) return "text-chrome-muted grayscale";
    if (driveStore.status === "syncing")
      return "text-chrome-accent animate-pulse";
    if (driveStore.status === "error") return "text-red-500";
    if (driveStore.status === "connected") return "text-green-500";
    return "text-chrome-muted";
  };

  const getStatusLabel = () => {
    if (!onlineStatus.current) return "Offline";
    if (driveStore.status === "syncing") return "Syncing to Drive...";
    if (driveStore.status === "error")
      return `Drive Error: ${driveStore.errorMessage}`;
    if (driveStore.status === "connected") return "Mirrored to Google Drive";
    return "Google Drive Disconnected";
  };
</script>

{#if !sessionModeStore.isDemoMode && !sessionModeStore.isGuestMode}
  <button
    type="button"
    onclick={() => modalUIStore.toggleSettings("vault")}
    class="flex items-center justify-center p-1.5 rounded-md hover:bg-chrome-accent/10 transition-all group relative"
    title={getStatusLabel()}
    aria-label="Google Drive Sync Status"
  >
    <span
      aria-hidden="true"
      class="icon-[lucide--cloud] h-5 w-5 {getStatusColor()} transition-colors"
    ></span>

    {#if driveStore.status === "syncing"}
      <span
        class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-chrome-accent rounded-full animate-ping"
      ></span>
    {/if}

    {#if driveStore.status === "error"}
      <span
        aria-hidden="true"
        class="absolute -bottom-0.5 -right-0.5 icon-[lucide--alert-circle] h-2.5 w-2.5 text-red-500"
      ></span>
    {/if}
  </button>
{/if}
