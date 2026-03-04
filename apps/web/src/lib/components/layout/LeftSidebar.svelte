<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { fade } from "svelte/transition";

  // When hidden, we only show the reveal button on the top left
</script>

{#if !uiStore.leftSidebarOpen}
  <div class="fixed top-20 left-6 z-[60]" transition:fade={{ duration: 200 }}>
    <button
      class="w-10 h-10 flex items-center justify-center rounded-xl bg-theme-surface border border-theme-border text-theme-primary shadow-2xl hover:bg-theme-primary/10 transition-all duration-300 group"
      onclick={() => uiStore.toggleSidebarTool("oracle")}
      aria-label="Open Lore Oracle"
      title="Open Lore Oracle"
      data-testid="sidebar-oracle-button"
    >
      <span
        class="icon-[heroicons--sparkles] w-5 h-5 transition-transform group-hover:scale-110"
      ></span>

      <!-- Subtle glow indicator -->
      <div
        class="absolute inset-0 rounded-xl bg-theme-primary/5 blur-sm -z-10 group-hover:bg-theme-primary/10 transition-colors"
      ></div>
    </button>
  </div>
{/if}
