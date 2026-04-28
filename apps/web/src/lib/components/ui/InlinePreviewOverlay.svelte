<script lang="ts">
  import { regenerationService } from "$lib/services/RegenerationService.svelte";
  import { slide } from "svelte/transition";

  const draft = $derived(regenerationService.pendingDraft);
</script>

{#if draft}
  <div
    transition:slide
    class="flex items-center justify-between gap-4 p-3 bg-theme-primary/10 border-y border-theme-primary/30 backdrop-blur-sm sticky bottom-0 z-50 shadow-lg"
  >
    <div class="flex items-center gap-2">
      <span class="icon-[lucide--sparkles] w-4 h-4 text-theme-primary"></span>
      <div class="flex flex-col">
        <span
          class="text-[10px] font-bold text-theme-primary uppercase tracking-widest"
        >
          AI Suggestion Ready
        </span>
        <span class="text-[9px] text-theme-muted uppercase tracking-tight">
          Review generated Chronicle & Lore
        </span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        onclick={() => regenerationService.discardDraft()}
        class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text transition-colors"
      >
        Discard
      </button>
      <button
        onclick={() => regenerationService.acceptDraft()}
        class="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-theme-primary text-theme-surface hover:bg-theme-primary/80 transition-all rounded shadow-sm"
      >
        Apply Changes
      </button>
    </div>
  </div>
{/if}
