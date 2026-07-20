<script lang="ts">
  import { quickNoteStore } from "$lib/stores/quicknote.svelte";
  import { fade, scale } from "svelte/transition";
</script>

{#if !quickNoteStore.isOpen}
  <div
    class="fixed bottom-6 right-6 z-[90] flex items-center justify-center select-none"
    transition:fade={{ duration: 150 }}
  >
    <!-- Pulse Ring Animation when un-elevated drafts exist -->
    {#if quickNoteStore.count > 0}
      <span
        class="absolute inset-0 rounded-full bg-theme-accent/20 quicknote-ring-pulse"
      ></span>
    {/if}

    <!-- FAB Button -->
    <button
      type="button"
      onclick={() => quickNoteStore.toggle()}
      class="relative flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-300
             backdrop-blur-md hover:scale-105 active:scale-95 shadow-lg
             {quickNoteStore.count > 0
        ? 'bg-theme-accent/10 border-theme-accent/30 text-theme-accent hover:bg-theme-accent/20 hover:border-theme-accent/50 shadow-lg shadow-theme-accent/25'
        : 'bg-theme-surface/75 border-theme-border/60 text-theme-muted hover:text-theme-text hover:bg-theme-surface hover:border-theme-border/80'}"
      aria-label="Toggle scratchpad"
    >
      <span aria-hidden="true" class="icon-[lucide--zap] h-5 w-5"></span>

      <!-- Floating counter badge -->
      {#if quickNoteStore.count > 0}
        <span
          class="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-theme-bg bg-theme-accent shadow-md border border-theme-border/20"
          transition:scale
        >
          {quickNoteStore.count}
        </span>
      {/if}
    </button>
  </div>
{/if}

<style>
  @keyframes ring-ping {
    0% {
      transform: scale(0.9);
      opacity: 1;
    }
    70% {
      transform: scale(1.4);
      opacity: 0;
    }
    100% {
      transform: scale(1.4);
      opacity: 0;
    }
  }

  .quicknote-ring-pulse {
    animation: ring-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
</style>
