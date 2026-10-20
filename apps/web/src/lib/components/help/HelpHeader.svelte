<script lang="ts">
  import { helpStore } from "$lib/stores/help.svelte";

  let { isStandalone = false } = $props();
</script>

<div
  class="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-8"
>
  <div class="relative group flex-1 max-w-2xl">
    <span
      class="absolute left-3 top-1/2 -translate-y-1/2 icon-[heroicons--magnifying-glass] w-4 h-4 text-theme-muted group-focus-within:text-theme-primary transition-colors"
    ></span>
    <input
      type="text"
      placeholder="Search documentation..."
      class="w-full bg-theme-surface border border-theme-border hover:border-theme-primary/50 focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 rounded py-2 pl-10 pr-4 text-sm font-mono text-theme-text transition-all placeholder:text-theme-muted"
      value={helpStore.searchQuery}
      oninput={(e) => helpStore.setSearchQuery(e.currentTarget.value)}
      aria-label="Search documentation"
    />
  </div>

  <div class="flex items-center gap-2">
    {#if !isStandalone}
      <button
        onclick={() => helpStore.openHelpWindow()}
        class="flex items-center gap-2 px-3 py-2 text-xs font-bold text-theme-muted hover:text-theme-primary hover:bg-theme-primary/5 border border-theme-border hover:border-theme-primary/50 rounded transition-all uppercase font-header tracking-wider group"
        title="Open in separate window"
      >
        <span
          class="icon-[lucide--external-link] w-3.5 h-3.5 group-hover:scale-110 transition-transform"
        ></span>
        <span>Pop-out</span>
      </button>

      <button
        onclick={() => helpStore.startTour("initial-onboarding")}
        class="flex items-center gap-2 px-3 py-2 text-xs font-bold text-theme-muted hover:text-theme-primary hover:bg-theme-primary/5 border border-theme-border hover:border-theme-primary/50 rounded transition-all uppercase font-header tracking-wider group"
        title="Restart welcome tour"
      >
        <span
          class="icon-[lucide--map] w-3.5 h-3.5 group-hover:scale-110 transition-transform"
        ></span>
        <span>Tour</span>
      </button>
    {/if}
  </div>
</div>
