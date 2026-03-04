<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { onMount } from "svelte";

  // Sidebar consists of a narrow icon bar
  onMount(() => {
    console.log("[LeftSidebar] Mounted, isMobile:", uiStore.isMobile);
  });
</script>

<aside
  class="w-14 bg-theme-surface border-r border-theme-border flex flex-col items-center py-4 z-40 shrink-0 transition-all duration-300
         max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:w-full max-md:h-14 max-md:flex-row max-md:border-t max-md:border-r-0 max-md:justify-around max-md:py-0
         {uiStore.isMobile && uiStore.leftSidebarOpen ? 'hidden' : 'flex'}"
>
  <button
    class="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 group relative
    {uiStore.activeSidebarTool === 'oracle'
      ? 'bg-theme-primary text-theme-bg shadow-[0_0_15px_var(--color-accent-primary)]'
      : 'text-theme-muted hover:text-theme-primary hover:bg-theme-primary/10'}"
    onclick={() => uiStore.toggleSidebarTool("oracle")}
    aria-label="Lore Oracle"
    title="Lore Oracle"
    data-testid="sidebar-oracle-button"
  >
    <span
      class="icon-[heroicons--sparkles] w-5 h-5 transition-transform group-hover:scale-110"
    ></span>

    {#if uiStore.activeSidebarTool === "oracle"}
      <div
        class="absolute -right-[1px] top-1/2 -translate-y-1/2 w-1 h-6 bg-theme-bg rounded-l-full"
      ></div>
    {/if}
  </button>

  <div class="mt-auto flex flex-col items-center gap-4">
    <!-- Placeholder for future tools like Search or Vault Registry -->
  </div>
</aside>
