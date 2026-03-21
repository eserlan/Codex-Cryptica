<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { fade } from "svelte/transition";

  const isStaging = $derived(uiStore.isStaging);
</script>

{#if isStaging}
  <div
    class="fixed bottom-4 right-4 z-[9999] px-3 py-1.5 md:px-4 md:py-2 bg-red-600 text-white font-header font-bold text-[10px] md:text-xs tracking-widest shadow-2xl rounded-full border-2 border-white flex items-center gap-2 pointer-events-none select-none opacity-90 transition-all duration-300"
    transition:fade={{ duration: 200 }}
    data-testid="staging-indicator"
  >
    <span class="icon-[lucide--alert-triangle] w-3 h-3 md:w-4 md:h-4"></span>
    <span class="hidden xs:inline">STAGING ENVIRONMENT</span>
    <span class="xs:hidden">STAGING</span>
  </div>
{/if}

<style>
  /* Ensure it glows to be even more obvious */
  div {
    box-shadow: 0 0 20px rgba(220, 38, 38, 0.5);
  }
</style>
