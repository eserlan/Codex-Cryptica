<script lang="ts">
  import ShelfPanel from "$lib/components/shelf/ShelfPanel.svelte";
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
  let loadError = $state<string | null>(null);

  const isSpecialEnv =
    import.meta.env.DEV || import.meta.env.VITE_STAGING === "true";

  const logError = (name: string, error: any) => {
    loadError = name;
    if (isSpecialEnv) {
      console.error(`Failed to load ${name}`, error);
    } else {
      debugStore.error(`Failed to lazy-load component: ${name}`, error);
    }
  };

  const loadComponents = () => {
    loadError = null;
    import("../oracle/OracleSidebarPanel.svelte")
      .then((m) => (OracleSidebarPanel = m?.default))
      .catch((err) => logError("OracleSidebarPanel", err));
    import("../explorer/EntityExplorer.svelte")
      .then((m) => (EntityExplorer = m?.default))
      .catch((err) => logError("EntityExplorer", err));
  };

  // Eagerly preload all panel components on mount so they're ready before first use
  onMount(() => {
    loadComponents();
  });
</script>

{#if layoutUIStore.leftSidebarOpen && layoutUIStore.activeSidebarTool !== "none"}
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
    {:else if layoutUIStore.activeSidebarTool === "shelf"}
      <div class="flex-1 overflow-y-auto p-4">
        <ShelfPanel />
      </div>
    {:else if loadError}
      <div
        class="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3"
        data-testid="sidebar-panel-error"
      >
        <div class="text-chrome-muted text-xs">
          Failed to load panel component{#if isSpecialEnv}
            ({loadError}){/if}
        </div>
        <button
          type="button"
          class="px-3 py-1 text-xs rounded bg-chrome-border hover:bg-chrome-surface border text-chrome-text cursor-pointer"
          onclick={loadComponents}
        >
          Retry
        </button>
      </div>
    {:else}
      <div
        class="flex-1 flex items-center justify-center p-8 text-center"
        data-testid="sidebar-panel-loading"
      >
        <div
          class="animate-pulse text-chrome-muted font-mono text-[10px] uppercase tracking-widest"
        >
          Loading Panel...
        </div>
      </div>
    {/if}
  </aside>
{/if}
