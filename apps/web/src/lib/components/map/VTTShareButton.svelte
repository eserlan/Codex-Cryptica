<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

  let { onShare }: { onShare?: () => void } = $props();
  let canShareVtt = $derived(
    mapSession.vttEnabled && !sessionModeStore.isGuestMode,
  );
</script>

{#if canShareVtt}
  <button
    class="w-8 h-8 flex flex-shrink-0 items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-muted transition hover:text-theme-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-1 focus-visible:ring-offset-theme-surface"
    onclick={() => {
      console.log("[VTTShareButton] click", {
        canShareVtt,
        hasOnShare: !!onShare,
      });
      onShare?.();
    }}
    type="button"
    title="Share Campaign"
    aria-label="Share Campaign"
  >
    <span class="icon-[lucide--share-2] w-4 h-4" aria-hidden="true"></span>
  </button>
{/if}
