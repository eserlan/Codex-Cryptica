<script lang="ts">
  import { onMount } from "svelte";
  import { debugStore } from "$lib/stores/debug.svelte";
  import ResizerHandle from "./ResizerHandle.svelte";
  import {
    layoutUIStore,
    MAX_SIDEBAR_VW,
    MIN_LEFT_SIDEBAR_WIDTH,
  } from "$lib/stores/ui/layout-ui.svelte";

  let OracleSidebarPanel = $state<any>(null);
  let EntityExplorer = $state<any>(null);

  const isSpecialEnv =
    import.meta.env.DEV || import.meta.env.VITE_STAGING === "true";

  const logError = (name: string, error: any) => {
    if (isSpecialEnv) {
      console.error(`Failed to load ${name}`, error);
    } else {
      debugStore.error(`Failed to lazy-load component: ${name}`, error);
    }
  };

  // Eagerly preload all panel components on mount so they're ready before first use
  onMount(() => {
    import("../oracle/OracleSidebarPanel.svelte")
      .then((m) => (OracleSidebarPanel = m?.default))
      .catch((err) => logError("OracleSidebarPanel", err));
    import("../explorer/EntityExplorer.svelte")
      .then((m) => (EntityExplorer = m?.default))
      .catch((err) => logError("EntityExplorer", err));
  });
</script>

{#if layoutUIStore.leftSidebarOpen}
  <aside
    class="w-full md:h-full bg-chrome-surface border-chrome-border flex flex-col z-[85] shadow-xl relative shrink-0
           max-md:fixed max-md:inset-0 md:border-r md:bottom-0"
    style:width={layoutUIStore.isMobile
      ? "100%"
      : `${layoutUIStore.leftSidebarWidth}px`}
    data-testid="sidebar-panel-host"
  >
    {#if !layoutUIStore.isMobile}
      <ResizerHandle
        side="left"
        minWidth={MIN_LEFT_SIDEBAR_WIDTH}
        maxWidthVW={MAX_SIDEBAR_VW}
        currentWidth={layoutUIStore.leftSidebarWidth}
        onResize={(w) => layoutUIStore.setLeftSidebarWidth(w)}
      />
    {/if}

    {#if layoutUIStore.activeSidebarTool === "oracle" && OracleSidebarPanel}
      <OracleSidebarPanel />
    {:else if layoutUIStore.activeSidebarTool === "explorer" && EntityExplorer}
      <EntityExplorer />
    {:else}
      <div class="flex-1 flex items-center justify-center p-8 text-center">
        <div
          class="animate-pulse text-chrome-muted font-mono text-[10px] uppercase tracking-widest"
        >
          Initializing System...
        </div>
      </div>
    {/if}
  </aside>
{/if}
