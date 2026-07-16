<script lang="ts">
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { slide } from "svelte/transition";

  const draft = $derived(revisionService.pendingDraft);
  const isRevising = $derived(revisionService.isRevising);
</script>

{#if isRevising}
  <div
    transition:slide
    role="status"
    aria-live="polite"
    aria-busy="true"
    class="flex items-center gap-3 p-3 bg-theme-primary/10 border-y border-theme-primary/30 backdrop-blur-sm sticky bottom-0 z-50 shadow-lg"
  >
    <span
      class="icon-[lucide--loader-2] w-4 h-4 animate-spin text-theme-primary"
      aria-hidden="true"
    ></span>
    <div class="flex flex-col">
      <span class="text-[10px] font-bold text-theme-primary uppercase tracking-widest">
        AI Revision in Progress
      </span>
      <span class="text-[9px] text-theme-muted uppercase tracking-tight">
        Creating updated Chronicle & Lore
      </span>
    </div>
  </div>
{:else if draft}
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
        type="button"
        onclick={() => void revisionService.discardDraft()}
        class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text transition-colors focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none rounded"
      >
        Discard
      </button>
      <button
        type="button"
        onclick={() => revisionService.acceptDraft()}
        class="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-theme-primary text-theme-surface hover:bg-theme-primary/80 transition-all rounded shadow-sm focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg focus-visible:outline-none"
      >
        Apply Changes
      </button>
    </div>
  </div>
{/if}
