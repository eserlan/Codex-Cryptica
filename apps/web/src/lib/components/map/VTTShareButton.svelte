<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";

  let { onShare }: { onShare?: () => void } = $props();
  let canShareVtt = $derived(mapSession.vttEnabled && !uiStore.isGuestMode);
</script>

{#if canShareVtt}
  <button
    class="w-8 h-8 flex flex-shrink-0 items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-muted transition hover:text-theme-primary"
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
    <span class="icon-[lucide--share-2] w-4 h-4"></span>
  </button>
{/if}
