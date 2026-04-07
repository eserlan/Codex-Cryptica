<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { debugStore } from "$lib/stores/debug.svelte";

  let OracleSidebarPanel = $state<any>(null);
  let EntityExplorer = $state<any>(null);

  const isSpecialEnv =
    import.meta.env.DEV ||
    (typeof window !== "undefined" && (window as any).__E2E__) ||
    import.meta.env.VITE_STAGING === "true";

  const logError = (name: string, error: any) => {
    if (isSpecialEnv) {
      console.error(`Failed to load ${name}`, error);
    } else {
      debugStore.error(`Failed to lazy-load component: ${name}`, error);
    }
  };

  // Pre-load components reactively
  $effect(() => {
    if (uiStore.activeSidebarTool === "oracle" && !OracleSidebarPanel) {
      import("../oracle/OracleSidebarPanel.svelte")
        .then((m) => (OracleSidebarPanel = m?.default))
        .catch((err) => logError("OracleSidebarPanel", err));
    }
    if (uiStore.activeSidebarTool === "explorer" && !EntityExplorer) {
      import("../explorer/EntityExplorer.svelte")
        .then((m) => (EntityExplorer = m?.default))
        .catch((err) => logError("EntityExplorer", err));
    }
  });
</script>

{#if uiStore.leftSidebarOpen}
  <aside
    class="bg-theme-surface border-theme-border flex flex-col z-[75] shadow-xl relative shrink-0
           fixed inset-0 top-[var(--header-height,65px)] bottom-14 md:static md:w-96 md:border-r md:bottom-0 md:h-full"
    data-testid="sidebar-panel-host"
  >
    {#if uiStore.activeSidebarTool === "oracle" && OracleSidebarPanel}
      <OracleSidebarPanel />
    {:else if uiStore.activeSidebarTool === "explorer" && EntityExplorer}
      <EntityExplorer />
    {:else}
      <div class="flex-1 flex items-center justify-center p-8 text-center">
        <div
          class="animate-pulse text-theme-muted font-mono text-[10px] uppercase tracking-widest"
        >
          Initializing System...
        </div>
      </div>
    {/if}
  </aside>
{/if}
